import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { prisma } from "@/lib/db";
import { Users } from "lucide-react";

export const metadata = { title: "Новый проект" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ clientId?: string }>;

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { clientId } = await searchParams;

  const clients = await prisma.client.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Новый проект"
          description="Привязка к клиенту обязательна. Этапы и задачи добавишь в карточке проекта."
        />
        {clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Сначала нужен клиент"
            description="Создай клиента, потом сможешь привязать к нему проект."
            action={
              <Button asChild>
                <Link href="/clients/new">Создать клиента</Link>
              </Button>
            }
          />
        ) : (
          <ProjectForm
            mode="create"
            clients={clients}
            initial={clientId ? { clientId } : undefined}
          />
        )}
      </div>
    </AppShell>
  );
}
