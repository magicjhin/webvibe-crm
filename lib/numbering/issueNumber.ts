import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Атомарный инкремент счётчика в Settings + форматирование номера.
 * Использовать ТОЛЬКО внутри `prisma.$transaction(async (tx) => {...})`,
 * чтобы row-update счётчика и INSERT документа применялись как единое целое.
 *
 * Postgres гарантирует атомарность row-update — два параллельных запроса
 * не получат один и тот же номер.
 */

/**
 * Per-type separator between prefix and padded counter:
 *   - Invoice  → "WV" + "-" + "001"  = "WV-001"
 *   - Proposal → "WVP" + "-" + "001" = "WVP-001"
 *   - Contract → "WVS" + ""  + "000001" = "WVS000001"  (NO dash)
 *
 * The separator is explicit per issuer (not derived from the prefix), so a
 * prefix без дефиса не приводит к ошибочной вставке "-" в номер договора.
 * Если prefix уже заканчивается на разделитель — не дублируем его.
 */
function format(
  prefix: string,
  counter: number,
  padding: number,
  separator: string,
) {
  const padded = String(counter).padStart(padding, "0");
  const sep = separator && prefix.endsWith(separator) ? "" : separator;
  return `${prefix}${sep}${padded}`;
}

export async function issueInvoiceNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const s = await tx.settings.update({
    where: { id: 1 },
    data: { invoiceCounter: { increment: 1 } },
    select: {
      invoicePrefix: true,
      invoiceCounter: true,
      invoicePadding: true,
    },
  });
  return format(s.invoicePrefix, s.invoiceCounter, s.invoicePadding, "-");
}

export async function issueContractNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const s = await tx.settings.update({
    where: { id: 1 },
    data: { contractCounter: { increment: 1 } },
    select: {
      contractPrefix: true,
      contractCounter: true,
      contractPadding: true,
    },
  });
  // Договор без дефиса: WVS000001.
  return format(s.contractPrefix, s.contractCounter, s.contractPadding, "");
}

export async function issueProposalNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const s = await tx.settings.update({
    where: { id: 1 },
    data: { proposalCounter: { increment: 1 } },
    select: {
      proposalPrefix: true,
      proposalCounter: true,
      proposalPadding: true,
    },
  });
  return format(s.proposalPrefix, s.proposalCounter, s.proposalPadding, "-");
}
