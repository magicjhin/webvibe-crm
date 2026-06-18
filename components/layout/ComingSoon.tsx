import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { Construction } from "lucide-react";

/**
 * Bootstrap-stage placeholder. Real implementation lands per ROADMAP.md.
 */
export async function ComingSoon({
  name,
  iteration,
}: {
  name: string;
  /** Номер итерации, например "5". */
  iteration: string;
}) {
  const t = await getTranslations("comingSoon");
  return (
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <div className="grid size-14 place-items-center rounded-full border border-border bg-card text-foreground-muted">
          <Construction className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="text-sm text-foreground-muted">
          {t("arrivesIn", { iteration: t("iterationName", { n: iteration }) })}{" "}
          {t.rich("roadmapNote", {
            code: (chunks) => (
              <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{chunks}</code>
            ),
          })}
        </p>
      </div>
    </AppShell>
  );
}
