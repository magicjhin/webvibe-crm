import Link from "next/link";
import { Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { PaymentForm } from "@/components/forms/PaymentForm";
import { prisma } from "@/lib/db";

export const metadata = { title: "Новый платёж" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  clientId?: string;
  projectId?: string;
  invoiceId?: string;
}>;

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { clientId, projectId, invoiceId } = await searchParams;

  const [clients, projects, invoices] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, clientId: true },
    }),
    prisma.invoice.findMany({
      // Payments допустимы только к sent/paid (draft ещё редактируем, поэтому
      // привязка к нему может оставить Payment с устаревшим клиентом/проектом).
      // Cancelled тоже исключаем — для них нет смысла регистрировать платёж.
      where: { status: { in: ["sent", "paid"] } },
      orderBy: [{ issuedAt: "desc" }, { number: "desc" }],
      include: {
        payments: { select: { amount: true } },
      },
    }),
  ]);

  if (clients.length === 0) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          <PageHeader title="Новый платёж" />
          <EmptyState
            icon={Users}
            title="Сначала нужен клиент"
            description="Создай клиента — потом сможешь зарегистрировать платёж от него."
            action={
              <Button asChild>
                <Link href="/clients/new">Создать клиента</Link>
              </Button>
            }
          />
        </div>
      </AppShell>
    );
  }

  const invoiceOptions = invoices.map((i) => {
    const paid = i.payments.reduce<number>(
      (sum, p) => sum + Number(p.amount.toString()),
      0,
    );
    return {
      id: i.id,
      number: i.number,
      clientId: i.clientId,
      projectId: i.projectId,
      total: i.total.toString(),
      paid: paid.toFixed(2),
    };
  });

  // Pre-fill: if invoiceId provided, sync client/project from it
  let initialClientId = clientId;
  let initialProjectId = projectId ?? null;
  if (invoiceId) {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      initialClientId = inv.clientId;
      initialProjectId = inv.projectId;
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Новый платёж"
          description="Если платёж по конкретному счёту — выбери его, сумма подставится автоматически."
        />
        <PaymentForm
          clients={clients}
          projects={projects}
          invoices={invoiceOptions}
          initial={{
            clientId: initialClientId,
            projectId: initialProjectId,
            invoiceId: invoiceId ?? null,
          }}
        />
      </div>
    </AppShell>
  );
}
