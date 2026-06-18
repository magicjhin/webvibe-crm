import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/lib/validators/proposal";

const COLOR: Record<ProposalStatus, string> = {
  draft: "bg-[var(--color-status-draft)]",
  sent: "bg-[var(--color-info)]",
  accepted: "bg-[var(--color-status-paid)]",
  declined: "bg-[var(--color-status-overdue)]",
  revisions: "bg-[var(--color-status-pending)]",
};

export function ProposalStatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  const t = useTranslations("docStatus.proposal");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background-elevated px-2 py-0.5 text-xs font-medium text-foreground-muted",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", COLOR[status])} aria-hidden />
      <span className="text-foreground">{t(status)}</span>
    </span>
  );
}
