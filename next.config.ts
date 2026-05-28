import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle PDF-font TTF файлов в serverless function output для /api/invoices/[id]/pdf.
  // Без этого на Vercel deploy assets/fonts/ не попадёт в lambda bundle и
  // path.join(process.cwd(), "assets/fonts/...") даст ENOENT в production.
  outputFileTracingIncludes: {
    "/api/invoices/**": ["./assets/fonts/**"],
  },
};

export default nextConfig;
