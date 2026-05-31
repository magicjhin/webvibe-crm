import { createHash } from "node:crypto";
import { formatInTimeZone } from "date-fns-tz";
import { lt } from "date-fns/locale";

import { prisma } from "@/lib/db";
import { PROJECT_TZ } from "@/lib/dates/parse";
import { SignFlow } from "@/components/sign/SignFlow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sutarties pasirašymas" };

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function eur(value: { toString(): string }): string {
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value.toString()));
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <header className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-accent-gradient">webvibe</span>
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Sutarties pasirašymas</h1>
        </header>
        {children}
      </div>
    </div>
  );
}

function StateCard({
  title,
  description,
  tone = "muted",
}: {
  title: string;
  description: string;
  tone?: "muted" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border bg-background-elevated p-6 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p
        className={
          tone === "danger"
            ? "mt-2 text-sm text-[hsl(var(--danger))]"
            : "mt-2 text-sm text-foreground-muted"
        }
      >
        {description}
      </p>
    </div>
  );
}

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const hash = hashToken(token);

  const contract = await prisma.contract.findFirst({
    where: { signTokenHash: hash },
    include: { client: { select: { name: true } } },
  });

  // Token not found — either never existed, or already consumed (hash nulled on sign).
  if (!contract) {
    // Distinguish "already signed via this exact link" is impossible after consume,
    // so present a generic invalid-state.
    return (
      <Shell>
        <StateCard
          title="Nuoroda nebegalioja"
          description="Ši pasirašymo nuoroda neteisinga, jau panaudota arba pasibaigė jos galiojimas. Susisiekite su mumis dėl naujos nuorodos."
          tone="danger"
        />
      </Shell>
    );
  }

  if (contract.status === "signed") {
    return (
      <Shell>
        <StateCard
          title="Jau pasirašyta"
          description="Ši sutartis jau pasirašyta. Pakartotinai pasirašyti nereikia."
        />
      </Shell>
    );
  }

  const expired =
    contract.signTokenExpiresAt != null &&
    contract.signTokenExpiresAt.getTime() <= Date.now();

  if (expired || contract.status !== "sent") {
    return (
      <Shell>
        <StateCard
          title="Nuoroda nebegalioja"
          description="Pasirašymo nuorodos galiojimas pasibaigė. Paprašykite naujos nuorodos."
          tone="danger"
        />
      </Shell>
    );
  }

  const issued = formatInTimeZone(contract.issuedAt, PROJECT_TZ, "yyyy-MM-dd", {
    locale: lt,
  });

  return (
    <Shell>
      <div className="rounded-lg border border-border bg-background-elevated p-5">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-foreground-muted">Sutarties Nr.</dt>
            <dd className="font-mono font-medium">{contract.number}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">Data</dt>
            <dd className="tabular-nums">{issued}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">Suma</dt>
            <dd className="tabular-nums font-medium">{eur(contract.amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">Užsakovas</dt>
            <dd className="font-medium">{contract.client.name}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-foreground-muted">
          Vykdytojas: Webvibe (individuali veikla)
        </p>
      </div>

      <a
        href={`/api/sign/${token}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-sm text-accent hover:underline"
      >
        Peržiūrėti dokumentą (PDF)
      </a>

      <SignFlow token={token} />

      <p className="text-center text-xs text-foreground-subtle">
        Pasirašydami patvirtinate, kad susipažinote su sutarties sąlygomis ir sutinkate.
      </p>
    </Shell>
  );
}
