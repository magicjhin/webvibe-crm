import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { InvoiceForm } from "@/components/forms/InvoiceForm";
import { prisma } from "@/lib/db";
import { PROJECT_TZ } from "@/lib/dates/parse";

export const metadata = { title: "Новый счёт" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ clientId?: string; projectId?: string }>;

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { clientId, projectId } = await searchParams;

  const [clients, projects, settings] = await Promise.all([
    prisma.client.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, clientId: true },
    }),
    prisma.settings.findUnique({
      where: { id: 1 },
      select: { defaultPaymentDays: true },
    }),
  ]);

  if (clients.length === 0) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          <PageHeader title="Новый счёт" />
          <EmptyState
            icon={Users}
            title="Сначала нужен клиент"
            description="Создай клиента — потом сможешь выставить ему счёт."
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

  // Date-only defaults в проектной TZ (Europe/Vilnius), чтобы около полуночи
  // не показать клиенту вчерашний/завтрашний день.
  const issuedAt = formatInTimeZone(new Date(), PROJECT_TZ, "yyyy-MM-dd");
  const paymentDays = settings?.defaultPaymentDays ?? 1;
  // Add days в проектной TZ: безопаснее всего пройти через ISO-only арифметику.
  const [y, m, d] = issuedAt.split("-").map(Number) as [number, number, number];
  const due = new Date(Date.UTC(y, m - 1, d));
  due.setUTCDate(due.getUTCDate() + paymentDays);
  const dueAt = `${due.getUTCFullYear()}-${String(due.getUTCMonth() + 1).padStart(2, "0")}-${String(due.getUTCDate()).padStart(2, "0")}`;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Новый счёт"
          description="После создания счёт получит номер автоматически. PDF доступен для скачивания на карточке."
        />
        <InvoiceForm
          mode="create"
          clients={clients}
          projects={projects}
          initial={{
            clientId: clientId ?? undefined,
            projectId: projectId ?? null,
            issuedAt,
            dueAt,
          }}
        />
      </div>
    </AppShell>
  );
}
