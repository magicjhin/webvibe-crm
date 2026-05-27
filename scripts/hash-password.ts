/**
 * One-shot CLI: hash a password with bcrypt (cost 12).
 *
 * Usage:
 *   pnpm tsx scripts/hash-password.ts <plaintext>
 *
 * Copy the resulting hash into ADMIN_PASSWORD_HASH in .env.
 * Wired up to Auth.js Credentials provider in Iteration 1.
 */
import bcrypt from "bcryptjs";

async function main() {
  const plain = process.argv[2];
  if (!plain) {
    console.error("Usage: pnpm tsx scripts/hash-password.ts <plaintext>");
    process.exit(1);
  }
  const hash = await bcrypt.hash(plain, 12);
  console.log(hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
