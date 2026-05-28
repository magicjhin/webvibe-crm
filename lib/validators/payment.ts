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

const positiveMoney = z
  .string()
  .trim()
  .min(1, "Сумма обязательна")
  .refine((v) => MONEY_STRING_RE.test(v), "Сумма в формате 1234.56")
  .refine((v) => !v.startsWith("-"), "Сумма не может быть отрицательной")
  .refine((v) => Number(v.replace(",", ".")) > 0, "Сумма должна быть > 0");

const requiredDate = z
  .string()
  .trim()
  .min(1, "Дата обязательна")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Невалидная дата");

export const PAYMENT_KINDS = [
  "advance",
  "final",
  "full",
  "maintenance",
  "other",
] as const;

export const paymentSchema = z.object({
  clientId: z.string().min(1, "Выбери клиента"),
  projectId: z
    .string()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  invoiceId: z
    .string()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  kind: z.enum(PAYMENT_KINDS),
  amount: positiveMoney,
  currency: z.literal("EUR"),
  paidAt: requiredDate,
  note: optionalText(500),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
