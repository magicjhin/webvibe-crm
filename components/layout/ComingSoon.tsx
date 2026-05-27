import { AppShell } from "@/components/layout/AppShell";
import { Construction } from "lucide-react";

/**
 * Bootstrap-stage placeholder. Real implementation lands per ROADMAP.md.
 */
export function ComingSoon({
  name,
  iteration,
}: {
  name: string;
  iteration: string;
}) {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <div className="grid size-14 place-items-center rounded-full border border-border bg-card text-foreground-muted">
          <Construction className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="text-sm text-foreground-muted">
          Модуль появится в <span className="font-medium text-foreground">{iteration}</span>.
          См. <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">ROADMAP.md</code> для плана итераций.
        </p>
      </div>
    </AppShell>
  );
}
