"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  contractSchema,
  signContractSchema,
  type ContractInput,
  type ContractStatus,
} from "@/lib/validators/contract";
import { parseMoney } from "@/lib/money/parseDecimal";
import { parseDateOnly } from "@/lib/dates/parse";
import { issueContractNumber } from "@/lib/numbering/issueNumber";

type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

async function requireAuth(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

const SIGN_TOKEN_TTL_DAYS = 7;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Нормализуем все decimal-строки внутри terms к каноничному виду "1234.56"
 * (Decimal.toFixed(2)), чтобы JSON не хранил "1 234,56" / "1234,5" вперемешку.
 * Возвращает { terms (нормализованный, под Json), amount (Decimal) }.
 *
 * Для STAGED/ADVANCE дополнительно валидирует, что sum(paymentTerms) == amount.
 */
function prepareTerms(input: ContractInput):
  | { ok: true; terms: Prisma.InputJsonValue; amount: Decimal }
  | { ok: false; error: string } {
  const amount = parseMoney(input.amount);
  if (!amount || amount.lessThanOrEqualTo(0)) {
    return { ok: false, error: "Сумма договора должна быть > 0" };
  }

  const t = input.terms;

  if (t.kind === "MAINTENANCE") {
    // Инвариант: для поддержки Contract.amount И есть месячная плата.
    // Деривируем monthlyAmount из канонического amount, чтобы PDF, карточка
    // и созданная запись Maintenance не разъезжались (Codex Important).
    const terms = {
      kind: "MAINTENANCE" as const,
      subject: t.subject,
      monthlyAmount: amount.toFixed(2),
      includes: t.includes ?? [],
      warranty: t.warranty ?? null,
      termsNote: t.termsNote ?? null,
      excluded: (t.excluded ?? []).map((e) => ({
        title: e.title,
        description: e.description ?? null,
      })),
    };
    return { ok: true, terms, amount };
  }

  // STAGED / ADVANCE
  const paymentTerms = t.paymentTerms.map((p) => {
    const a = parseMoney(p.amount) ?? new Decimal(0);
    return { label: p.label, amount: a.toFixed(2), dueLabel: p.dueLabel ?? null };
  });
  const sum = paymentTerms.reduce<Decimal>((acc, p) => acc.add(new Decimal(p.amount)), new Decimal(0));
  if (!sum.equals(amount)) {
    return {
      ok: false,
      error: `Сумма платёжных этапов (${sum.toFixed(2)}) не совпадает с суммой договора (${amount.toFixed(2)})`,
    };
  }

  const terms = {
    kind: t.kind,
    subject: t.subject,
    scope: t.scope.map((s) => ({ title: s.title, description: s.description ?? null })),
    paymentTerms,
    warranty: t.warranty ?? null,
    termsNote: t.termsNote ?? null,
    excluded: (t.excluded ?? []).map((e) => ({
      title: e.title,
      description: e.description ?? null,
    })),
  };
  return { ok: true, terms, amount };
}

/**
 * Для ADVANCE-договора, если paymentTerms не заданы (пусто) — автозаполняем
 * 70/30 от amount. Переопределяемо: если caller прислал свои paymentTerms,
 * не трогаем. Мутирует копию input.terms, возвращает новый input.
 */
function applyAdvanceDefaults(input: ContractInput): ContractInput {
  if (input.kind !== "ADVANCE") return input;
  if (input.terms.kind !== "ADVANCE") return input;

  // Автозаполняем, если этапов нет ИЛИ суммы не заданы (пустые/нулевые).
  // Если пользователь ввёл реальные суммы — не трогаем (переопределяемо).
  const hasAmounts =
    input.terms.paymentTerms.length > 0 &&
    input.terms.paymentTerms.every((p) => {
      const a = parseMoney(p.amount);
      return a != null && a.greaterThan(0);
    });
  if (hasAmounts) return input;

  const amount = parseMoney(input.amount);
  if (!amount || amount.lessThanOrEqualTo(0)) return input;

  const advance = amount.mul("0.7").toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const remainder = amount.sub(advance); // остаток так, чтобы сумма точно сошлась

  // Сохраняем пользовательские label/dueLabel, если они были заданы.
  const prev = input.terms.paymentTerms;
  return {
    ...input,
    terms: {
      ...input.terms,
      paymentTerms: [
        {
          label: prev[0]?.label?.trim() || "Avansas (70%)",
          amount: advance.toFixed(2),
          dueLabel: prev[0]?.dueLabel ?? null,
        },
        {
          label: prev[1]?.label?.trim() || "Likutis (30%)",
          amount: remainder.toFixed(2),
          dueLabel: prev[1]?.dueLabel ?? null,
        },
      ],
    },
  };
}

export async function createContract(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = contractSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = applyAdvanceDefaults(parsed.data);
  const issuedAt = parseDateOnly(input.issuedAt);
  if (!issuedAt) return { ok: false, error: "Невалидная дата" };

  const prepared = prepareTerms(input);
  if (!prepared.ok) return { ok: false, error: prepared.error };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const number = await issueContractNumber(tx);
      return tx.contract.create({
        data: {
          number,
          kind: input.kind,
          clientId: input.clientId,
          projectId: input.projectId ?? null,
          issuedAt,
          // Создание всегда даёт draft — статус не доверяем клиенту.
          // sent — только через generateContractSignToken, signed — только через signContract.
          status: "draft",
          currency: input.currency,
          amount: prepared.amount,
          terms: prepared.terms,
        },
        select: { id: true },
      });
    });

    revalidatePath("/contracts");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${input.clientId}`);
    if (input.projectId) revalidatePath(`/projects/${input.projectId}`);

    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003") return { ok: false, error: "Клиент или проект не найден" };
      if (err.code === "P2002") return { ok: false, error: "Дубликат номера договора" };
    }
    console.error("createContract failed", err);
    return { ok: false, error: "Не удалось создать договор" };
  }
}

export async function updateContract(
  id: string,
  formData: unknown,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = contractSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = applyAdvanceDefaults(parsed.data);
  const issuedAt = parseDateOnly(input.issuedAt);
  if (!issuedAt) return { ok: false, error: "Невалидная дата" };

  const prepared = prepareTerms(input);
  if (!prepared.ok) return { ok: false, error: prepared.error };

  try {
    // Редактировать можно только draft: row-lock через updateMany WHERE status='draft',
    // защита от concurrent generateContractSignToken (draft → sent).
    let acquired = false;
    let dropped = false;
    await prisma.$transaction(async (tx) => {
      const lock = await tx.contract.updateMany({
        where: { id, status: "draft" },
        data: { status: "draft" },
      });
      if (lock.count !== 1) {
        const exists = await tx.contract.findUnique({ where: { id }, select: { id: true } });
        dropped = !exists;
        return;
      }
      acquired = true;
      await tx.contract.update({
        where: { id },
        data: {
          kind: input.kind,
          clientId: input.clientId,
          projectId: input.projectId ?? null,
          issuedAt,
          // Статус не трогаем: редактирование разрешено только для draft (lock выше),
          // и он остаётся draft. Переходы — через setContractStatus / sign-flow.
          currency: input.currency,
          amount: prepared.amount,
          terms: prepared.terms,
          pdfUrl: null,
        },
      });
    });

    if (!acquired) {
      if (dropped) return { ok: false, error: "Договор не найден" };
      return {
        ok: false,
        error: "Редактировать можно только черновики (draft). Sent/signed/cancelled — заморожены.",
      };
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${id}`);
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${input.clientId}`);
    if (input.projectId) revalidatePath(`/projects/${input.projectId}`);

    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return { ok: false, error: "Договор не найден" };
      if (err.code === "P2003") return { ok: false, error: "Клиент или проект не найден" };
    }
    console.error("updateContract failed", err);
    return { ok: false, error: "Не удалось сохранить договор" };
  }
}

// Allowed status transitions. signed/cancelled terminal.
// signed достижим ТОЛЬКО через signContract (sign-flow), не через ручной setStatus.
const ALLOWED_TRANSITIONS: Record<ContractStatus, ReadonlyArray<ContractStatus>> = {
  draft: ["sent", "cancelled"],
  sent: ["cancelled"],
  signed: [],
  cancelled: [],
};

export async function setContractStatus(
  id: string,
  status: ContractStatus,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const allowedFrom = (Object.entries(ALLOWED_TRANSITIONS) as Array<
    [ContractStatus, ReadonlyArray<ContractStatus>]
  >)
    .filter(([, to]) => to.includes(status))
    .map(([from]) => from);

  if (allowedFrom.length === 0) {
    return { ok: false, error: `Нельзя перевести в ${status}` };
  }

  try {
    const result = await prisma.contract.updateMany({
      where: { id, status: { in: allowedFrom } },
      data: { status },
    });
    if (result.count !== 1) {
      const exists = await prisma.contract.findUnique({ where: { id }, select: { status: true } });
      if (!exists) return { ok: false, error: "Договор не найден" };
      if (exists.status === status) return { ok: true, data: { id } };
      return { ok: false, error: `Нельзя перевести ${exists.status} → ${status}` };
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${id}`);
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("setContractStatus failed", err);
    return { ok: false, error: "Не удалось обновить статус" };
  }
}

