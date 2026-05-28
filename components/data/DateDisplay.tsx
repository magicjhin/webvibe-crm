import { formatDistanceToNowStrict } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { lt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PROJECT_TZ } from "@/lib/dates/parse";

type Mode = "short" | "long" | "relative";

const FORMATS: Record<Exclude<Mode, "relative">, string> = {
  short: "dd.MM.yyyy",
  long: "d MMMM yyyy, HH:mm",
};

export function DateDisplay({
  date,
  mode = "short",
  className,
}: {
  date: Date | string | null | undefined;
  mode?: Mode;
  className?: string;
}) {
  if (!date) return <span className={cn("text-foreground-subtle", className)}>—</span>;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return <span className={cn("text-foreground-subtle", className)}>—</span>;
  }
  // All formatting goes through Europe/Vilnius so deployment runtime
  // (Vercel = UTC by default) doesn't shift the visible calendar day.
  const text =
    mode === "relative"
      ? formatDistanceToNowStrict(d, { locale: lt, addSuffix: true })
      : formatInTimeZone(d, PROJECT_TZ, FORMATS[mode], { locale: lt });
  return (
    <time
      dateTime={d.toISOString()}
      className={cn("tabular-nums", className)}
      title={formatInTimeZone(d, PROJECT_TZ, "yyyy-MM-dd HH:mm")}
    >
      {text}
    </time>
  );
}
