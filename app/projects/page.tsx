import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  ProjectsTable,
  type ProjectRow,
} from "@/components/projects/ProjectsTable";
import { prisma } from "@/lib/db";

export const metadata = { title: "Проекты" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true } } },
  });

  const rows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    clientId: p.clientId,
    clientName: p.client.name,
    type: p.type,
    status: p.status,
    price: p.price.toString(),
    deadlineAt: p.deadlineAt,
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Проекты"
          description="Все проекты по всем клиентам. Tasks хранятся внутри карточки проекта."
          actions={
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="size-4" />
                Новый проект
              </Link>
            </Button>
          }
        />
        <ProjectsTable rows={rows} />
      </div>
    </AppShell>
  );
}