export async function deleteContract(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    const current = await prisma.contract.findUnique({
      where: { id },
      select: { status: true, clientId: true, projectId: true },
    });
    if (!current) return { ok: false, error: "Договор не найден" };
    if (current.status !== "draft") {
      return {
        ok: false,
        error: "Удалять можно только черновики. Отправленные/подписанные сохраняются для аудита.",
      };
    }

    await prisma.contract.delete({ where: { id } });
    revalidatePath("/contracts");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath(`/clients/${current.clientId}`);
    if (current.projectId) revalidatePath(`/projects/${current.projectId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003") {
        return { ok: false, error: "К договору привязана поддержка — сначала удали её" };
      }
      if (err.code === "P2025") return { ok: false, error: "Договор не найден" };
    }
    console.error("deleteContract failed", err);
    return { ok: false, error: "Не удалось удалить договор" };
  }
}

export async function getContract(id: string) {
  const guard = await requireAuth();
  if (!guard.ok) return null;
  return prisma.contract.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
      maintenance: true,
    },
  });
}

export async function getContracts() {
  const guard = await requireAuth();
  if (!guard.ok) return [];
  return prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } },
  });
}

/**
 * Генерация ссылки для подписи. Создаёт raw token (32 байта), хранит sha256-хеш,
 * TTL 7 дней, переводит договор draft → sent. Возвращает RAW token (для ссылки
 * /sign/{raw}). Raw token нигде не персистится.
 */
export async function generateContractSignToken(
  contractId: string,
): Promise<Result<{ token: string; expiresAt: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const raw = randomBytes(32).toString("base64url");
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + SIGN_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  try {
    // Выдавать ссылку можно из draft или sent (повторная генерация для уже
    // отправленного договора). signed/cancelled — заморожены.
    const result = await prisma.contract.updateMany({
      where: { id: contractId, status: { in: ["draft", "sent"] } },
      data: {
        status: "sent",
        signTokenHash: hash,
        signTokenExpiresAt: expiresAt,
      },
    });
    if (result.count !== 1) {
      const exists = await prisma.contract.findUnique({
        where: { id: contractId },
        select: { status: true },
      });
      if (!exists) return { ok: false, error: "Договор не найден" };
      return {
        ok: false,
        error: `Нельзя выдать ссылку для договора в статусе ${exists.status}`,
      };
    }

    revalidatePath(`/contracts/${contractId}`);
    return { ok: true, data: { token: raw, expiresAt: expiresAt.toISOString() } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Крайне маловероятная коллизия хеша — попросить повторить.
      return { ok: false, error: "Коллизия токена, попробуй ещё раз" };
    }
    console.error("generateContractSignToken failed", err);
    return { ok: false, error: "Не удалось создать ссылку" };
  }
}

type SignContractArgs = {
  token: string;
  signerName: string;
  signaturePng: string; // Vercel Blob URL, загрузку делает caller
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Публичная подпись (без auth — вызывается со страницы /sign/[token]).
 * Atomic consume: updateMany WHERE signTokenHash совпадает, не истёк, status=sent.
 * Если kind=MAINTENANCE — в ТОЙ ЖЕ транзакции создаём запись Maintenance.
 * signaturePng (Blob URL) приходит из caller — загрузку в Blob делает frontend.
 */
export async function signContract(
  args: SignContractArgs,
): Promise<Result<{ id: string }>> {
  const parsed = signContractSchema.safeParse({
    token: args.token,
    signerName: args.signerName,
    signaturePng: args.signaturePng,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const hash = hashToken(parsed.data.token);
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Найдём договор по хешу до consume — нужно знать kind/terms для Maintenance.
      const contract = await tx.contract.findFirst({
        where: { signTokenHash: hash, signTokenExpiresAt: { gt: now }, status: "sent" },
        select: {
          id: true,
          kind: true,
          clientId: true,
          projectId: true,
          terms: true,
        },
      });
      if (!contract) return { kind: "gone" as const };

      // Atomic consume — те же условия в WHERE гарантируют one-time use даже
      // при гонке: только один параллельный вызов получит count === 1.
      const consume = await tx.contract.updateMany({
        where: { id: contract.id, signTokenHash: hash, signTokenExpiresAt: { gt: now }, status: "sent" },
        data: {
          status: "signed",
          signedAt: now,
          signerName: parsed.data.signerName,
          signerIp: args.ip ?? null,
          signerUserAgent: args.userAgent ?? null,
          signatureUrl: parsed.data.signaturePng,
          signTokenHash: null,
          signTokenExpiresAt: null,
        },
      });
      if (consume.count !== 1) return { kind: "gone" as const };

      // MAINTENANCE-договор → создаём запись Maintenance в той же транзакции.
      if (contract.kind === "MAINTENANCE") {
        const terms = contract.terms as { monthlyAmount?: string; includes?: string[] } | null;
        const monthly = parseMoney(terms?.monthlyAmount ?? null);
        if (!monthly || monthly.lessThanOrEqualTo(0)) {
          // Бросаем — транзакция откатится, договор не будет подписан с битой суммой.
          throw new Error("Договор поддержки без корректной monthlyAmount");
        }
        const nextInvoiceAt = new Date(now);
        nextInvoiceAt.setMonth(nextInvoiceAt.getMonth() + 1);

        await tx.maintenance.create({
          data: {
            clientId: contract.clientId,
            projectId: contract.projectId ?? null,
            contractId: contract.id,
            monthlyAmount: monthly,
            currency: "EUR",
            includes: (terms?.includes ?? []).join("\n") || null,
            startedAt: now,
            nextInvoiceAt,
            status: "active",
          },
        });
      }

      return { kind: "signed" as const, id: contract.id };
    });

    if (result.kind === "gone") {
      // Токен использован/истёк/невалиден — 410-эквивалент. Caller удаляет orphan PNG из Blob.
      return { ok: false, error: "Ссылка недействительна или уже использована" };
    }

    revalidatePath(`/contracts/${result.id}`);
    revalidatePath("/contracts");
    revalidatePath("/maintenance");
    revalidatePath("/documents");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Maintenance.contractId @unique — повторное создание (двойной consume).
      return { ok: false, error: "Договор уже подписан" };
    }
    console.error("signContract failed", err);
    return { ok: false, error: "Не удалось подписать договор" };
  }
}

type SignAsProviderArgs = {
  contractId: string;
  signerName: string;
  signaturePng: string; // Vercel Blob URL — загрузку делает caller
};

/**
 * Подпись ИСПОЛНИТЕЛЯ (моя, "Подписать самому"). Auth-only.
 * В отличие от signContract (заказчик по токену) — НЕ трогает status,
 * не использует sign-токен и пишет в отдельные provider*-поля, которые
 * рендерятся в моей колонке (Paslaugų teikėjas). Можно переподписать.
 */
export async function signContractAsProvider(
  args: SignAsProviderArgs,
): Promise<Result<{ id: string }>> {
  const authed = await requireAuth();
  if (!authed.ok) return authed;

  const signerName = args.signerName.trim();
  if (signerName.length < 2) {
    return { ok: false, error: "Укажи имя подписанта" };
  }
  if (!/^https?:\/\//.test(args.signaturePng)) {
    return { ok: false, error: "Невалидная подпись" };
  }

  try {
    const updated = await prisma.contract.updateMany({
      where: { id: args.contractId, status: { not: "cancelled" } },
      data: {
        providerSignedAt: new Date(),
        providerSignerName: signerName,
        providerSignatureUrl: args.signaturePng,
      },
    });
    if (updated.count !== 1) {
      return { ok: false, error: "Договор не найден или отменён" };
    }
    revalidatePath(`/contracts/${args.contractId}`);
    revalidatePath("/documents");
    return { ok: true, data: { id: args.contractId } };
  } catch (err) {
    console.error("signContractAsProvider failed", err);
    return { ok: false, error: "Не удалось сохранить подпись" };
  }
}
