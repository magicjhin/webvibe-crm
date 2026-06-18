"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Переключатель языка UI (RU/EN). Пишет cookie через server action setLocale
 * и перерисовывает layout. Документы это не затрагивает (ADR-026).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const active = useLocale() as Locale;
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  function onSelect(next: Locale) {
    if (next === active || isPending) return;
    startTransition(() => {
      void setLocale(next);
    });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-card p-0.5",
        isPending && "opacity-60",
        className,
      )}
    >
      <Languages className="ml-1.5 size-4 shrink-0 text-foreground-subtle" aria-hidden />
      {LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          aria-pressed={loc === active}
          disabled={isPending}
          onClick={() => onSelect(loc)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium uppercase transition-colors",
            loc === active
              ? "bg-sidebar-accent text-foreground"
              : "text-foreground-muted hover:text-foreground",
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
