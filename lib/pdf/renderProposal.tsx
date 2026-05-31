import { renderToBuffer } from "@react-pdf/renderer";
import { formatInTimeZone } from "date-fns-tz";
import type Decimal from "decimal.js";

import {
  ProposalPdf,
  type ProposalParty,
  type ProposalPdfData,
  type ProposalScope,
  type ProposalMilestone,
  type ProposalPayment,
  type ProposalLink,
} from "@/components/pdf/ProposalPdf";
import { prisma } from "@/lib/db";
import { PROJECT_TZ } from "@/lib/dates/parse";
import {
  proposalScopeItemSchema,
  proposalMilestoneSchema,
  proposalPaymentItemSchema,
  proposalPortfolioLinkSchema,
} from "@/lib/validators/proposal";
import { z } from "zod";

const fmtMoney = (value: Decimal | string | number, currency = "EUR") => {
  const num = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
};

const fmtDate = (d: Date) => formatInTimeZone(d, PROJECT_TZ, "yyyy-MM-dd");

// Тихий парс JSON-полей: невалидное/пустое → []. PDF не должен падать
// из-за исторически кривого JSON (формы валидируют при сохранении).
const scopeArr = z.array(proposalScopeItemSchema);
const milestoneArr = z.array(proposalMilestoneSchema);
const paymentArr = z.array(proposalPaymentItemSchema);
const linkArr = z.array(proposalPortfolioLinkSchema);

function safeArr<T>(schema: z.ZodType<T[]>, value: unknown): T[] {
  if (value == null) return [];
  const r = schema.safeParse(value);
  return r.success ? r.data : [];
}

export async function renderProposalPdf(proposalId: string): Promise<Buffer> {
  const [settings, proposal] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { client: true },
    }),
  ]);

  if (!settings) throw new Error("Settings not initialised");
  if (!proposal) throw new Error("Proposal not found");

  const currency = proposal.currency || "EUR";

  const provider: ProposalParty = {
    role: "PASLAUGŲ TEIKĖJAS",
    name: settings.ownerName,
    lines: [
      settings.personalCode ? `Asmens kodas: ${settings.personalCode}` : null,
      settings.regNumber
        ? `Individualios veiklos pažymos Nr. ${settings.regNumber}`
        : null,
      `El. paštas: ${settings.email}`,
      settings.phone ? `Tel.: ${settings.phone}` : null,
      settings.website ? `Svetainė: ${settings.website}` : null,
    ],
  };

  const c = proposal.client;
  const customer: ProposalParty = {
    role: "UŽSAKOVAS",
    name: c.name,
    lines: [
      c.regNumber ? `Įmonės kodas: ${c.regNumber}` : null,
      c.vatId ? `PVM mokėtojo kodas: ${c.vatId}` : null,
      c.address ? `Adresas: ${c.address}` : null,
      c.representative ? `Atstovaujama ${c.representative}` : null,
      c.phone ? `Tel.: ${c.phone}` : null,
      c.email ? `El. paštas: ${c.email}` : null,
    ],
  };

  const scopeIncluded: ProposalScope[] = safeArr(
    scopeArr,
    proposal.scopeIncluded,
  ).map((s) => ({ title: s.title, description: s.description ?? null }));

  const scopeExcluded: ProposalScope[] = safeArr(
    scopeArr,
    proposal.scopeExcluded,
  ).map((s) => ({ title: s.title, description: s.description ?? null }));

  const milestones: ProposalMilestone[] = safeArr(
    milestoneArr,
    proposal.milestones,
  ).map((m) => ({
    name: m.name,
    deliverable: m.deliverable ?? null,
    dueLabel: m.dueLabel ?? null,
  }));

  const paymentPlan: ProposalPayment[] = safeArr(
    paymentArr,
    proposal.paymentPlan,
  ).map((p) => ({
    label: p.label,
    amount: fmtMoney(p.amount, currency),
    dueLabel: p.dueLabel ?? null,
  }));

  const portfolioLinks: ProposalLink[] = safeArr(
    linkArr,
    proposal.portfolioLinks,
  ).map((l) => ({ label: l.label, url: l.url }));

  const data: ProposalPdfData = {
    number: proposal.number,
    title: proposal.title,
    issuedAt: fmtDate(proposal.createdAt),
    validUntil: proposal.validUntil ? fmtDate(proposal.validUntil) : null,

    total: fmtMoney(proposal.total, currency),

    provider,
    customer,

    scopeIncluded,
    scopeExcluded,
    milestones,
    paymentPlan,
    warranty: proposal.warranty ?? null,
    portfolioLinks,

    pdfFooterNote: settings.pdfFooterNote ?? null,
  };

  return renderToBuffer(<ProposalPdf data={data} />);
}
