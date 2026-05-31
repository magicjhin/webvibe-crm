"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISMISS_KEY = "wv-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Кастомный install-prompt. Ловит `beforeinstallprompt`, прячет дефолтный
 * баннер браузера и показывает свою кнопку «Установить». Скрывается, если
 * приложение уже установлено (standalone) или пользователь закрыл баннер.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const close = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-border bg-background-elevated p-3 shadow-lg md:inset-x-auto md:right-4 md:bottom-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-accent text-accent">
        <Download className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Установить Webvibe CRM</p>
        <p className="truncate text-xs text-foreground-muted">
          Быстрый доступ с телефона, работает офлайн
        </p>
      </div>
      <Button size="sm" onClick={install}>
        Установить
      </Button>
      <button
        type="button"
        aria-label="Закрыть"
        onClick={close}
        className="text-foreground-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
