import { cn } from "@/lib/utils";

type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

const MAP: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "bg-[var(--color-status-draft)]" },
  sent: { label: "Отправлен", color: "bg-[var(--color-info)]" },
  paid: { label: "Оплачен", color: "bg-[var(--color-status-paid)]" },
  cancelled: { label: "Отменён", color: "bg-[var(--color-status-cancelled)]" },
};

export function InvoiceStatusBadge({
  status,
  dueAt,
  className,
}: {
  status: InvoiceStatus;
  dueAt: Date | null;
  className?: string;
}) {
  // Derived "overdue" — not stored, computed on the fly per DATABASE.md.
  const isOverdue =
    status === "sent" && dueAt != null && dueAt.getTime() < Date.now();

  if (isOverdue) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-background-elevated px-2 py-0.5 text-xs font-medium text-foreground-muted",
          className,
        )}
      >
        <span
          className="size-1.5 rounded-full bg-[var(--color-status-overdue)]"
          aria-hidden
        />
        <span className="text-[hsl(var(--danger))]">Просрочен</span>
      </span>
    );
  }

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
