"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  taskCreateSchema,
  taskUpdateSchema,
} from "@/lib/validators/task";
import { parseDateOnly } from "@/lib/dates/parse";

type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

async function requireAuth(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

export async function createTask(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = taskCreateSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // Place new task at the end of the project's list.
    const max = await prisma.task.aggregate({
      where: { projectId: parsed.data.projectId },
      _max: { order: true },
    });
    const nextOrder = (max._max.order ?? -1) + 1;

    const created = await prisma.task.create({
      data: {
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
        dueAt: parseDateOnly(parsed.data.dueAt),
        description: parsed.data.description ?? null,
        checklist:
          parsed.data.checklist == null
            ? Prisma.JsonNull
            : (parsed.data.checklist as unknown as Prisma.InputJsonValue),
        order: nextOrder,
      },
    });
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return { ok: false, error: "Проект не найден" };
    }
    console.error("createTask failed", err);
    return { ok: false, error: "Не удалось создать задачу" };
  }
}

export async function updateTask(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = taskUpdateSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, ...rest } = parsed.data;

  try {
    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.status !== undefined ? { status: rest.status } : {}),
        ...(rest.priority !== undefined ? { priority: rest.priority } : {}),
        ...(rest.dueAt !== undefined
          ? { dueAt: parseDateOnly(rest.dueAt) }
          : {}),
        ...(rest.description !== undefined ? { description: rest.description } : {}),
        ...(rest.checklist !== undefined
          ? {
              checklist:
                rest.checklist == null
                  ? Prisma.JsonNull
                  : (rest.checklist as unknown as Prisma.InputJsonValue),
            }
          : {}),
      },
      select: { projectId: true },
    });
    revalidatePath(`/projects/${updated.projectId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "Задача не найдена" };
    }
    console.error("updateTask failed", err);
    return { ok: false, error: "Не удалось сохранить задачу" };
  }
}

export async function toggleTaskDone(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    const current = await prisma.task.findUnique({
      where: { id },
      select: { status: true, projectId: true },
    });
    if (!current) return { ok: false, error: "Задача не найдена" };

    const next = current.status === "done" ? "todo" : "done";
    await prisma.task.update({ where: { id }, data: { status: next } });
    revalidatePath(`/projects/${current.projectId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    console.error("toggleTaskDone failed", err);
    return { ok: false, error: "Не удалось обновить задачу" };
  }
}

export async function deleteTask(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    const deleted = await prisma.task.delete({
      where: { id },
      select: { projectId: true },
    });
    revalidatePath(`/projects/${deleted.projectId}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "Задача не найдена" };
    }
    console.error("deleteTask failed", err);
    return { ok: false, error: "Не удалось удалить задачу" };
  }
}
