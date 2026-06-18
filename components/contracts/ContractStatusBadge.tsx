import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ContractStatus } from "@/lib/validators/contract";

const COLOR: Record<ContractStatus, string> = {
  draft: "bg-[var(--color-status-draft)]",
  sent: "bg-[var(--color-info)]",
  signed: "bg-[var(--color-status-paid)]",
  cancelled: "bg-[var(--color-status-cancelled)]",
};

export function ContractStatusBadge({
  status,
  className,
}: {
  status: ContractStatus;
  className?: string;
}) {
  const t = useTranslations("docStatus.contract");
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
