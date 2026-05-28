"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { paymentSchema } from "@/lib/validators/payment";
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

export async function createPayment(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = paymentSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const amount = parseMoney(input.amount) ?? new Decimal(0);
  const paidAt = parseDateOnly(input.paidAt);
  if (!paidAt) return { ok: false, error: "Невалидная дата" };

  // Если платёж привязан к счёту — derive clientId/projectId из счёта на
  // сервере, чтобы не доверять submitted значениям (защита от inconsistent
  // payments через crafted server action call).
  // Также блокируем привязку к draft-счёту: draft ещё редактируем, его
  // clientId/projectId могут поменяться и оставить Payment с устаревшими
  // полями. Payments допустимы только для sent/paid/cancelled (status frozen).
  let clientId = input.clientId;
  let projectId: string | null = input.projectId ?? null;
  if (input.invoiceId) {
    const inv = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      select: { clientId: true, projectId: true, status: true },
    });
    if (!inv) return { ok: false, error: "Счёт не найден" };
    if (inv.status === "draft") {
      return {
        ok: false,
        error: "Нельзя привязать платёж к черновику счёта. Сначала переведи счёт в Sent.",
      };
    }
    clientId = inv.clientId;
    projectId = inv.projectId;
  }

  try {
    const created = await prisma.payment.create({
      data: {
        clientId,
        projectId,
        invoiceId: input.invoiceId ?? null,
        kind: input.kind,
        amount,
        currency: input.currency,
        paidAt,
        note: input.note ?? null,
      },
      select: { id: true },
    });

    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${input.clientId}`);
    if (input.projectId) revalidatePath(`/projects/${input.projectId}`);
    if (input.invoiceId) revalidatePath(`/invoices/${input.invoiceId}`);

    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return { ok: false, error: "Клиент, проект или счёт не найден" };
    }
    console.error("createPayment failed", err);
    return { ok: false, error: "Не удалось создать платёж" };
  }
}

export async function deletePayment(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    const deleted = await prisma.payment.delete({
      where: { id },
      select: { clientId: true, projectId: true, invoiceId: true },
    });
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${deleted.clientId}`);
    if (deleted.projectId) revalidatePath(`/projects/${deleted.projectId}`);
    if (deleted.invoiceId) revalidatePath(`/invoices/${deleted.invoiceId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "Платёж не найден" };
    }
    console.error("deletePayment failed", err);
    return { ok: false, error: "Не удалось удалить платёж" };
  }
}
