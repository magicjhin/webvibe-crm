import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

const COLOR: Record<InvoiceStatus, string> = {
  draft: "bg-[var(--color-status-draft)]",
  sent: "bg-[var(--color-info)]",
  paid: "bg-[var(--color-status-paid)]",
  cancelled: "bg-[var(--color-status-cancelled)]",
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
  const t = useTranslations("docStatus.invoice");
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
        <span className="text-[hsl(var(--danger))]">{t("overdue")}</span>
      </span>
    );
  }

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
