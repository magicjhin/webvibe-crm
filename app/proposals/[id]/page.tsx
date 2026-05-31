import { notFound } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposalHeader } from "@/components/proposals/ProposalHeader";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await prisma.proposal.findUnique({ where: { id }, select: { number: true } });
  return { title: p ? p.number : "КП" };
}

type ScopeItem = { title: string; description?: string | null };
type Milestone = { name: string; deliverable?: string | null; dueLabel?: string | null };
type PaymentItem = { label: string; amount: string; dueLabel?: string | null };
type PortfolioLink = { label: string; url: string };

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
  });
  if (!proposal) notFound();

  const scopeIncluded = (proposal.scopeIncluded as ScopeItem[] | null) ?? [];
  const scopeExcluded = (proposal.scopeExcluded as ScopeItem[] | null) ?? [];
  const milestones = (proposal.milestones as Milestone[] | null) ?? [];
  const paymentPlan = (proposal.paymentPlan as PaymentItem[] | null) ?? [];
  const portfolioLinks = (proposal.portfolioLinks as PortfolioLink[] | null) ?? [];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <ProposalHeader
          id={proposal.id}
          number={proposal.number}
          status={proposal.status}
          clientName={proposal.client.name}
          projectId={proposal.projectId}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">Suma</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                <MoneyDisplay value={proposal.total} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">Клиент</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <Link href={`/clients/${proposal.client.id}`} className="hover:underline">
                  {proposal.client.name}
                </Link>
              </p>
              {proposal.project ? (
                <p>
                  <span className="text-foreground-muted">Проект:</span>{" "}
                  <Link href={`/projects/${proposal.project.id}`} className="hover:underline">
                    {proposal.project.title}
                  </Link>
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">Galioja iki</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <DateDisplay date={proposal.validUntil} />
            </CardContent>
          </Card>
        </div>

        {/* PDF preview */}
        <Card>
          <CardHeader>
            <CardTitle>PDF</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <iframe
              src={`/api/proposals/${proposal.id}/pdf`}
              title={`PDF ${proposal.number}`}
              className="h-[600px] w-full rounded-md border border-border bg-white"
            />
            <p className="text-xs text-foreground-muted">
              PDF собирается из последних данных КП.
            </p>
          </CardContent>
        </Card>

        {scopeIncluded.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Į kainą įeina</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {scopeIncluded.map((s, idx) => (
                  <li key={idx} className="rounded-md border border-border bg-background-elevated px-4 py-3">
                    <p className="font-medium">{s.title}</p>
                    {s.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-foreground-muted">{s.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {scopeExcluded.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Į kainą neįeina</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground-muted">
                {scopeExcluded.map((s, idx) => (
                  <li key={idx}>{s.title}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {milestones.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Etapai</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {milestones.map((m, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-4 rounded-md border border-border bg-background-elevated px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{m.name}</p>
                      {m.deliverable ? (
                        <p className="text-xs text-foreground-muted">{m.deliverable}</p>
                      ) : null}
                    </div>
                    {m.dueLabel ? (
                      <span className="text-xs text-foreground-muted">{m.dueLabel}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {paymentPlan.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Atsiskaitymo planas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {paymentPlan.map((p, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-4 rounded-md border border-border bg-background-elevated px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{p.label}</p>
                      {p.dueLabel ? <p className="text-xs text-foreground-muted">{p.dueLabel}</p> : null}
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

        {portfolioLinks.length > 0 || proposal.warranty ? (
          <Card>
            <CardHeader>
              <CardTitle>Portfelis ir garantija</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {portfolioLinks.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {portfolioLinks.map((l, idx) => (
                    <li key={idx}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {proposal.warranty ? (
                <div className="text-foreground-muted">
                  <p className="text-xs uppercase tracking-wide">Garantija</p>
                  <p className="whitespace-pre-wrap">{proposal.warranty}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
