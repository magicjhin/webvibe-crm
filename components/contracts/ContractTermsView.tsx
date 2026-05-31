import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Read-only render of Contract.terms (stored as JSON, shape depends on kind).
 * The server action normalises decimal strings, so we just display them.
 */
type ScopeItem = { title: string; description?: string | null };
type PaymentTerm = { label: string; amount: string; dueLabel?: string | null };

type Terms = {
  kind: "STAGED" | "ADVANCE" | "MAINTENANCE";
  subject?: string;
  scope?: ScopeItem[];
  paymentTerms?: PaymentTerm[];
  monthlyAmount?: string;
  includes?: string[];
  excluded?: ScopeItem[];
  warranty?: string | null;
  termsNote?: string | null;
};

export function ContractTermsView({ terms }: { terms: unknown }) {
  const t = (terms ?? {}) as Terms;

  return (
    <div className="flex flex-col gap-4">
      {t.subject ? (
        <Card>
          <CardHeader>
            <CardTitle>Sutarties dalykas (§2)</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-foreground-muted">
            {t.subject}
          </CardContent>
        </Card>
      ) : null}

      {t.scope && t.scope.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Darbų apimtis (§3)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {t.scope.map((s, idx) => (
                <li
                  key={idx}
                  className="rounded-md border border-border bg-background-elevated px-4 py-3"
                >
                  <p className="font-medium">
                    <span className="font-mono text-xs text-foreground-muted">3.{idx + 1} </span>
                    {s.title}
                  </p>
                  {s.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-foreground-muted">
                      {s.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {t.kind === "MAINTENANCE" ? (
        <Card>
          <CardHeader>
            <CardTitle>Priežiūra</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              <span className="text-foreground-muted">Mėnesinis mokestis: </span>
              <span className="font-medium">
                <MoneyDisplay value={t.monthlyAmount ?? null} /> / mėn.
              </span>
            </p>
            {t.includes && t.includes.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-foreground-muted">
                {t.includes.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {t.paymentTerms && t.paymentTerms.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Atsiskaitymo tvarka (§4)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {t.paymentTerms.map((p, idx) => (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-4 rounded-md border border-border bg-background-elevated px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{p.label}</p>
                    {p.dueLabel ? (
                      <p className="text-xs text-foreground-muted">{p.dueLabel}</p>
                    ) : null}
                  </div>
                  <span className="font-medium">
                    <MoneyDisplay value={p.amount} />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {t.warranty || t.termsNote ? (
        <Card>
          <CardHeader>
            <CardTitle>Garantija ir pastabos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-foreground-muted">
            {t.warranty ? (
              <div>
                <p className="text-xs uppercase tracking-wide">Garantija (§9)</p>
                <p className="whitespace-pre-wrap">{t.warranty}</p>
              </div>
            ) : null}
            {t.termsNote ? (
              <div>
                <p className="text-xs uppercase tracking-wide">Pastabos</p>
                <p className="whitespace-pre-wrap">{t.termsNote}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
