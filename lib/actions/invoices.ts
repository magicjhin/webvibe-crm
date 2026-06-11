"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { invoiceSchema, type InvoiceInput } from "@/lib/validators/invoice";
import { parseMoney } from "@/lib/money/parseDecimal";
import { parseDateOnly } from "@/lib/dates/parse";
import { issueInvoiceNumber } from "@/lib/numbering/issueNumber";

type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

async function requireAuth(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

function calcItemTotal(qty: string, unitPrice: string): Decimal {
  const q = parseMoney(qty) ?? new Decimal(1);
  const u = parseMoney(unitPrice) ?? new Decimal(0);
  return q.mul(u);
}

function preparedItems(input: InvoiceInput) {
  return input.items.map((item, idx) => {
    const qty = parseMoney(item.qty) ?? new Decimal(1);
    const unitPrice = parseMoney(item.unitPrice) ?? new Decimal(0);
    const total = calcItemTotal(item.qty, item.unitPrice);
    return {
      title: item.title,
      description: item.description ?? null,
      qty,
      unitPrice,
      total,
      order: idx,
    };
  });
}

function preparedTotals(input: InvoiceInput) {
  const items = preparedItems(input);
  const subtotal = items.reduce<Decimal>((acc, i) => acc.add(i.total), new Decimal(0));
  return { items, subtotal, total: subtotal };
}

export async function createInvoice(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = invoiceSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const { items, subtotal, total } = preparedTotals(input);
  const issuedAt = parseDateOnly(input.issuedAt);
  if (!issuedAt) {
    return { ok: false, error: "Невалидная дата выставления" };
  }
  const dueAt = parseDateOnly(input.dueAt);

  try {
    // Transaction: number issuance + invoice + items must be atomic.
    const created = await prisma.$transaction(async (tx) => {
      const number = await issueInvoiceNumber(tx);
      return tx.invoice.create({
        data: {
          number,
          kind: input.kind,
          clientId: input.clientId,
          projectId: input.projectId ?? null,
          issuedAt,
          dueAt,
          status: input.status,
          currency: input.currency,
          subtotal,
          total,
          notes: input.notes ?? null,
          items: {
            create: items,
          },
        },
        select: { id: true },
      });
    });

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${input.clientId}`);
    if (input.projectId) revalidatePath(`/projects/${input.projectId}`);

    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003") return { ok: false, error: "Клиент или проект не найден" };
      if (err.code === "P2002") return { ok: false, error: "Дубликат номера счёта" };
    }
    console.error("createInvoice failed", err);
    return { ok: false, error: "Не удалось создать счёт" };
  }
}

export async function updateInvoice(
  id: string,
  formData: unknown,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = invoiceSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const { items, subtotal, total } = preparedTotals(input);
  const issuedAt = parseDateOnly(input.issuedAt);
  if (!issuedAt) return { ok: false, error: "Невалидная дата выставления" };
  const dueAt = parseDateOnly(input.dueAt);

  try {
    // Atomic guard: используем updateMany с WHERE status IN (draft, sent), чтобы
    // row lock защищал от concurrent setInvoiceStatus между read и write.
    // Редактировать разрешаем, пока счёт не финализирован: draft/sent — да,
    // paid/cancelled — заморожены (см. ADR в DECISIONS.md).
    let acquired = false;
    let dropped = false;
    await prisma.$transaction(async (tx) => {
      const guardUpdate = await tx.invoice.updateMany({
        where: { id, status: { in: ["draft", "sent"] } },
        // Lock-write: сбрасываем pdfUrl (его всё равно обнуляем в основном апдейте).
        // НЕ трогаем status — иначе sent ошибочно стал бы draft.
        data: { pdfUrl: null },
      });
      if (guardUpdate.count !== 1) {
        // Проверяем, какая именно ситуация
        const exists = await tx.invoice.findUnique({
          where: { id },
          select: { id: true },
        });
        dropped = !exists;
        return; // выходим без записи; обработаем после транзакции
      }
      acquired = true;

      // Replace items wholesale — simpler than per-item diffing.
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.update({
        where: { id },
        data: {
          kind: input.kind,
          clientId: input.clientId,
          projectId: input.projectId ?? null,
          issuedAt,
          dueAt,
          status: input.status,
          currency: input.currency,
          subtotal,
          total,
          notes: input.notes ?? null,
          pdfUrl: null, // pdfUrl зарезервирован под Phase 2 cache; сбрасываем на всякий случай
          items: { create: items },
        },
      });
    });

    if (!acquired) {
      if (dropped) return { ok: false, error: "Счёт не найден" };
      return {
        ok: false,
        error: "Редактировать можно только черновики и отправленные счета. Оплаченные/отменённые — заморожены.",
      };
    }

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${input.clientId}`);
    if (input.projectId) revalidatePath(`/projects/${input.projectId}`);

    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return { ok: false, error: "Счёт не найден" };
      if (err.code === "P2003") return { ok: false, error: "Клиент или проект не найден" };
    }
    console.error("updateInvoice failed", err);
    return { ok: false, error: "Не удалось сохранить счёт" };
  }
}

