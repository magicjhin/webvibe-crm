"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { clientSchema, type ClientInput } from "@/lib/validators/client";

type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

async function requireAuth(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

function toData(input: ClientInput) {
  return {
    kind: input.kind,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    website: input.website ?? null,
    vatId: input.vatId ?? null,
    regNumber: input.regNumber ?? null,
    address: input.address ?? null,
    representative: input.representative ?? null,
    technicalContactName: input.technicalContactName ?? null,
    language: input.language,
    status: input.status,
    source: input.source ?? null,
    notes: input.notes ?? null,
  };
}

export async function createClient(formData: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = clientSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const created = await prisma.client.create({ data: toData(parsed.data) });
    revalidatePath("/clients");
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    console.error("createClient failed", err);
    return { ok: false, error: "Не удалось создать клиента" };
  }
}

export async function updateClient(
  id: string,
  formData: unknown,
): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  const parsed = clientSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.client.update({ where: { id }, data: toData(parsed.data) });
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { ok: true, data: { id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "Клиент не найден" };
    }
    console.error("updateClient failed", err);
    return { ok: false, error: "Не удалось сохранить клиента" };
  }
}

export async function deleteClient(id: string): Promise<Result<{ id: string }>> {
  const guard = await requireAuth();
  if (!guard.ok) return guard;

  try {
    await prisma.client.delete({ where: { id } });
    revalidatePath("/clients");
    return { ok: true, data: { id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003" || err.code === "P2014") {
        // FK Restrict — есть связанные проекты (или будущие документы).
        return {
          ok: false,
          error: "У клиента есть проекты — сначала удали или перенеси их",
        };
      }
      if (err.code === "P2025") {
        return { ok: false, error: "Клиент не найден" };
      }
    }
    console.error("deleteClient failed", err);
    return { ok: false, error: "Не удалось удалить клиента" };
  }
}
