import { z } from "zod";
import { MONEY_STRING_RE } from "@/lib/money/parseDecimal";

/**
 * Contract validators (Iter 4). Reusable on client AND server — НИКАКИХ
 * серверных импортов здесь (только zod + money regex, оба browser-safe).
 *
 * Денежные суммы внутри terms (JSON) храним как decimal-строки, не float.
 * Сумма всех paymentTerms должна равняться Contract.amount (валидируется
 * в server action, где amount уже распарсен в Decimal).
 */

export const CONTRACT_KINDS = ["STAGED", "ADVANCE", "MAINTENANCE"] as const;
export const CONTRACT_STATUSES = ["draft", "sent", "signed", "cancelled"] as const;

export type ContractKind = (typeof CONTRACT_KINDS)[number];
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

// --- shared field helpers -------------------------------------------------

const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const requiredText = (label: string, max = 5000) =>
  z.string().trim().min(1, `${label} обязательно`).max(max);

const requiredDate = z
  .string()
  .trim()
  .min(1, "Дата обязательна")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Невалидная дата");

/** Положительная decimal-строка ("1234.56" / "1234,56"). */
const positiveMoneyString = z
  .string()
  .trim()
  .min(1, "Сумма обязательна")
  .refine((v) => MONEY_STRING_RE.test(v), "Сумма в формате 1234.56")
  .refine((v) => !v.startsWith("-"), "Сумма не может быть отрицательной")
  .refine((v) => Number(v.replace(/[\s ]/g, "").replace(",", ".")) > 0, "Сумма должна быть > 0");

// --- terms building blocks -------------------------------------------------

/** §3 DARBŲ APIMTIS / §3 исключения: { title, description? } */
export const scopeItemSchema = z.object({
  title: z.string().trim().min(1, "Название обязательно").max(500),
  description: optionalText(2000),
});
export type ScopeItem = z.infer<typeof scopeItemSchema>;

/** §4 платёжные этапы: { label, amount(decimal-string), dueLabel? } */
export const paymentTermSchema = z.object({
  label: z.string().trim().min(1, "Метка обязательна").max(300),
  amount: positiveMoneyString,
  dueLabel: optionalText(300),
});
export type PaymentTerm = z.infer<typeof paymentTermSchema>;

// --- terms discriminated union by kind ------------------------------------

const baseTerms = {
  // §2 SUTARTIES DALYKAS — РЕДАКТИРУЕМОЕ всегда, multiline, обязательно для всех.
  subject: requiredText("Предмет договора"),
  warranty: optionalText(3000),
  termsNote: optionalText(5000),
  excluded: z.array(scopeItemSchema).optional(),
};

/** STAGED / ADVANCE — работы + платёжные этапы. */
export const workContractTermsSchema = z.object({
  kind: z.enum(["STAGED", "ADVANCE"]),
  ...baseTerms,
  scope: z.array(scopeItemSchema).min(1, "Добавь хотя бы один пункт работ"),
  paymentTerms: z.array(paymentTermSchema).min(1, "Добавь хотя бы один платёжный этап"),
});

/** MAINTENANCE — ежемесячная сумма + буллеты включённого. */
export const maintenanceContractTermsSchema = z.object({
  kind: z.literal("MAINTENANCE"),
  ...baseTerms,
  monthlyAmount: positiveMoneyString,
  includes: z.array(z.string().trim().min(1).max(500)).optional(),
});

/**
 * Полная форма Contract.terms. Дискриминатор — `kind`.
 *   STAGED/ADVANCE → { subject, scope[], paymentTerms[], ... }
 *   MAINTENANCE    → { subject, monthlyAmount, includes?, ... }
 */
export const contractTermsSchema = z.discriminatedUnion("kind", [
  workContractTermsSchema,
  maintenanceContractTermsSchema,
]);
export type ContractTerms = z.infer<typeof contractTermsSchema>;
export type WorkContractTerms = z.infer<typeof workContractTermsSchema>;
export type MaintenanceContractTerms = z.infer<typeof maintenanceContractTermsSchema>;

// --- full contract form ----------------------------------------------------

/**
 * `terms.kind` должен совпадать с верхнеуровневым `kind` — проверяем в superRefine.
 * `amount` — итоговая сумма договора (decimal-строка). Соответствие
 * sum(paymentTerms) == amount проверяется в server action (где есть Decimal).
 */
export const contractSchema = z
  .object({
    kind: z.enum(CONTRACT_KINDS),
    clientId: z.string().trim().min(1, "Выбери клиента"),
    projectId: z
      .string()
      .or(z.literal(""))
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    issuedAt: requiredDate,
    status: z.enum(CONTRACT_STATUSES),
    currency: z.literal("EUR"),
    amount: positiveMoneyString,
    terms: contractTermsSchema,
  })
  .superRefine((val, ctx) => {
    if (val.terms.kind !== val.kind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["terms", "kind"],
        message: "terms.kind должен совпадать с kind договора",
      });
    }
  });

export type ContractInput = z.infer<typeof contractSchema>;

// --- signing ---------------------------------------------------------------

/**
 * Вход публичного действия signContract (страница /sign/[token], без auth).
 * `signaturePng` — Vercel Blob URL, загрузку делает caller/frontend.
 */
export const signContractSchema = z.object({
  token: z.string().trim().min(1, "Токен обязателен"),
  signerName: z.string().trim().min(2, "Укажи имя").max(200),
  signaturePng: z.string().trim().url("Невалидный URL подписи"),
  agreed: z.literal(true, { message: "Нужно согласие с условиями" }).optional(),
});

export type SignContractInput = z.infer<typeof signContractSchema>;
