import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import {
  StagesChecklist,
} from "@/components/projects/StagesChecklist";
import { TasksInline, type TaskItem } from "@/components/projects/TasksInline";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { prisma } from "@/lib/db";
import {
  projectStagesSchema,
  PROJECT_LINK_KEYS,
  PROJECT_LINK_LABELS,
  type ProjectLinkKey,
  type ProjectStage,
} from "@/lib/validators/project";

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
  return { title: p?.title ?? "Проект" };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      tasks: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!project) notFound();

  // stages stored as Json — parse defensively so a stale schema doesn't crash the page.
  const stagesParsed = projectStagesSchema.safeParse(project.stages ?? []);
  const stages: ProjectStage[] = stagesParsed.success ? stagesParsed.data : [];

  // links are stored as Json record. Render only the well-known keys we have UI for.
  const linksObj =
    project.links && typeof project.links === "object" && !Array.isArray(project.links)
      ? (project.links as Record<string, unknown>)
      : {};
  const links = PROJECT_LINK_KEYS.flatMap((key): { key: ProjectLinkKey; url: string }[] => {
    const value = linksObj[key];
    return typeof value === "string" && value.length > 0 ? [{ key, url: value }] : [];
  });

  const tasks: TaskItem[] = project.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt,
    description: t.description,
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <ProjectHeader
          id={project.id}
          title={project.title}
          status={project.status}
          clientId={project.client.id}
          clientName={project.client.name}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Цена
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                <MoneyDisplay value={project.price} />
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Аванс: <MoneyDisplay value={project.advance} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Дедлайн
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                <DateDisplay date={project.deadlineAt} />
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Начало: <DateDisplay date={project.startedAt} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Параметры
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-foreground-muted">Тип:</span> {project.type}
              </p>
              <p>
                <span className="text-foreground-muted">Стек:</span>{" "}
                {project.stack ?? "—"}
              </p>
              <p>
                <span className="text-foreground-muted">Поддержка:</span>{" "}
                {project.hasMaintenance ? "да" : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {links.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Ссылки</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-2">
                {links.map(({ key, url }) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background-elevated px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
                    >
                      <span>{PROJECT_LINK_LABELS[key]}</span>
                      <span className="truncate font-mono text-foreground-subtle max-w-[260px]">
                        {url.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Этапы</CardTitle>
            </CardHeader>
            <CardContent>
              <StagesChecklist projectId={project.id} initialStages={stages} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Задачи</CardTitle>
            </CardHeader>
            <CardContent>
              <TasksInline projectId={project.id} initialTasks={tasks} />
            </CardContent>
          </Card>
        </div>

        {project.notes ? (
          <Card>
            <CardHeader>
              <CardTitle>Заметки</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-foreground-muted">
              {project.notes}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
