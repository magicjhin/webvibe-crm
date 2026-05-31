import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// ADR-019 (revised): runtime uses the Neon serverless driver over WebSocket,
// not raw TCP (@prisma/adapter-pg). On Vercel serverless + Neon scale-to-zero
// a plain TCP connect during compute wake-up fails with P1001
// "Can't reach database server". The WS driver handles wake-up gracefully.
//
// Node runtimes (Vercel functions + local tsx) have no global WebSocket, so we
// hand the driver the `ws` implementation. seed.ts stays on @prisma/adapter-pg
// (local-only DDL/seed via DIRECT_URL — no serverless cold-start there).
neonConfig.webSocketConstructor = ws;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Vercel env values are sometimes pasted with wrapping quotes or a trailing
// newline/space. The Neon WS driver parses the string with `new URL()`, which
// then throws "Invalid URL". Strip surrounding quotes + whitespace defensively
// so a paste mistake in the dashboard can't break login again.
function cleanConnectionString(raw: string): string {
  return raw.trim().replace(/^['"]+|['"]+$/g, "").trim();
}

function createClient() {
  const url = cleanConnectionString(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL is required");
  const adapter = new PrismaNeon({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
