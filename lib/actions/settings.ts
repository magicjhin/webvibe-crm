"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { settingsSchema } from "@/lib/validators/settings";

type Result =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export async function updateSettings(formData: unknown): Promise<Result> {
  const session = await auth();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = settingsSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверь поля",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.settings.update({
      where: { id: 1 },
      data: parsed.data,
    });
    revalidatePath("/settings/profile");
    return { ok: true };
  } catch (err) {
    console.error("updateSettings failed", err);
    return { ok: false, error: "Не удалось сохранить настройки" };
  }
}
