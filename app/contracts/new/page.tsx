import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { ContractForm } from "@/components/forms/ContractForm";
import { prisma } from "@/lib/db";
import { PROJECT_TZ } from "@/lib/dates/parse";
import { CONTRACT_KINDS, type ContractKind } from "@/lib/validators/contract";

export const metadata = { title: "Новый договор" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  clientId?: string;
  projectId?: string;
  kind?: string;
}>;

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { clientId, projectId, kind } = await searchParams;

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
          <PageHeader title="Новый договор" />
          <EmptyState
            icon={Users}
            title="Сначала нужен клиент"
            description="Создай клиента — потом сможешь оформить ему договор."
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
  const initialKind: ContractKind = CONTRACT_KINDS.includes(kind as ContractKind)
    ? (kind as ContractKind)
    : "STAGED";

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Новый договор"
          description="Выбери тип договора — форма подстроится. Номер (WVS000001) присвоится автоматически."
        />
        <ContractForm
          mode="create"
          clients={clients}
          projects={projects}
          initial={{
            kind: initialKind,
            clientId: clientId ?? undefined,
            projectId: projectId ?? null,
            issuedAt,
          }}
        />
      </div>
    </AppShell>
  );
}
