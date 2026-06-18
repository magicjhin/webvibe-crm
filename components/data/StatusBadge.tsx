import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type StatusKind = "client" | "project" | "task" | "lead";

// Только цвета; подписи берём из каталога messages (неймспейс `status.<kind>`).
const COLORS: Record<StatusKind, Record<string, string>> = {
  client: {
    active: "bg-[var(--color-status-active)]",
    archived: "bg-[var(--color-status-cancelled)]",
  },
  project: {
    idea: "bg-[var(--color-status-draft)]",
    estimating: "bg-[var(--color-status-draft)]",
    awaiting_advance: "bg-[var(--color-status-pending)]",
    in_progress: "bg-[var(--color-info)]",
    waiting_client: "bg-[var(--color-status-pending)]",
    review: "bg-[var(--color-status-pending)]",
    revisions: "bg-[var(--color-status-pending)]",
    ready: "bg-[var(--color-status-active)]",
    paid: "bg-[var(--color-status-paid)]",
    archived: "bg-[var(--color-status-cancelled)]",
  },
  task: {
    todo: "bg-[var(--color-status-draft)]",
    in_progress: "bg-[var(--color-info)]",
    waiting_client: "bg-[var(--color-status-pending)]",
    review: "bg-[var(--color-status-pending)]",
    done: "bg-[var(--color-status-paid)]",
  },
  lead: {
    new: "bg-[var(--color-info)]",
    to_contact: "bg-[var(--color-status-pending)]",
    discussion: "bg-[var(--color-status-pending)]",
    awaiting_proposal: "bg-[var(--color-status-pending)]",
    proposal_sent: "bg-[var(--color-status-pending)]",
    thinking: "bg-[var(--color-status-draft)]",
    accepted: "bg-[var(--color-status-paid)]",
    declined: "bg-[var(--color-status-overdue)]",
    postponed: "bg-[var(--color-status-cancelled)]",
  },
};

export function StatusBadge({
  kind,
  value,
  className,
}: {
  kind: StatusKind;
  value: string;
  className?: string;
}) {
  const t = useTranslations("status");
  const color = COLORS[kind][value] ?? "bg-[var(--color-status-draft)]";
  // Неизвестный статус — показываем сырое значение, не падаем.
  const known = value in COLORS[kind];
  const label = known ? t(`${kind}.${value}`) : value;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background-elevated px-2 py-0.5 text-xs font-medium text-foreground-muted",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", color)} aria-hidden />
      <span className="text-foreground">{label}</span>
    </span>
  );
}
