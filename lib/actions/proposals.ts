"use server";

import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  proposalSchema,
  type ProposalInput,
  type ProposalStatus,
} from "@/lib/validators/proposal";
import { parseMoney } from "@/lib/money/parseDecimal";
import { parseDateOnly } from "@/lib/dates/parse";
import { issueProposalNumber } from "@/lib/numbering/issueNumber";

type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

async function requireAuth(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

/**
 * Нормализуем JSON-блоки КП: суммы в decimal-строки, опциональные поля → null.
 * Возвращает структуру под Prisma data (JSON-поля + total Decimal).
 */
function prepareData(input: ProposalInput) {
  const total = parseMoney(input.total) ?? new Decimal(0);

  const scopeIncluded = input.scopeIncluded.map((s) => ({
    title: s.title,
    description: s.description ?? null,
  }));
  const scopeExcluded = (input.scopeExcluded ?? []).map((s) => ({
    title: s.title,
    description: s.description ?? null,
  }));
  const milestones = (input.milestones ?? []).map((m) => ({
    name: m.name,
    deliverable: m.deliverable ?? null,
    dueLabel: m.dueLabel ?? null,
  }));
  const paymentPlan = (input.paymentPlan ?? []).map((p) => {
    const a = parseMoney(p.amount) ?? new Decimal(0);
    return { label: p.label, amount: a.toFixed(2), dueLabel: p.dueLabel ?? null };
  });
  const portfolioLinks = (input.portfolioLinks ?? []).map((l) => ({
    label: l.label,
    url: l.url,
  }));

  return {
    clientId: input.clientId,
    projectId: input.projectId ?? null,
    title: input.title,
    currency: input.currency,
    total,
    validUntil: parseDateOnly(input.validUntil ?? null),
    scopeIncluded: scopeIncluded as Prisma.InputJsonValue,
    scopeExcluded: (scopeExcluded.length ? scopeExcluded : Prisma.JsonNull) as Prisma.InputJsonValue,
    milestones: (milestones.length ? milestones : Prisma.JsonNull) as Prisma.InputJsonValue,
    paymentPlan: (paymentPlan.length ? paymentPlan : Prisma.JsonNull) as Prisma.InputJsonValue,
    warranty: input.warranty ?? null,
    portfolioLinks: (portfolioLinks.length ? portfolioLinks : Prisma.JsonNull) as Prisma.InputJsonValue,
  };
}

export async function createProposal(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = proposalSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = prepareData(parsed.data);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const number = await issueProposalNumber(tx);
      return tx.proposal.create({
        // Статус не доверяем клиенту — создание всегда draft.
        data: { number, ...data, status: "draft" },
        select: { id: true },
      });
    });

    revalidatePath("/proposals");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${parsed.data.clientId}`);
    if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`);

    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003") return { ok: false, error: "Клиент или проект не найден" };
      if (err.code === "P2002") return { ok: false, error: "Дубликат номера КП" };
    }
    console.error("createProposal failed", err);
    return { ok: false, error: "Не удалось создать КП" };
  }
}

export async function updateProposal(
  id: string,
  formData: unknown,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = proposalSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = prepareData(parsed.data);

  try {
    // Редактировать можно только draft или revisions (клиент попросил правки).
    // sent/accepted/declined — заморожены. Статус не меняем (только данные).
    let acquired = false;
    let dropped = false;
    await prisma.$transaction(async (tx) => {
      const lock = await tx.proposal.updateMany({
        where: { id, status: { in: ["draft", "revisions"] } },
        data: { title: data.title },
      });
      if (lock.count !== 1) {
        const exists = await tx.proposal.findUnique({ where: { id }, select: { id: true } });
        dropped = !exists;
        return;
      }
      acquired = true;
      await tx.proposal.update({ where: { id }, data: { ...data, pdfUrl: null } });
    });

    if (!acquired) {
      if (dropped) return { ok: false, error: "КП не найдено" };
      return {
        ok: false,
        error: "Редактировать можно только черновики (draft) или КП в статусе revisions.",
      };
    }

    revalidatePath("/proposals");
    revalidatePath(`/proposals/${id}`);
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${parsed.data.clientId}`);
    if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`);

    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return { ok: false, error: "КП не найдено" };
      if (err.code === "P2003") return { ok: false, error: "Клиент или проект не найден" };
    }
    console.error("updateProposal failed", err);
    return { ok: false, error: "Не удалось сохранить КП" };
  }
}

// КП: draft → sent → accepted/declined/revisions; revisions → sent; accepted/declined terminal.
const ALLOWED_TRANSITIONS: Record<ProposalStatus, ReadonlyArray<ProposalStatus>> = {
  draft: ["sent"],
  sent: ["accepted", "declined", "revisions"],
  revisions: ["sent", "declined"],
  accepted: [],
  declined: [],
};

export async function setProposalStatus(
  id: string,
  status: ProposalStatus,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const allowedFrom = (Object.entries(ALLOWED_TRANSITIONS) as Array<
    [ProposalStatus, ReadonlyArray<ProposalStatus>]
  >)
    .filter(([, to]) => to.includes(status))
    .map(([from]) => from);

  if (allowedFrom.length === 0) {
    return { ok: false, error: `Нельзя перевести в ${status}` };
  }

  try {
    const result = await prisma.proposal.updateMany({
      where: { id, status: { in: allowedFrom } },
      data: { status },
    });
    if (result.count !== 1) {
      const exists = await prisma.proposal.findUnique({ where: { id }, select: { status: true } });
      if (!exists) return { ok: false, error: "КП не найдено" };
      if (exists.status === status) return { ok: true, data: { id } };
      return { ok: false, error: `Нельзя перевести ${exists.status} → ${status}` };
    }

    revalidatePath("/proposals");
    revalidatePath(`/proposals/${id}`);
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("setProposalStatus failed", err);
    return { ok: false, error: "Не удалось обновить статус" };
  }
}

export async function deleteProposal(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    const current = await prisma.proposal.findUnique({
      where: { id },
      select: { status: true, clientId: true, projectId: true },
    });
    if (!current) return { ok: false, error: "КП не найдено" };
    if (current.status !== "draft") {
      return {
        ok: false,
        error: "Удалять можно только черновики. Отправленные сохраняются для аудита.",
      };
    }

    await prisma.proposal.delete({ where: { id } });
    revalidatePath("/proposals");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${current.clientId}`);
    if (current.projectId) revalidatePath(`/projects/${current.projectId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, error: "КП не найдено" };
    }
    console.error("deleteProposal failed", err);
    return { ok: false, error: "Не удалось удалить КП" };
  }
}

export async function getProposal(id: string) {
  const guard = await requireAuth();
  if (!guard.ok) return null;
  return prisma.proposal.findUnique({
    where: { id },
    include: { client: true, project: true },
  });
}

export async function getProposals() {
  const guard = await requireAuth();
  if (!guard.ok) return [];
  return prisma.proposal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
  });
}
