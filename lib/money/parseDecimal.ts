import Decimal from "decimal.js";

/**
 * `decimal.js` is what Prisma's `Decimal` is built on, so the value we return
 * here is shape-compatible with `Prisma.Decimal` (Prisma will accept it in
 * inputs and round-trip preserves precision). Importing from `decimal.js`
 * directly keeps this module browser-safe — it MUST NOT pull in the Prisma
 * runtime, because the regex below is reused from a client-side Zod schema.
 */

/**
 * Accept user-typed money strings ("1234.56", "1234,56", "1 234,56", "0", "")
 * and return a Decimal with ≤2 fraction digits.
 *
 * Returns null for empty input (let the caller decide if that's allowed).
 * Throws on invalid format — callers should wrap in try/catch.
 */
export function parseMoney(input: string | null | undefined): Decimal | null {
  if (input == null) return null;
  const trimmed = String(input).trim();
  if (trimmed === "") return null;

  // Normalize: drop thin/regular spaces, swap comma for dot.
  const normalized = trimmed.replace(/[\s ]/g, "").replace(",", ".");

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Invalid money format");
  }

  const dec = new Decimal(normalized);
  if (dec.decimalPlaces() > 2) throw new Error("Invalid money precision");
  // Schema is Decimal(12, 2) → max abs value 9_999_999_999.99
  if (dec.abs().greaterThan("9999999999.99")) throw new Error("Money out of range");

  return dec;
}

/**
 * Money string validation regex used directly inside Zod schemas, so the
 * field error surfaces in form state. Keep in sync with parseMoney.
 */
export const MONEY_STRING_RE = /^-?(\d+([.,]\d{1,2})?|\d{1,3}([  ]\d{3})*([.,]\d{1,2})?)$/;
