"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Search, UserPlus, Users } from "lucide-react";

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
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import { deleteClient } from "@/lib/actions/clients";

export type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  kind: "individual" | "company";
  status: "active" | "archived";
  projectsCount: number;
  createdAt: Date;
};

const KIND_LABEL: Record<ClientRow["kind"], string> = {
  individual: "Физлицо",
  company: "Компания",
};

export function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ClientRow["status"]>(
    "all",
  );
  const [kindFilter, setKindFilter] = useState<"all" | ClientRow["kind"]>("all");
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        (r.phone?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, statusFilter, kindFilter]);

  const columns = useMemo<ColumnDef<ClientRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Имя",
        cell: ({ row }) => (
          <Link
            href={`/clients/${row.original.id}`}
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "kind",
        header: "Тип",
        cell: ({ row }) => (
          <span className="text-foreground-muted">{KIND_LABEL[row.original.kind]}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => <StatusBadge kind="client" value={row.original.status} />,
      },
      {
        accessorKey: "email",
        header: "Контакты",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col text-xs text-foreground-muted">
            <span>{row.original.email ?? "—"}</span>
            <span>{row.original.phone ?? ""}</span>
          </div>
        ),
      },
      {
        accessorKey: "projectsCount",
        header: "Проектов",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.projectsCount}</span>
        ),
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
                  aria-label={`Действия с ${row.original.name}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${row.original.id}`}>Открыть</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${row.original.id}/edit`}>Редактировать</Link>
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
        icon={Users}
        title="Пока нет клиентов"
        description="Добавь первого клиента — потом сможешь создавать для него проекты, КП и счета."
        action={
          <Button asChild>
            <Link href="/clients/new">
              <UserPlus className="size-4" />
              Добавить первого клиента
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
            placeholder="Поиск по имени, email, телефону"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="archived">В архиве</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={kindFilter}
          onValueChange={(v) => setKindFilter(v as typeof kindFilter)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="individual">Физлица</SelectItem>
            <SelectItem value="company">Компании</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="size-4" />
            Новый клиент
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(`/clients/${r.id}`)}
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
        title="Удалить клиента?"
        description={
          deleteTarget
            ? `${deleteTarget.name}. Действие нельзя отменить. Если есть привязанные проекты — удаление будет отклонено.`
            : undefined
        }
        action={async () => {
          if (!deleteTarget) return { ok: false, error: "Нет цели" };
          return deleteClient(deleteTarget.id);
        }}
      />
    </div>
  );
}
