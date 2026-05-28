import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { prisma } from "@/lib/db";
import type { ProjectInput } from "@/lib/validators/project";
import { formatDateOnly } from "@/lib/dates/parse";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await prisma.project.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: p ? `Редактировать — ${p.title}` : "Проект" };
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, clients] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!project) notFound();

  const initial: ProjectInput = {
    title: project.title,
    clientId: project.clientId,
    type: project.type,
    stack: project.stack,
    status: project.status,
    price: project.price.toString(),
    advance: project.advance.toString(),
    currency: "EUR",
    startedAt: formatDateOnly(project.startedAt),
    deadlineAt: formatDateOnly(project.deadlineAt),
    completedAt: formatDateOnly(project.completedAt),
    links: (project.links && typeof project.links === "object" && !Array.isArray(project.links)
      ? project.links
      : {}) as ProjectInput["links"],
    hasMaintenance: project.hasMaintenance,
    notes: project.notes,
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader title={`Редактировать — ${project.title}`} />
        <ProjectForm mode="edit" id={project.id} initial={initial} clients={clients} />
      </div>
    </AppShell>
  );
}
