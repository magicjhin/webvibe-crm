import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/forms/InvoiceForm";
import { prisma } from "@/lib/db";
import type { InvoiceInput } from "@/lib/validators/invoice";
import { formatDateOnly } from "@/lib/dates/parse";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: inv ? `Редактировать ${inv.number}` : "Счёт" };
}

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, clients, projects] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { order: "asc" } } },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, clientId: true },
    }),
  ]);

  if (!invoice) notFound();
  if (invoice.status !== "draft") {
    redirect(`/invoices/${invoice.id}`);
  }

  const issuedAt = formatDateOnly(invoice.issuedAt) ?? new Date().toISOString().slice(0, 10);

  const initial: InvoiceInput = {
    kind: invoice.kind,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    issuedAt,
    dueAt: formatDateOnly(invoice.dueAt),
    status: invoice.status,
    currency: "EUR",
    notes: invoice.notes,
    items: invoice.items.map((it) => ({
      title: it.title,
      description: it.description,
      qty: it.qty.toString(),
      unitPrice: it.unitPrice.toString(),
    })),
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`Редактировать — ${invoice.number}`}
          description="Редактировать можно только черновики. После «Отправлен» — заморожено."
        />
        <InvoiceForm
          mode="edit"
          id={invoice.id}
          initial={initial}
          clients={clients}
          projects={projects}
        />
      </div>
    </AppShell>
  );
}
