"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/data/StatusBadge";
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import { deleteProject } from "@/lib/actions/projects";

export function ProjectHeader({
  id,
  title,
  status,
  clientId,
  clientName,
}: {
  id: string;
  title: string;
  status: string;
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link href="/projects" className="hover:text-foreground">
            Проекты
          </Link>
          <span>/</span>
          <Link href={`/clients/${clientId}`} className="hover:text-foreground">
            {clientName}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <StatusBadge kind="project" value={status} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline">
          <Link href={`/projects/${id}/edit`}>
            <Edit className="size-4" />
            Редактировать
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Ещё действия">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-[hsl(var(--danger))] focus:text-[hsl(var(--danger))]"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
            >
              Удалить проект
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Удалить проект?"
        description={`${title}. Tasks удалятся каскадно.`}
        action={() => deleteProject(id)}
        onSuccess={() => router.push("/projects")}
      />
    </header>
  );
}
