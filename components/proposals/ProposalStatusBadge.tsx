import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/lib/validators/proposal";

const MAP: Record<ProposalStatus, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "bg-[var(--color-status-draft)]" },
  sent: { label: "Отправлено", color: "bg-[var(--color-info)]" },
  accepted: { label: "Принято", color: "bg-[var(--color-status-paid)]" },
  declined: { label: "Отклонено", color: "bg-[var(--color-status-overdue)]" },
  revisions: { label: "Правки", color: "bg-[var(--color-status-pending)]" },
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: MAP.draft.label,
  sent: MAP.sent.label,
  accepted: MAP.accepted.label,
  declined: MAP.declined.label,
  revisions: MAP.revisions.label,
};

export function ProposalStatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  const def = MAP[status];
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
