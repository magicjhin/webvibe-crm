// Prisma 7 config. DATABASE_URL is loaded from .env via dotenv.
//
// Note (Iteration 1 TODO): Prisma 7 dropped `directUrl` from the schema and
// from `defineConfig().datasource`. For Neon migrations via a direct (non-
// pooled) connection we'll need to wire a driver adapter (e.g. @prisma/adapter-pg)
// before the first `prisma migrate`. Bootstrap has no migrations yet, so the
// pooled URL alone is sufficient.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
