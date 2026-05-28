"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Period } from "@/lib/dashboard/periodBounds";
import { todayCursor } from "@/lib/dashboard/periodBounds";

type Props = {
  period: Period;
  label: string;
  prevCursor: string;
  nextCursor: string;
  cursor: string; // canonical для текущего периода
};

const PERIOD_LABELS: Record<Period, string> = {
  month: "Месяц",
  quarter: "Квартал",
  year: "Год",
};

function hrefFor(period: Period, cursor: string) {
  return `/dashboard?period=${period}&cursor=${cursor}`;
}

export function PeriodSwitcher({ period, label, prevCursor, nextCursor, cursor }: Props) {
  const today = todayCursor();
  const isToday = cursor === today.slice(0, 8) + "01" || cursor === `${today.slice(0, 4)}-01-01`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Period tabs */}
      <div className="inline-flex items-center rounded-md border border-border bg-background-elevated p-0.5 text-sm">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Link
            key={p}
            href={hrefFor(p, today)}
            className={cn(
              "rounded px-3 py-1.5 transition-colors",
              p === period
                ? "bg-foreground text-background"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="icon-sm" aria-label="Предыдущий период">
          <Link href={hrefFor(period, prevCursor)}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <span className="min-w-[140px] text-center text-sm font-medium tabular-nums">
          {label}
        </span>
        <Button asChild variant="outline" size="icon-sm" aria-label="Следующий период">
          <Link href={hrefFor(period, nextCursor)}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        {!isToday ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={hrefFor(period, today)}>Сегодня</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
