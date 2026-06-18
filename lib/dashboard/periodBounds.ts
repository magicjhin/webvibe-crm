import { formatInTimeZone } from "date-fns-tz";
import { parseDateOnly, PROJECT_TZ } from "@/lib/dates/parse";

export type Period = "month" | "quarter" | "year";

export type Bucket = {
  key: string;
  label: string;
  start: Date;
  end: Date; // exclusive
};

export type PeriodBounds = {
  period: Period;
  cursor: string; // canonical YYYY-MM-DD начала периода
  start: Date;
  end: Date;
  label: string; // "Май 2026" / "Q2 2026" / "2026"
  buckets: Bucket[];
  prevCursor: string;
  nextCursor: string;
};

// Подписи месяцев берём из Intl по активной локали UI (ru/en).
const monthLabel = (m1: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(Date.UTC(2000, m1 - 1, 1)),
  );
const monthName = (m1: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(Date.UTC(2000, m1 - 1, 1)),
  );

const pad = (n: number) => String(n).padStart(2, "0");

function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = ((total % 12) + 12) % 12 + 1;
  return { y: newY, m: newM };
}

function addDay(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function todayCursor(): string {
  return formatInTimeZone(new Date(), PROJECT_TZ, "yyyy-MM-dd");
}

/**
 * Parse cursor (YYYY-MM-DD) safely. Defaults to today in Vilnius если кривой.
 */
function parseCursor(cursor: string | undefined): { y: number; m: number } {
  const fallback = todayCursor();
  const c = cursor && /^\d{4}-\d{2}-\d{2}$/.test(cursor) ? cursor : fallback;
  const [y, m] = c.split("-").map(Number) as [number, number];
  return { y, m };
}

export function getPeriodBounds(
  period: Period,
  cursor: string | undefined,
  locale = "ru",
): PeriodBounds {
  const { y, m } = parseCursor(cursor);

  if (period === "month") {
    const start = parseDateOnly(`${y}-${pad(m)}-01`)!;
    const next = addMonths(y, m, 1);
    const end = parseDateOnly(`${next.y}-${pad(next.m)}-01`)!;
    const prev = addMonths(y, m, -1);

    // Day buckets через addDay (DST-safe в Vilnius)
    const buckets: Bucket[] = [];
    let curY = y, curM = m, curD = 1;
    while (curY === y && curM === m) {
      const dayStr = `${curY}-${pad(curM)}-${pad(curD)}`;
      const dayStart = parseDateOnly(dayStr)!;
      const n = addDay(curY, curM, curD);
      const dayEnd = parseDateOnly(`${n.y}-${pad(n.m)}-${pad(n.d)}`)!;
      buckets.push({
        key: dayStr,
        label: String(curD),
        start: dayStart,
        end: dayEnd,
      });
      curY = n.y; curM = n.m; curD = n.d;
    }

    return {
      period,
      cursor: `${y}-${pad(m)}-01`,
      start,
      end,
      label: `${monthName(m, locale)} ${y}`,
      buckets,
      prevCursor: `${prev.y}-${pad(prev.m)}-01`,
      nextCursor: `${next.y}-${pad(next.m)}-01`,
    };
  }

  if (period === "quarter") {
    const qIndex = Math.floor((m - 1) / 3); // 0..3
    const qStartM = qIndex * 3 + 1;
    const start = parseDateOnly(`${y}-${pad(qStartM)}-01`)!;
    const nextQ = addMonths(y, qStartM, 3);
    const end = parseDateOnly(`${nextQ.y}-${pad(nextQ.m)}-01`)!;
    const prevQ = addMonths(y, qStartM, -3);

    const buckets: Bucket[] = [];
    for (let i = 0; i < 3; i++) {
      const { y: bY, m: bM } = addMonths(y, qStartM, i);
      const bStart = parseDateOnly(`${bY}-${pad(bM)}-01`)!;
      const bNext = addMonths(bY, bM, 1);
      const bEnd = parseDateOnly(`${bNext.y}-${pad(bNext.m)}-01`)!;
      buckets.push({
        key: `${bY}-${pad(bM)}`,
        label: monthLabel(bM, locale),
        start: bStart,
        end: bEnd,
      });
    }

    return {
      period,
      cursor: `${y}-${pad(qStartM)}-01`,
      start,
      end,
      label: `Q${qIndex + 1} ${y}`,
      buckets,
      prevCursor: `${prevQ.y}-${pad(prevQ.m)}-01`,
      nextCursor: `${nextQ.y}-${pad(nextQ.m)}-01`,
    };
  }

  // year
  const start = parseDateOnly(`${y}-01-01`)!;
  const end = parseDateOnly(`${y + 1}-01-01`)!;

  const buckets: Bucket[] = [];
  for (let i = 0; i < 12; i++) {
    const bStart = parseDateOnly(`${y}-${pad(i + 1)}-01`)!;
    const bNext = i === 11 ? { y: y + 1, m: 1 } : { y, m: i + 2 };
    const bEnd = parseDateOnly(`${bNext.y}-${pad(bNext.m)}-01`)!;
    buckets.push({
      key: `${y}-${pad(i + 1)}`,
      label: monthLabel(i + 1, locale),
      start: bStart,
      end: bEnd,
    });
  }

  return {
    period,
    cursor: `${y}-01-01`,
    start,
    end,
    label: `${y}`,
    buckets,
    prevCursor: `${y - 1}-01-01`,
    nextCursor: `${y + 1}-01-01`,
  };
}

export function isValidPeriod(p: string | undefined): p is Period {
  return p === "month" || p === "quarter" || p === "year";
}
