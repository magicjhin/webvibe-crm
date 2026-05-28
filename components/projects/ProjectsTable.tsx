"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FolderKanban, MoreHorizontal, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data/DataTable";
import { EmptyState } from "@/components/data/EmptyState";
import { StatusBadge } from "@/components/data/StatusBadge";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import { deleteProject } from "@/lib/actions/projects";
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from "@/lib/validators/project";

export type ProjectRow = {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  type: (typeof PROJECT_TYPES)[number];
  status: (typeof PROJECT_STATUSES)[number];
  price: string;
  deadlineAt: Date | null;
};

export function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectRow["status"]>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ProjectRow["type"]>("all");
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter, typeFilter]);

  const columns = useMemo<ColumnDef<ProjectRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Проект",
        cell: ({ row }) => (
          <Link
            href={`/projects/${row.original.id}`}
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: "clientName",
        header: "Клиент",
        cell: ({ row }) => (
          <Link
            href={`/clients/${row.original.clientId}`}
            className="text-foreground-muted hover:text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.clientName}
          </Link>
        ),
      },
      {
        accessorKey: "type",
        header: "Тип",
        cell: ({ row }) => (
          <span className="text-foreground-muted">{row.original.type}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => <StatusBadge kind="project" value={row.original.status} />,
      },
      {
        accessorKey: "price",
        header: "Цена",
        cell: ({ row }) => <MoneyDisplay value={row.original.price} />,
      },
      {
        accessorKey: "deadlineAt",
        header: "Дедлайн",
        cell: ({ row }) => <DateDisplay date={row.original.deadlineAt} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Действия с ${row.original.title}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${row.original.id}`}>Открыть</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${row.original.id}/edit`}>Редактировать</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[hsl(var(--danger))] focus:text-[hsl(var(--danger))]"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDeleteTarget(row.original);
                  }}
                >
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Пока нет проектов"
        description="Создай первый проект для одного из клиентов."
        action={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              Создать проект
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или клиенту"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {PROJECT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(`/projects/${r.id}`)}
        empty={
          <div className="px-6 py-10 text-center text-sm text-foreground-muted">
            Ничего не найдено по фильтрам
          </div>
        }
      />

      <DeleteConfirm
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Удалить проект?"
        description={
          deleteTarget
            ? `${deleteTarget.title}. Tasks удалятся каскадно. Если есть привязанные документы — операция будет отклонена.`
            : undefined
        }
        action={async () => {
          if (!deleteTarget) return { ok: false, error: "Нет цели" };
          return deleteProject(deleteTarget.id);
        }}
      />
    </div>
  );
}
