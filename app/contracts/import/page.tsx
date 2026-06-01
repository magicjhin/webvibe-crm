import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { ImportDocumentForm } from "@/components/forms/ImportDocumentForm";
import { prisma } from "@/lib/db";
import { PROJECT_TZ } from "@/lib/dates/parse";

export const metadata = { title: "Импорт договора" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ clientId?: string; projectId?: string }>;

export default async function ImportContractPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { clientId, projectId } = await searchParams;

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, clientId: true },
    }),
  ]);

  if (clients.length === 0) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6">
          <PageHeader title="Импорт договора" />
          <EmptyState
            icon={Users}
            title="Сначала нужен клиент"
            description="Создай клиента — потом сможешь привязать к нему импортированный договор."
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

  const issuedAt = formatInTimeZone(new Date(), PROJECT_TZ, "yyyy-MM-dd");

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Импорт договора"
          description="Загрузи готовый подписанный PDF и заполни поля. Создастся запись со статусом «подписан» — переподписывать не нужно. Номер вводишь свой."
        />
        <ImportDocumentForm
          docType="contract"
          clients={clients}
          projects={projects}
          initial={{ issuedAt, clientId, projectId: projectId ?? null }}
        />
      </div>
    </AppShell>
  );
}
