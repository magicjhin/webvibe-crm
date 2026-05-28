import { z } from "zod";
import { MONEY_STRING_RE } from "@/lib/money/parseDecimal";

const optionalText = (max = 500) =>
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
  .refine(
    (v) => v == null || !Number.isNaN(Date.parse(v)),
    "Невалидная дата"
  );

/**
 * Money fields stay as strings on the form layer (HTML number inputs serialise
 * floats and lose precision). Server action turns the string into Prisma.Decimal.
 * Empty string → "0". Negative values are rejected — project price/advance
 * must be ≥ 0.
 */
const nonNegativeMoneyString = z
  .string()
  .trim()
  .or(z.literal(""))
  .transform((v) => (v === "" ? "0" : v))
  .refine((v) => MONEY_STRING_RE.test(v), "Сумма в формате 1234.56")
  .refine((v) => !v.startsWith("-"), "Сумма не может быть отрицательной");

export const PROJECT_TYPES = [
  "landing",
  "website",
  "corporate",
  "wordpress",
  "headless_wp",
  "nextjs",
  "crm_dashboard",
  "booking",
  "quiz_funnel",
  "maintenance",
  "other",
] as const;

export const PROJECT_STATUSES = [
  "idea",
  "estimating",
  "awaiting_advance",
  "in_progress",
  "waiting_client",
  "review",
  "revisions",
  "ready",
  "paid",
  "archived",
] as const;

const stageItem = z.object({
  name: z.string().trim().min(1).max(200),
  done: z.boolean(),
  order: z.number().int().min(0),
  dueAt: z.string().nullable().optional(),
});

export const projectStagesSchema = z.array(stageItem);
export type ProjectStage = z.infer<typeof stageItem>;

/**
 * Each link value: trim first, then accept empty string OR a valid URL.
 * This lets the user leave optional link fields blank without the form
 * failing URL validation. The outer `.transform` drops empty keys so the
 * persisted JSON contains only filled URLs.
 */
const linkValue = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.union([z.literal(""), z.string().url("Невалидный URL")]));

const linksRecord = z
  .record(z.string().min(1), linkValue)
  .transform((obj) => {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && v !== "") cleaned[k] = v;
    }
    return cleaned;
  });

/** Known link keys we render in the form / project card. Extra keys allowed. */
export const PROJECT_LINK_KEYS = [
  "site",
  "github",
  "vercel",
  "figma",
  "drive",
  "wpAdmin",
] as const;
export type ProjectLinkKey = (typeof PROJECT_LINK_KEYS)[number];

export const PROJECT_LINK_LABELS: Record<ProjectLinkKey, string> = {
  site: "Сайт",
  github: "GitHub",
  vercel: "Vercel",
  figma: "Figma",
  drive: "Google Drive",
  wpAdmin: "WP Admin",
};

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Название обязательно").max(200),
  clientId: z.string().trim().min(1, "Выбери клиента"),
  type: z.enum(PROJECT_TYPES),
  stack: optionalText(120),
  status: z.enum(PROJECT_STATUSES),

  price: nonNegativeMoneyString,
  advance: nonNegativeMoneyString,
  currency: z.literal("EUR"),

  startedAt: optionalDate,
  deadlineAt: optionalDate,
  completedAt: optionalDate,

  links: linksRecord.optional().nullable(),
  hasMaintenance: z.boolean(),
  notes: optionalText(2000),
});

export type ProjectInput = z.infer<typeof projectSchema>;

/**
 * Standalone schema for stages updates (one server action manages the JSON
 * column without forcing the whole project form to roundtrip).
 */
export const projectStagesUpdateSchema = z.object({
  projectId: z.string().min(1),
  stages: projectStagesSchema,
});
