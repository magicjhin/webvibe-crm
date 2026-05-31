import { z } from "zod";
import { MONEY_STRING_RE } from "@/lib/money/parseDecimal";

/**
 * Proposal (КП) validators (Iter 4). Reusable client + server.
 * Денежные суммы — decimal-строки, не float.
 */

export const PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "declined",
  "revisions",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalDate = z
  .string()
  .trim()
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => v == null || !Number.isNaN(Date.parse(v)), "Невалидная дата");

const positiveMoneyString = z
  .string()
  .trim()
  .min(1, "Сумма обязательна")
  .refine((v) => MONEY_STRING_RE.test(v), "Сумма в формате 1234.56")
  .refine((v) => !v.startsWith("-"), "Сумма не может быть отрицательной")
  .refine((v) => Number(v.replace(/[\s ]/g, "").replace(",", ".")) > 0, "Сумма должна быть > 0");

// --- structure blocks ------------------------------------------------------

export const proposalScopeItemSchema = z.object({
  title: z.string().trim().min(1, "Название обязательно").max(500),
  description: optionalText(2000),
});
export type ProposalScopeItem = z.infer<typeof proposalScopeItemSchema>;

export const proposalMilestoneSchema = z.object({
  name: z.string().trim().min(1, "Название обязательно").max(300),
  deliverable: optionalText(1000),
  dueLabel: optionalText(300),
});
export type ProposalMilestone = z.infer<typeof proposalMilestoneSchema>;

export const proposalPaymentItemSchema = z.object({
  label: z.string().trim().min(1, "Метка обязательна").max(300),
  amount: positiveMoneyString,
  dueLabel: optionalText(300),
});
export type ProposalPaymentItem = z.infer<typeof proposalPaymentItemSchema>;

export const proposalPortfolioLinkSchema = z.object({
  label: z.string().trim().min(1, "Метка обязательна").max(200),
  url: z.string().trim().url("Невалидный URL"),
});
export type ProposalPortfolioLink = z.infer<typeof proposalPortfolioLinkSchema>;

// --- full proposal form ----------------------------------------------------

export const proposalSchema = z.object({
  clientId: z.string().trim().min(1, "Выбери клиента"),
  projectId: z
    .string()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  title: z.string().trim().min(1, "Название обязательно").max(300),
  status: z.enum(PROPOSAL_STATUSES),
  currency: z.literal("EUR"),
  total: positiveMoneyString,
  validUntil: optionalDate,

  scopeIncluded: z.array(proposalScopeItemSchema).min(1, "Добавь хотя бы один пункт"),
  scopeExcluded: z.array(proposalScopeItemSchema).optional(),
  milestones: z.array(proposalMilestoneSchema).optional(),
  paymentPlan: z.array(proposalPaymentItemSchema).optional(),
  warranty: optionalText(3000),
  portfolioLinks: z.array(proposalPortfolioLinkSchema).optional(),
});

export type ProposalInput = z.infer<typeof proposalSchema>;
