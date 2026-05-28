import { z } from "zod";

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalEmail = z
  .string()
  .trim()
  .email("Невалидный email")
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .url("Невалидный URL")
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const CLIENT_KINDS = ["individual", "company"] as const;
export const CLIENT_STATUSES = ["active", "archived"] as const;

export const clientSchema = z.object({
  kind: z.enum(CLIENT_KINDS),
  name: z.string().trim().min(1, "Имя обязательно").max(200),
  email: optionalEmail,
  phone: optionalText(64),
  website: optionalUrl,
  vatId: optionalText(64),
  regNumber: optionalText(64),
  address: optionalText(500),
  representative: optionalText(200),
  technicalContactName: optionalText(200),
  language: z.string().trim().min(2).max(8),
  status: z.enum(CLIENT_STATUSES),
  source: optionalText(120),
  notes: optionalText(2000),
});

export type ClientInput = z.infer<typeof clientSchema>;
