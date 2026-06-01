import { z } from "zod";
import { MONEY_STRING_RE } from "@/lib/money/parseDecimal";

/**
 * Валидаторы импорта существующих (старых) документов.
 * Browser-safe (только zod + money regex) — используются на клиенте И сервере.
 *
 * Идея: пользователь загружает готовый подписанный PDF (Vercel Blob URL) и
 * вводит ключевые поля вручную. Система создаёт запись сразу в финальном
 * статусе, при открытии отдаёт загруженный файл. Номер — свой, авто-счётчик
 * не трогаем.
 */

const requiredText = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} обязателен`).max(max);

const requiredDate = z
  .string()
  .trim()
  .min(1, "Дата обязательна")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Невалидная дата");

const optionalDate = z
  .string()
  .trim()
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => v == null || !Number.isNaN(Date.parse(v)), "Невалидная дата");

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const positiveMoneyString = z
  .string()
  .trim()
  .min(1, "Сумма обязательна")
  .refine((v) => MONEY_STRING_RE.test(v), "Сумма в формате 1234.56")
  .refine((v) => !v.startsWith("-"), "Сумма не может быть отрицательной")
  .refine(
    (v) => Number(v.replace(/[\s ]/g, "").replace(",", ".")) > 0,
    "Сумма должна быть > 0",
  );

const projectId = z
  .string()
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

/** Загруженный PDF (Vercel Blob URL). */
const pdfUrl = z.string().trim().url("Сначала загрузи PDF-файл");

/** Импорт старого подписанного договора. */
export const importContractSchema = z.object({
  number: requiredText("Номер договора"),
  clientId: z.string().trim().min(1, "Выбери клиента"),
  projectId,
  amount: positiveMoneyString,
  currency: z.literal("EUR").default("EUR"),
  issuedAt: requiredDate,
  signedAt: optionalDate,
  signerName: optionalText(200),
  importedPdfUrl: pdfUrl,
});
export type ImportContractInput = z.infer<typeof importContractSchema>;

export const IMPORT_INVOICE_STATUSES = ["sent", "paid"] as const;

/** Импорт старого счёта. */
export const importInvoiceSchema = z.object({
  number: requiredText("Номер счёта"),
  clientId: z.string().trim().min(1, "Выбери клиента"),
  projectId,
  amount: positiveMoneyString,
  currency: z.literal("EUR").default("EUR"),
  issuedAt: requiredDate,
  dueAt: optionalDate,
  status: z.enum(IMPORT_INVOICE_STATUSES),
  importedPdfUrl: pdfUrl,
});
export type ImportInvoiceInput = z.infer<typeof importInvoiceSchema>;
