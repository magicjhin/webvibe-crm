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

const requiredText = (label: string, max = 500) =>
  z.string().trim().min(1, `${label} обязательно`).max(max);

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

export const EXPENSE_CATEGORIES = [
  "ai_tools",
  "hosting",
  "domains",
  "software",
  "hardware",
  "ads",
  "transport",
  "other",
] as const;

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  vendor: optionalText(200),
  amount: positiveMoney,
  currency: z.literal("EUR"),
  occurredAt: requiredDate,
  description: requiredText("Описание", 1000),
  fileUrl: optionalText(2000),
  fileName: optionalText(500),
  recurring: z.boolean(),
  recurrence: z.enum(["monthly", "yearly"]).nullable().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
