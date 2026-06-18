"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("projectsTable");
  const tc = useTranslations("common");
  const tStatus = useTranslations("status");
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
        header: t("colTitle"),
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
        header: t("colClient"),
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
        header: t("colType"),
        cell: ({ row }) => (
          <span className="text-foreground-muted">{row.original.type}</span>
        ),
      },
      {
        accessorKey: "status",
        header: t("colStatus"),
        cell: ({ row }) => <StatusBadge kind="project" value={row.original.status} />,
      },
      {
        accessorKey: "price",
        header: t("colPrice"),
        cell: ({ row }) => <MoneyDisplay value={row.original.price} />,
      },
      {
        accessorKey: "deadlineAt",
        header: t("colDeadline"),
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
                  aria-label={tc("actionsFor", { name: row.original.title })}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${row.original.id}`}>{tc("open")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${row.original.id}/edit`}>{tc("edit")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[hsl(var(--danger))] focus:text-[hsl(var(--danger))]"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDeleteTarget(row.original);
                  }}
                >
                  {tc("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [t, tc],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={t("emptyTitle")}
        description={t("emptyDesc")}
        action={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              {t("createCta")}
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
            placeholder={t("searchPlaceholder")}
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
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(`project.${s}`)}
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
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            {PROJECT_TYPES.map((pt) => (
              <SelectItem key={pt} value={pt}>
                {pt}
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
            {tc("notFoundByFilters")}
          </div>
        }
      />

      <DeleteConfirm
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title={t("deleteTitle")}
        description={
          deleteTarget
            ? t("deleteDesc", { title: deleteTarget.title })
            : undefined
        }
        action={async () => {
          if (!deleteTarget) return { ok: false, error: tc("noTarget") };
          return deleteProject(deleteTarget.id);
        }}
      />
    </div>
  );
}
