import Link from "next/link";
import { Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { ProposalForm } from "@/components/forms/ProposalForm";
import { prisma } from "@/lib/db";

export const metadata = { title: "Новое КП" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ clientId?: string; projectId?: string }>;

export default async function NewProposalPage({
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
          <PageHeader title="Новое КП" />
          <EmptyState
            icon={Users}
            title="Сначала нужен клиент"
            description="Создай клиента — потом сможешь подготовить ему КП."
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

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Новое КП"
          description="Номер (WVP-001) присвоится автоматически. PDF доступен на карточке."
        />
        <ProposalForm
          mode="create"
          clients={clients}
          projects={projects}
          initial={{
            clientId: clientId ?? undefined,
            projectId: projectId ?? null,
          }}
        />
      </div>
    </AppShell>
  );
}
