/**
 * Initial seed — runs once. Idempotent via upsert.
 *
 *   pnpm tsx prisma/seed.ts
 *
 * Requires ADMIN_EMAIL and ADMIN_PASSWORD_HASH in .env.
 * Real bank details and personal data are NOT seeded — they live in the DB,
 * not in git. Update via /settings/profile UI after first login.
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!email) throw new Error("ADMIN_EMAIL is required in .env");
  if (!passwordHash) throw new Error("ADMIN_PASSWORD_HASH is required in .env");

  // Single-user invariant (ADR-002): enforce that the DB has at most one User.
  // If a user already exists with a different email, fail loud — refuse to
  // create a second account. To rotate the admin, delete the existing row
  // through Prisma Studio or `prisma.user.deleteMany()` first.
  // Normalize identical to lib/validators/auth.ts to keep seed/login in sync.
  const lowerEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findMany({
    select: { id: true, email: true },
    take: 2,
  });

  if (existing.length > 1) {
    throw new Error(
      `Refusing to seed: ${existing.length} users already exist. The DB must hold a single admin (ADR-002).`
    );
  }
  if (existing.length === 1 && existing[0]!.email !== lowerEmail) {
    throw new Error(
      `Refusing to seed: a different admin (${existing[0]!.email}) already exists. ` +
        `Delete it explicitly before changing ADMIN_EMAIL.`
    );
  }

  const user = await prisma.user.upsert({
    where: { email: lowerEmail },
    create: {
      email: lowerEmail,
      passwordHash,
      name: "Aleksandr Kuc",
    },
    update: { passwordHash },
    select: { id: true, email: true, name: true },
  });

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      companyName: "Webvibe",
      ownerName: "Aleksandr Kuc",
      address: "TODO",
      iban: "TODO",
      email: email.toLowerCase(),
      website: "https://webvibe.lt",
      defaultCurrency: "EUR",
      documentLanguage: "lt",
    },
    update: {},
    select: { id: true, companyName: true, defaultCurrency: true },
  });

  console.log("✓ seeded user:", user);
  console.log("✓ seeded settings:", settings);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
