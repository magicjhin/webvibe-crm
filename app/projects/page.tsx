import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  ProjectsTable,
  type ProjectRow,
} from "@/components/projects/ProjectsTable";
import { prisma } from "@/lib/db";

export async function generateMetadata() {
  const t = await getTranslations("pages.projects");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const t = await getTranslations("pages.projects");
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
          title={t("title")}
          description={t("description")}
          actions={
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="size-4" />
                {t("action")}
              </Link>
            </Button>
          }
        />
        <ProjectsTable rows={rows} />
      </div>
    </AppShell>
  );
}
