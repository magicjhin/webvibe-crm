import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContractForm } from "@/components/forms/ContractForm";
import { prisma } from "@/lib/db";
import { formatDateOnly } from "@/lib/dates/parse";
import type { ContractInput } from "@/lib/validators/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.contract.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: c ? `Редактировать ${c.number}` : "Договор" };
}

type StoredScope = { title: string; description?: string | null };
type StoredPayment = { label: string; amount: string; dueLabel?: string | null };
type StoredTerms = {
  kind: "STAGED" | "ADVANCE" | "MAINTENANCE";
  subject?: string;
  scope?: StoredScope[];
  paymentTerms?: StoredPayment[];
  monthlyAmount?: string;
  includes?: string[];
  excluded?: StoredScope[];
  warranty?: string | null;
  termsNote?: string | null;
};

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contract, clients, projects] = await Promise.all([
    prisma.contract.findUnique({ where: { id } }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, clientId: true },
    }),
  ]);

  if (!contract) notFound();
  if (contract.status !== "draft") {
    redirect(`/contracts/${contract.id}`);
  }

  const issuedAt = formatDateOnly(contract.issuedAt) ?? new Date().toISOString().slice(0, 10);
  const t = (contract.terms ?? {}) as StoredTerms;

  const base = {
    kind: contract.kind,
    clientId: contract.clientId,
    projectId: contract.projectId,
    issuedAt,
    status: "draft" as const,
    currency: "EUR" as const,
    amount: contract.amount.toString(),
  };

  const initial: ContractInput =
    contract.kind === "MAINTENANCE"
      ? {
          ...base,
          kind: "MAINTENANCE",
          terms: {
            kind: "MAINTENANCE",
            subject: t.subject ?? "",
            monthlyAmount: t.monthlyAmount ?? "",
            includes: t.includes ?? [],
            warranty: t.warranty ?? null,
            termsNote: t.termsNote ?? null,
            excluded: (t.excluded ?? []).map((e) => ({
              title: e.title,
              description: e.description ?? null,
            })),
          },
        }
      : {
          ...base,
          kind: contract.kind,
          terms: {
            kind: contract.kind,
            subject: t.subject ?? "",
            scope: (t.scope ?? [{ title: "", description: null }]).map((s) => ({
              title: s.title,
              description: s.description ?? null,
            })),
            paymentTerms: (t.paymentTerms ?? [{ label: "", amount: "", dueLabel: null }]).map(
              (p) => ({
                label: p.label,
                amount: p.amount,
                dueLabel: p.dueLabel ?? null,
              }),
            ),
            warranty: t.warranty ?? null,
            termsNote: t.termsNote ?? null,
            excluded: (t.excluded ?? []).map((e) => ({
              title: e.title,
              description: e.description ?? null,
            })),
          },
        };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`Редактировать — ${contract.number}`}
          description="Редактировать можно только черновики. После «Отправлен» — заморожено."
        />
        <ContractForm
          mode="edit"
          id={contract.id}
          initial={initial}
          clients={clients}
          projects={projects}
        />
      </div>
    </AppShell>
  );
}
