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
    "Невалидная дата",
  );

const requiredDate = z
  .string()
  .trim()
  .min(1, "Дата обязательна")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Невалидная дата");

const nonNegativeMoneyString = z
  .string()
  .trim()
  .or(z.literal(""))
  .transform((v) => (v === "" ? "0" : v))
  .refine((v) => MONEY_STRING_RE.test(v), "Сумма в формате 1234.56")
  .refine((v) => !v.startsWith("-"), "Сумма не может быть отрицательной");

const positiveMoneyString = z
  .string()
  .trim()
  .min(1, "Цена обязательна")
  .refine((v) => MONEY_STRING_RE.test(v), "Сумма в формате 1234.56")
  .refine((v) => !v.startsWith("-"), "Сумма не может быть отрицательной")
  .refine((v) => Number(v.replace(",", ".")) > 0, "Цена должна быть > 0");

export const INVOICE_KINDS = ["advance", "final", "full", "maintenance"] as const;
export const INVOICE_STATUSES = ["draft", "sent", "paid", "cancelled"] as const;

export const invoiceItemSchema = z.object({
  title: z.string().trim().min(1, "Название обязательно").max(500),
  description: optionalText(2000),
  qty: nonNegativeMoneyString,
  unitPrice: positiveMoneyString,
});

export const invoiceSchema = z.object({
  kind: z.enum(INVOICE_KINDS),
  clientId: z.string().min(1, "Выбери клиента"),
  projectId: z
    .string()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  issuedAt: requiredDate,
  dueAt: optionalDate,
  status: z.enum(INVOICE_STATUSES),
  currency: z.literal("EUR"),
  notes: optionalText(2000),
  items: z.array(invoiceItemSchema).min(1, "Добавь хотя бы одну позицию"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
