import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProposalForm } from "@/components/forms/ProposalForm";
import { prisma } from "@/lib/db";
import { formatDateOnly } from "@/lib/dates/parse";
import type { ProposalInput } from "@/lib/validators/proposal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await prisma.proposal.findUnique({ where: { id }, select: { number: true } });
  return { title: p ? `Редактировать ${p.number}` : "КП" };
}

type ScopeItem = { title: string; description?: string | null };
type Milestone = { name: string; deliverable?: string | null; dueLabel?: string | null };
type PaymentItem = { label: string; amount: string; dueLabel?: string | null };
type PortfolioLink = { label: string; url: string };

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [proposal, clients, projects] = await Promise.all([
    prisma.proposal.findUnique({ where: { id } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, clientId: true },
    }),
  ]);

  if (!proposal) notFound();
  if (proposal.status !== "draft") {
    redirect(`/proposals/${proposal.id}`);
  }

  const scopeIncluded = (proposal.scopeIncluded as ScopeItem[] | null) ?? [];
  const scopeExcluded = (proposal.scopeExcluded as ScopeItem[] | null) ?? [];
  const milestones = (proposal.milestones as Milestone[] | null) ?? [];
  const paymentPlan = (proposal.paymentPlan as PaymentItem[] | null) ?? [];
  const portfolioLinks = (proposal.portfolioLinks as PortfolioLink[] | null) ?? [];

  const initial: ProposalInput = {
    clientId: proposal.clientId,
    projectId: proposal.projectId,
    title: proposal.title,
    status: "draft",
    currency: "EUR",
    total: proposal.total.toString(),
    validUntil: formatDateOnly(proposal.validUntil),
    scopeIncluded:
      scopeIncluded.length > 0
        ? scopeIncluded.map((s) => ({ title: s.title, description: s.description ?? null }))
        : [{ title: "", description: null }],
    scopeExcluded: scopeExcluded.map((s) => ({ title: s.title, description: s.description ?? null })),
    milestones: milestones.map((m) => ({
      name: m.name,
      deliverable: m.deliverable ?? null,
      dueLabel: m.dueLabel ?? null,
    })),
    paymentPlan: paymentPlan.map((p) => ({
      label: p.label,
      amount: p.amount,
      dueLabel: p.dueLabel ?? null,
    })),
    warranty: proposal.warranty,
    portfolioLinks: portfolioLinks.map((l) => ({ label: l.label, url: l.url })),
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`Редактировать — ${proposal.number}`}
          description="Редактировать можно только черновики. После «Отправлено» — заморожено."
        />
        <ProposalForm
          mode="edit"
          id={proposal.id}
          initial={initial}
          clients={clients}
          projects={projects}
        />
      </div>
    </AppShell>
  );
}
