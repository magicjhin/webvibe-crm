"use client";

import { useEffect } from "react";

/**
 * Регистрирует Service Worker (public/sw.js) — ТОЛЬКО в production.
 * В dev SW не регистрируется (NODE_ENV inlined Next.js на билде), чтобы не
 * мешать HMR и не кешировать dev-ассеты. Рендерит null.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // В dev снимаем регистрацию ранее установленного SW (например после открытия
    // production на том же origin) — иначе старый SW мешает HMR (ARCHITECTURE.md).
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("SW registration failed", err));
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
