import { z } from "zod";
import { MONEY_STRING_RE } from "@/lib/money/parseDecimal";

/**
 * Maintenance validators (Iter 4). Reusable client + server.
 * Запись Maintenance создаётся либо вручную, либо автоматически при подписании
 * MAINTENANCE-договора (см. lib/actions/contracts.ts → signContract).
 */

export const MAINTENANCE_STATUSES = [
  "active",
  "paused",
  "cancelled",
  "overdue_payment",
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const requiredDate = z
  .string()
  .trim()
  .min(1, "Дата обязательна")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Невалидная дата");

const positiveMoneyString = z
  .string()
  .trim()
  .min(1, "Сумма обязательна")
  .refine((v) => MONEY_STRING_RE.test(v), "Сумма в формате 1234.56")
  .refine((v) => !v.startsWith("-"), "Сумма не может быть отрицательной")
  .refine((v) => Number(v.replace(/[\s ]/g, "").replace(",", ".")) > 0, "Сумма должна быть > 0");

export const maintenanceSchema = z.object({
  clientId: z.string().trim().min(1, "Выбери клиента"),
  projectId: z
    .string()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  contractId: z
    .string()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  monthlyAmount: positiveMoneyString,
  currency: z.literal("EUR"),
  includes: optionalText(3000),
  startedAt: requiredDate,
  nextInvoiceAt: requiredDate,
  status: z.enum(MAINTENANCE_STATUSES),
  notes: optionalText(2000),
});

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
