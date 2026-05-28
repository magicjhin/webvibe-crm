import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Project timezone is fixed to Europe/Vilnius (ARCHITECTURE.md).
 * Centralised so server actions don't reach for `new Date(...)` ad-hoc.
 */
export const PROJECT_TZ = "Europe/Vilnius";

/**
 * Parse a date-only string (YYYY-MM-DD) coming from <input type="date" /> as
 * midnight in the project timezone, returning a UTC Date for Prisma.
 * Returns null for empty / null input.
 */
export function parseDateOnly(input: string | null | undefined): Date | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (trimmed === "") return null;
  // input type="date" gives us "YYYY-MM-DD". Treat as local midnight in
  // Europe/Vilnius so the same calendar day round-trips regardless of where
  // the server runs.
  return fromZonedTime(`${trimmed}T00:00:00`, PROJECT_TZ);
}

/**
 * Inverse of parseDateOnly: take a UTC Date and return the calendar day
 * (YYYY-MM-DD) it represents in the project timezone. Used to seed
 * <input type="date" /> defaultValues on edit pages.
 */
export function formatDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return formatInTimeZone(date, PROJECT_TZ, "yyyy-MM-dd");
}
