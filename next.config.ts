import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