// Allowed status transitions. Cancelled is terminal. Paid can be reverted only to cancelled (refund).
const ALLOWED_TRANSITIONS: Record<
  "draft" | "sent" | "paid" | "cancelled",
  ReadonlyArray<"draft" | "sent" | "paid" | "cancelled">
> = {
  draft: ["sent", "paid", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: ["cancelled"],
  cancelled: [],
};

export async function setInvoiceStatus(
  id: string,
  status: "draft" | "sent" | "paid" | "cancelled",
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  // Atomic guard: conditional UPDATE с WHERE status IN allowed_from. Postgres
  // row-lock защищает от concurrent setInvoiceStatus, который мог перевести
  // счёт в cancelled (terminal) между нашим read и write.
  const allowedFrom = (Object.entries(ALLOWED_TRANSITIONS) as Array<
    [keyof typeof ALLOWED_TRANSITIONS, ReadonlyArray<typeof status>]
  >)
    .filter(([, to]) => to.includes(status))
    .map(([from]) => from);

  if (allowedFrom.length === 0) {
    // Никакой статус не может перейти в этот — сам status — terminal или некорректен.
    return { ok: false, error: `Нельзя перевести в ${status}` };
  }

  try {
    const result = await prisma.invoice.updateMany({
      where: { id, status: { in: allowedFrom } },
      data: { status },
    });
    if (result.count !== 1) {
      // Либо счёт не существует, либо текущий статус не разрешает переход
      const exists = await prisma.invoice.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!exists) return { ok: false, error: "Счёт не найден" };
      if (exists.status === status) return { ok: true, data: { id } }; // idempotent
      return {
        ok: false,
        error: `Нельзя перевести ${exists.status} → ${status}`,
      };
    }

    const updated = await prisma.invoice.findUnique({
      where: { id },
      select: { clientId: true, projectId: true },
    });
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/dashboard");
    if (updated) {
      revalidatePath(`/clients/${updated.clientId}`);
      if (updated.projectId) revalidatePath(`/projects/${updated.projectId}`);
    }
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("setInvoiceStatus failed", err);
    return { ok: false, error: "Не удалось обновить статус" };
  }
}

export async function deleteInvoice(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    const current = await prisma.invoice.findUnique({
      where: { id },
      select: { status: true, clientId: true, projectId: true },
    });
    if (!current) return { ok: false, error: "Счёт не найден" };
    if (current.status !== "draft" && current.status !== "sent") {
      return {
        ok: false,
        error: "Удалять можно только черновики и отправленные. Оплаченные/отменённые сохраняются для аудита.",
      };
    }

    await prisma.invoice.delete({ where: { id } });
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${current.clientId}`);
    if (current.projectId) revalidatePath(`/projects/${current.projectId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003") {
        return { ok: false, error: "К счёту привязаны платежи — сначала удали их" };
      }
      if (err.code === "P2025") return { ok: false, error: "Счёт не найден" };
    }
    console.error("deleteInvoice failed", err);
    return { ok: false, error: "Не удалось удалить счёт" };
  }
}
