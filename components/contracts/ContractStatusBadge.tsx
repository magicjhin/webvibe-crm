import { cn } from "@/lib/utils";
import type { ContractStatus } from "@/lib/validators/contract";

const MAP: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "bg-[var(--color-status-draft)]" },
  sent: { label: "Отправлен", color: "bg-[var(--color-info)]" },
  signed: { label: "Подписан", color: "bg-[var(--color-status-paid)]" },
  cancelled: { label: "Отменён", color: "bg-[var(--color-status-cancelled)]" },
};

export function ContractStatusBadge({
  status,
  className,
}: {
  status: ContractStatus;
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
