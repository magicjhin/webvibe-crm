import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("Невалидный URL")
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalText = z
  .string()
  .trim()
  .max(500)
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} обязательно`).max(max);

export const settingsSchema = z.object({
  // Brand / requisites
  companyName: requiredText("Название компании"),
  ownerName: requiredText("Имя владельца"),
  vatId: optionalText,
  regNumber: optionalText,
  address: requiredText("Адрес", 500),
  iban: requiredText("IBAN", 64),
  swift: optionalText,
  email: z.string().trim().email("Невалидный email"),
  phone: optionalText,
  website: optionalUrl,
  logoUrl: optionalUrl,
  signatureUrl: optionalUrl,

  // Numbering
  invoicePrefix: requiredText("Префикс счёта", 16),
  invoiceCounter: z.number().int().min(0).max(999_999),
  invoicePadding: z.number().int().min(1).max(10),
  contractPrefix: requiredText("Префикс договора", 16),
  contractCounter: z.number().int().min(0).max(999_999),
  contractPadding: z.number().int().min(1).max(10),
  proposalPrefix: requiredText("Префикс КП", 16),
  proposalCounter: z.number().int().min(0).max(999_999),
  proposalPadding: z.number().int().min(1).max(10),

  // Documents (locked in MVP — kept here for forward-compat)
  defaultCurrency: z.literal("EUR"),
  documentLanguage: z.literal("lt"),
  pdfFooterNote: optionalText,
});

export type SettingsInput = z.infer<typeof settingsSchema>;
