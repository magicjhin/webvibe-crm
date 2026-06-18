"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/i18n/config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Сменить язык UI. Локаль хранится в cookie NEXT_LOCALE (ADR-026),
 * без префикса в URL. Документы это не затрагивает.
 */
export async function setLocale(next: string): Promise<void> {
  const locale = isLocale(next) ? next : DEFAULT_LOCALE;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  // Перерисовать весь layout с новыми сообщениями.
  revalidatePath("/", "layout");
}
