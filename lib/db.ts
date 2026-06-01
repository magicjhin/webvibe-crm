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

// Speed: route simple (non-transactional) queries over Neon's HTTP endpoint
// instead of opening a WebSocket every cold invocation. Login is a single
// findMany — over HTTP it skips the WS handshake and returns in ~1 round-trip.
// Interactive transactions ($transaction, e.g. document numbering) still use
// the WebSocket pool, so atomicity is unaffected.
neonConfig.poolQueryViaFetch = true;

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

// Ленивая инициализация. Клиент создаётся при ПЕРВОМ обращении (реальный
// запрос в рантайме), а не при импорте модуля. Это критично для `next build`:
// на этапе "Collecting page data" Next импортирует все роуты, и если бы
// createClient() выполнялся при импорте, билд падал бы с "DATABASE_URL is
// required" в окружениях, где переменная не задана на этапе сборки
// (напр. Vercel Preview deployments). Теперь DATABASE_URL нужна только когда
// действительно выполняется запрос, а не во время компиляции.
function getClient(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma;
  const client = createClient();
  // На serverless (prod) тоже кешируем в global — переиспользование между
  // инвокациями уменьшает количество cold-start подключений к Neon.
  globalThis.__prisma = client;
  return client;
}

// Прокси: createClient() откладывается до первого обращения к свойству
// (prisma.contract, prisma.$transaction и т.д.). Сам импорт `prisma` ничего
// не создаёт и не требует env — поэтому безопасен на этапе сборки.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
