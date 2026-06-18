import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ContractKind } from "@/lib/validators/contract";

const COLOR: Record<ContractKind, string> = {
  STAGED: "bg-[var(--color-info)]",
  ADVANCE: "bg-[var(--color-status-pending)]",
  MAINTENANCE: "bg-[var(--color-status-active)]",
};

export function ContractKindBadge({
  kind,
  className,
}: {
  kind: ContractKind;
  className?: string;
}) {
  const t = useTranslations("docStatus.contractKind");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background-elevated px-2 py-0.5 text-xs font-medium text-foreground-muted",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", COLOR[kind])} aria-hidden />
      <span className="text-foreground">{t(kind)}</span>
    </span>
  );
}
