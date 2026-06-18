// Конфигурация локалей UI (ADR-026).
// Документы (PDF/Word) НЕ зависят от этого — у них свой `Settings.documentLanguage` (lt).
// Локаль UI хранится в cookie NEXT_LOCALE (без префиксов в URL).

export const LOCALES = ["ru", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ru";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_LABELS: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}
