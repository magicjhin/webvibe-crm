"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { expenseSchema } from "@/lib/validators/expense";
import { parseMoney } from "@/lib/money/parseDecimal";
import { parseDateOnly } from "@/lib/dates/parse";

type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

async function requireAuth(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Upload a receipt file to Vercel Blob. Called from the new-expense form
 * BEFORE createExpense, so the returned URL can be pasted into the form.
 * Requires BLOB_READ_WRITE_TOKEN env. Returns ok:false with a friendly
 * message if the token is missing.
 */
export async function uploadExpenseFile(
  formData: FormData,
): Promise<Result<{ url: string; fileName: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      error: "Хранилище не подключено. Добавь BLOB_READ_WRITE_TOKEN в .env (Vercel Blob).",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Файл не передан" };
  }
  if (file.size === 0) return { ok: false, error: "Файл пустой" };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "Файл больше 8 MB" };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Разрешены: PDF, JPEG, PNG, WebP, HEIC" };
  }

  try {
    // Random suffix prevents URL collision on same filename.
    const blob = await put(`expenses/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return { ok: true, data: { url: blob.url, fileName: file.name } };
  } catch (err) {
    console.error("uploadExpenseFile failed", err);
    return { ok: false, error: "Не удалось загрузить файл" };
  }
}

/**
 * Best-effort удалить файл из Blob — вызывается из формы при clear/replace,
 * чтобы не плодить orphan blobs. Тихо проглатывает ошибки (orphan приемлем,
 * crash формы — нет).
 */
export async function deleteExpenseBlob(url: string): Promise<Result<{ url: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;
  if (!url) return { ok: false, error: "Пустой URL" };
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: true, data: { url } }; // нечего удалять
  }
  try {
    await del(url);
  } catch (err) {
    console.warn("deleteExpenseBlob failed (orphan)", err);
  }
  return { ok: true, data: { url } };
}

export async function createExpense(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = expenseSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const amount = parseMoney(input.amount) ?? new Decimal(0);
  const occurredAt = parseDateOnly(input.occurredAt);
  if (!occurredAt) return { ok: false, error: "Невалидная дата" };

  try {
    const created = await prisma.expense.create({
      data: {
        category: input.category,
        vendor: input.vendor ?? null,
        amount,
        currency: input.currency,
        occurredAt,
        description: input.description,
        fileUrl: input.fileUrl ?? null,
        fileName: input.fileName ?? null,
        recurring: input.recurring,
        recurrence: input.recurrence ?? null,
      },
      select: { id: true },
    });

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("createExpense failed", err);
    return { ok: false, error: "Не удалось создать запись" };
  }
}

export async function updateExpense(
  id: string,
  formData: unknown,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = expenseSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const amount = parseMoney(input.amount) ?? new Decimal(0);
  const occurredAt = parseDateOnly(input.occurredAt);
  if (!occurredAt) return { ok: false, error: "Невалидная дата" };

  try {
    await prisma.expense.update({
      where: { id },
      data: {
        category: input.category,
        vendor: input.vendor ?? null,
        amount,
        currency: input.currency,
        occurredAt,
        description: input.description,
        fileUrl: input.fileUrl ?? null,
        fileName: input.fileName ?? null,
        recurring: input.recurring,
        recurrence: input.recurrence ?? null,
      },
    });
    revalidatePath("/expenses");
    revalidatePath(`/expenses/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "Запись не найдена" };
    }
    console.error("updateExpense failed", err);
    return { ok: false, error: "Не удалось сохранить" };
  }
}

export async function deleteExpense(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    const deleted = await prisma.expense.delete({
      where: { id },
      select: { fileUrl: true },
    });

    // Best-effort cleanup — if Blob fails we still report success on the DB delete.
    if (deleted.fileUrl && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(deleted.fileUrl);
      } catch (blobErr) {
        console.warn("Blob delete failed (file orphaned)", blobErr);
      }
    }

    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "Запись не найдена" };
    }
    console.error("deleteExpense failed", err);
    return { ok: false, error: "Не удалось удалить" };
  }
}
