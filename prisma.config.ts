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

const directUrl = process.env["DIRECT_URL"];
if (!directUrl) {
  throw new Error("DIRECT_URL is required in .env for prisma migrate");
}

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
