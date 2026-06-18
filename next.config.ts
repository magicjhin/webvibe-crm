import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Neon serverless driver использует `ws` для WebSocket-соединения с БД.
  // Если Next.js/webpack бандлит `ws`, его внутренняя функция маскирования
  // кадров ломается → `TypeError: b.mask is not a function` → Node-процесс
  // на Vercel крашится посреди запроса (exit 129), Prisma видит
  // "Connection terminated unexpectedly". Грузим эти пакеты из node_modules
  // как есть, без бандлинга. (ADR-019 Revision 2026-05-31.)
  serverExternalPackages: [
    "ws",
    "@neondatabase/serverless",
    "@prisma/adapter-neon",
    "@prisma/adapter-pg",
  ],
  // Bundle PDF-font TTF файлов в serverless function output для всех PDF-роутов.
  // Без этого на Vercel deploy assets/fonts/ не попадёт в lambda bundle и
  // path.join(process.cwd(), "assets/fonts/...") даст ENOENT в production.
  // Iter 4 добавил договоры/КП/публичную подпись — им шрифты тоже нужны.
  outputFileTracingIncludes: {
    "/api/invoices/**": ["./assets/fonts/**"],
    "/api/contracts/**": ["./assets/fonts/**"],
    "/api/proposals/**": ["./assets/fonts/**"],
    "/api/sign/**": ["./assets/fonts/**"],
  },
  async headers() {
    return [
      {
        // Service Worker не кешируем надолго — иначе обновления SW не доедут.
        // Service-Worker-Allowed расширяет область видимости до корня.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
