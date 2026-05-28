import { cn } from "@/lib/utils";

type StatusKind = "client" | "project" | "task" | "lead";

type StatusDef = { label: string; color: string };

const CLIENT: Record<string, StatusDef> = {
  active: { label: "Активен", color: "bg-[var(--color-status-active)]" },
  archived: { label: "В архиве", color: "bg-[var(--color-status-cancelled)]" },
};

const PROJECT: Record<string, StatusDef> = {
  idea: { label: "Идея", color: "bg-[var(--color-status-draft)]" },
  estimating: { label: "Оценка", color: "bg-[var(--color-status-draft)]" },
  awaiting_advance: { label: "Ждёт аванс", color: "bg-[var(--color-status-pending)]" },
  in_progress: { label: "В работе", color: "bg-[var(--color-info)]" },
  waiting_client: { label: "Ждёт клиента", color: "bg-[var(--color-status-pending)]" },
  review: { label: "Ревью", color: "bg-[var(--color-status-pending)]" },
  revisions: { label: "Правки", color: "bg-[var(--color-status-pending)]" },
  ready: { label: "Готов", color: "bg-[var(--color-status-active)]" },
  paid: { label: "Оплачен", color: "bg-[var(--color-status-paid)]" },
  archived: { label: "В архиве", color: "bg-[var(--color-status-cancelled)]" },
};

const TASK: Record<string, StatusDef> = {
  todo: { label: "К работе", color: "bg-[var(--color-status-draft)]" },
  in_progress: { label: "В работе", color: "bg-[var(--color-info)]" },
  waiting_client: { label: "Ждёт клиента", color: "bg-[var(--color-status-pending)]" },
  review: { label: "Ревью", color: "bg-[var(--color-status-pending)]" },
  done: { label: "Готова", color: "bg-[var(--color-status-paid)]" },
};

const LEAD: Record<string, StatusDef> = {
  new: { label: "Новый", color: "bg-[var(--color-info)]" },
  to_contact: { label: "Связаться", color: "bg-[var(--color-status-pending)]" },
  discussion: { label: "Обсуждение", color: "bg-[var(--color-status-pending)]" },
  awaiting_proposal: { label: "Ждёт КП", color: "bg-[var(--color-status-pending)]" },
  proposal_sent: { label: "КП отправлено", color: "bg-[var(--color-status-pending)]" },
  thinking: { label: "Думает", color: "bg-[var(--color-status-draft)]" },
  accepted: { label: "Принял", color: "bg-[var(--color-status-paid)]" },
  declined: { label: "Отказался", color: "bg-[var(--color-status-overdue)]" },
  postponed: { label: "Отложено", color: "bg-[var(--color-status-cancelled)]" },
};

const MAP: Record<StatusKind, Record<string, StatusDef>> = {
  client: CLIENT,
  project: PROJECT,
  task: TASK,
  lead: LEAD,
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
  const def = MAP[kind][value] ?? { label: value, color: "bg-[var(--color-status-draft)]" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background-elevated px-2 py-0.5 text-xs font-medium text-foreground-muted",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", def.color)} aria-hidden />
      <span className="text-foreground">{def.label}</span>
    </span>
  );
}
