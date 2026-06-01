"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  importContractSchema,
  importInvoiceSchema,
} from "@/lib/validators/import";
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

const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB — старый подписанный PDF может быть тяжёлым

/**
 * Загрузка готового PDF (старого документа) в Vercel Blob. Только PDF.
 * Вызывается из формы импорта ДО создания записи; возвращает URL.
 */
export async function uploadDocumentPdf(
  formData: FormData,
): Promise<Result<{ url: string; fileName: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      error: "Хранилище не подключено. Добавь BLOB_READ_WRITE_TOKEN (Vercel Blob).",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Файл не передан" };
  if (file.size === 0) return { ok: false, error: "Файл пустой" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "Файл больше 12 MB" };
  if (file.type !== "application/pdf") return { ok: false, error: "Только PDF" };

  try {
    const blob = await put(`imported-documents/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/pdf",
    });
    return { ok: true, data: { url: blob.url, fileName: file.name } };
  } catch (err) {
    console.error("uploadDocumentPdf failed", err);
    return { ok: false, error: "Не удалось загрузить файл" };
  }
}

/** Best-effort удалить orphan-PDF из Blob (при замене/отмене в форме). */
export async function deleteDocumentBlob(url: string): Promise<Result<{ url: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;
  if (!url) return { ok: false, error: "Пустой URL" };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: true, data: { url } };
  try {
    await del(url);
  } catch (err) {
    console.warn("deleteDocumentBlob failed (orphan)", err);
  }
  return { ok: true, data: { url } };
}

/**
 * Плейсхолдер terms для импортированного договора. Contract.terms — NOT NULL и
 * валидируется схемой при возможном парсинге; рендер из него НЕ вызывается
 * (PDF-роут отдаёт importedPdfUrl). Кладём минимально валидный STAGED-объект.
 */
function placeholderTerms(amount: Decimal): Prisma.InputJsonValue {
  return {
    kind: "STAGED",
    subject: "Importuota sutartis (įkeltas PDF)",
    scope: [{ title: "Importuota sutartis", description: null }],
    paymentTerms: [
      { label: "Apmokėta", amount: amount.toFixed(2), dueLabel: null },
    ],
    warranty: null,
    termsNote: null,
    excluded: [],
  };
}

/** Импорт старого подписанного договора → запись со статусом signed + загруженный PDF. */
export async function importContract(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = importContractSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const input = parsed.data;

  const amount = parseMoney(input.amount);
  if (!amount || amount.lessThanOrEqualTo(0)) {
    return { ok: false, error: "Сумма должна быть > 0" };
  }
  const issuedAt = parseDateOnly(input.issuedAt);
  if (!issuedAt) return { ok: false, error: "Невалидная дата выставления" };
  const signedAt = input.signedAt ? parseDateOnly(input.signedAt) : issuedAt;

  try {
    const created = await prisma.contract.create({
      data: {
        number: input.number,
        kind: "STAGED",
        clientId: input.clientId,
        projectId: input.projectId ?? null,
        issuedAt,
        status: "signed", // импортируем уже подписанным
        currency: input.currency,
        amount,
        terms: placeholderTerms(amount),
        signedAt,
        signerName: input.signerName ?? null,
        importedPdfUrl: input.importedPdfUrl,
      },
      select: { id: true },
    });

    revalidatePath("/contracts");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${input.clientId}`);
    if (input.projectId) revalidatePath(`/projects/${input.projectId}`);
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return { ok: false, error: "Договор с таким номером уже есть" };
      if (err.code === "P2003") return { ok: false, error: "Клиент или проект не найден" };
    }
    console.error("importContract failed", err);
    return { ok: false, error: "Не удалось импортировать договор" };
  }
}

/** Импорт старого счёта → запись (sent/paid) + загруженный PDF. Без позиций. */
export async function importInvoice(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = importInvoiceSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const input = parsed.data;

  const amount = parseMoney(input.amount);
  if (!amount || amount.lessThanOrEqualTo(0)) {
    return { ok: false, error: "Сумма должна быть > 0" };
  }
  const issuedAt = parseDateOnly(input.issuedAt);
  if (!issuedAt) return { ok: false, error: "Невалидная дата выставления" };
  const dueAt = input.dueAt ? parseDateOnly(input.dueAt) : null;

  try {
    const created = await prisma.invoice.create({
      data: {
        number: input.number,
        kind: "full",
        clientId: input.clientId,
        projectId: input.projectId ?? null,
        issuedAt,
        dueAt,
        status: input.status,
        currency: input.currency,
        subtotal: amount,
        total: amount,
        importedPdfUrl: input.importedPdfUrl,
      },
      select: { id: true },
    });

    revalidatePath("/invoices");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${input.clientId}`);
    if (input.projectId) revalidatePath(`/projects/${input.projectId}`);
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return { ok: false, error: "Счёт с таким номером уже есть" };
      if (err.code === "P2003") return { ok: false, error: "Клиент или проект не найден" };
    }
    console.error("importInvoice failed", err);
    return { ok: false, error: "Не удалось импортировать счёт" };
  }
}
