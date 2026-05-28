import { z } from "zod";

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "waiting_client",
  "review",
  "done",
] as const;

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const optionalText = (max = 2000) =>
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

const checklistItem = z.object({
  text: z.string().trim().min(1).max(200),
  done: z.boolean(),
});
export const checklistSchema = z.array(checklistItem);
export type ChecklistItem = z.infer<typeof checklistItem>;

export const taskCreateSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "Введи название").max(200),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueAt: optionalDate,
  description: optionalText(2000),
  checklist: checklistSchema.optional().nullable(),
});

export const taskUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueAt: optionalDate,
  description: optionalText(2000),
  checklist: checklistSchema.optional().nullable(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
