// Prisma 7 config.
//
// CLI commands (`prisma migrate dev`, `prisma migrate deploy`, etc.) use
// `datasource.url` — we point it at DIRECT_URL because pooler doesn't run DDL.
//
// App runtime uses the @prisma/adapter-pg with DATABASE_URL (pooled), wired
// up directly in `lib/db.ts` on each PrismaClient construction.
//
// .env is loaded via dotenv import; never commit real secrets.
import "dotenv/config";
import { defineConfig } from "prisma/config";

// DIRECT_URL нужен только для `prisma migrate`/`db seed` (DDL-команды, реальное
// соединение). `prisma generate` НЕ коннектится к БД, поэтому здесь нельзя
// жёстко падать — иначе `next build` на Vercel валится в `prisma generate`
// ещё до того, как заданы env-переменные. Если URL не задан — подставляем
// безопасный placeholder: generate отработает, а migrate/seed дадут понятную
// ошибку соединения (и локально DIRECT_URL всегда есть в .env).
const directUrl =
  process.env["DIRECT_URL"] ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: directUrl,
  },
});
