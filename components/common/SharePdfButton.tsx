"use client";

import { useEffect, useState, useTransition } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Web Share API для PDF (MVP-критерий: «скачать PDF, поделиться через share sheet»).
 * Тянет PDF как файл и отдаёт в системный share sheet (WhatsApp, почта и т.д.).
 * Показывается только если браузер умеет navigator.share (в основном мобильные);
 * на desktop рядом уже есть кнопка скачивания, поэтому здесь рендерим null.
 */
export function SharePdfButton({
  url,
  filename,
  label = "Поделиться",
}: {
  url: string;
  filename: string;
  label?: string;
}) {
  const [canShare, setCanShare] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  if (!canShare) return null;

  const onShare = () => {
    startTransition(async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "application/pdf" });

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
        } else {
          // Файлы шарить нельзя — отдаём ссылку/скачивание как fallback.
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(objectUrl);
        }
      } catch (err) {
        // Пользователь отменил share sheet — это не ошибка.
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("share pdf failed", err);
        toast.error("Не удалось поделиться PDF");
      }
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={onShare} disabled={isPending}>
      <Share2 className="size-4" />
      {label}
    </Button>
  );
}
