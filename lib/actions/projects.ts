"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  projectSchema,
  projectStagesUpdateSchema,
  type ProjectInput,
} from "@/lib/validators/project";
import Decimal from "decimal.js";
import { parseMoney } from "@/lib/money/parseDecimal";
import { parseDateOnly } from "@/lib/dates/parse";

type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

async function requireAuth(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

function toData(input: ProjectInput) {
  // parseMoney throws on bad format, but Zod already validated via regex —
  // if it still throws here it's a real bug, let it bubble to the catch.
  const price = parseMoney(input.price) ?? new Decimal(0);
  const advance = parseMoney(input.advance) ?? new Decimal(0);

  return {
    title: input.title,
    clientId: input.clientId,
    type: input.type,
    stack: input.stack ?? null,
    status: input.status,
    price,
    advance,
    currency: input.currency,
    startedAt: parseDateOnly(input.startedAt),
    deadlineAt: parseDateOnly(input.deadlineAt),
    completedAt: parseDateOnly(input.completedAt),
    links:
      input.links == null || Object.keys(input.links).length === 0
        ? Prisma.JsonNull
        : (input.links as Prisma.InputJsonValue),
    hasMaintenance: input.hasMaintenance,
    notes: input.notes ?? null,
  };
}

export async function createProject(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = projectSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const data = toData(parsed.data);
    const created = await prisma.project.create({ data });
    revalidatePath("/projects");
    revalidatePath(`/clients/${parsed.data.clientId}`);
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return { ok: false, error: "Клиент не найден" };
    }
    console.error("createProject failed", err);
    return { ok: false, error: "Не удалось создать проект" };
  }
}

export async function updateProject(
  id: string,
  formData: unknown,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = projectSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.project.update({ where: { id }, data: toData(parsed.data) });
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    revalidatePath(`/clients/${parsed.data.clientId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return { ok: false, error: "Проект не найден" };
      if (err.code === "P2003") return { ok: false, error: "Клиент не найден" };
    }
    console.error("updateProject failed", err);
    return { ok: false, error: "Не удалось сохранить проект" };
  }
}

export async function deleteProject(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { clientId: true },
    });
    await prisma.project.delete({ where: { id } });
    revalidatePath("/projects");
    if (project) revalidatePath(`/clients/${project.clientId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003" || err.code === "P2014") {
        // FK Restrict — есть привязанные документы/платежи (Iter 3+).
        return {
          ok: false,
          error: "У проекта есть привязанные записи — сначала удали их",
        };
      }
      if (err.code === "P2025") {
        return { ok: false, error: "Проект не найден" };
      }
    }
    console.error("deleteProject failed", err);
    return { ok: false, error: "Не удалось удалить проект" };
  }
}

export async function updateProjectStages(
  formData: unknown,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = projectStagesUpdateSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: "Проверь поля" };
  }

  try {
    await prisma.project.update({
      where: { id: parsed.data.projectId },
      data: {
        stages: parsed.data.stages.length === 0
          ? Prisma.JsonNull
          : (parsed.data.stages as unknown as Prisma.InputJsonValue),
      },
    });
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true, data: { id: parsed.data.projectId } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "Проект не найден" };
    }
    console.error("updateProjectStages failed", err);
    return { ok: false, error: "Не удалось сохранить этапы" };
  }
}
