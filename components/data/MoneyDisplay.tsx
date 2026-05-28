import { cn } from "@/lib/utils";

/**
 * Inline EUR formatter for Iter 2 (rich KPI version comes in Iter 3).
 * Accepts Prisma.Decimal, decimal.js, number, or numeric string.
 */
export function MoneyDisplay({
  value,
  currency = "EUR",
  className,
}: {
  value: { toString(): string } | number | string | null | undefined;
  currency?: string;
  className?: string;
}) {
  if (value == null) return <span className={cn("text-foreground-subtle", className)}>—</span>;
  const numeric = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(numeric)) {
    return <span className={cn("text-foreground-subtle", className)}>—</span>;
  }
  const formatted = new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
  return <span className={cn("tabular-nums", className)}>{formatted}</span>;
}
