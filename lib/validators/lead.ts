import { z } from "zod";

/**
 * Lead validator — минимально. Полный UI Leads приходит в Iter 5.
 * Здесь схема нужна на случай, если конверсия проекта попросит
 * создать lead-stub или server actions потребуют zod-парсинг.
 */
export const LEAD_URGENCIES = ["low", "normal", "high"] as const;
export const LEAD_STATUSES = [
  "new",
  "to_contact",
  "discussion",
  "awaiting_proposal",
  "proposal_sent",
  "thinking",
  "accepted",
  "declined",
  "postponed",
] as const;

export const leadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).optional().nullable(),
  contact: z.string().trim().min(1).max(200),
  task: z.string().trim().min(1).max(2000),
  urgency: z.enum(LEAD_URGENCIES).default("normal"),
  status: z.enum(LEAD_STATUSES).default("new"),
});

export type LeadInput = z.infer<typeof leadSchema>;
