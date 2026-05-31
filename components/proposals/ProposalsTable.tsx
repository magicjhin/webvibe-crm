"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, MoreHorizontal, Plus, Search } from "lucide-react";

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
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import {
  ProposalStatusBadge,
  PROPOSAL_STATUS_LABEL,
} from "./ProposalStatusBadge";
import { deleteProposal } from "@/lib/actions/proposals";
import { PROPOSAL_STATUSES, type ProposalStatus } from "@/lib/validators/proposal";

export type ProposalRow = {
  id: string;
  number: string;
  title: string;
  status: ProposalStatus;
  clientId: string;
  clientName: string;
  validUntil: Date | null;
  total: string;
  createdAt: Date;
};

export function ProposalsTable({ rows }: { rows: ProposalRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProposalStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<ProposalRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.number.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const columns = useMemo<ColumnDef<ProposalRow>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Nr.",
        cell: ({ row }) => (
          <Link
            href={`/proposals/${row.original.id}`}
            className="font-mono font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.number}
          </Link>
        ),
      },
      {
        accessorKey: "title",
        header: "Название",
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
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
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => <ProposalStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "validUntil",
        header: "Galioja iki",
        cell: ({ row }) => <DateDisplay date={row.original.validUntil} />,
      },
      {
        accessorKey: "total",
        header: "Suma",
        cell: ({ row }) => (
          <span className="font-medium">
            <MoneyDisplay value={row.original.total} />
          </span>
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
                  aria-label={`Действия с ${row.original.number}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/proposals/${row.original.id}`}>Открыть</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={`/api/proposals/${row.original.id}/pdf?download=1`}
                    download={`${row.original.number}.pdf`}
                  >
                    Скачать PDF
                  </a>
                </DropdownMenuItem>
                {row.original.status === "draft" ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/proposals/${row.original.id}/edit`}>
                        Редактировать
                      </Link>
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
                  </>
                ) : null}
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
        icon={FileText}
        title="Пока нет КП"
        description="Создай первое коммерческое предложение. PDF на литовском, конверсия в проект."
        action={
          <Button asChild>
            <Link href="/proposals/new">
              <Plus className="size-4" />
              Создать КП
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
            placeholder="Поиск по номеру, названию, клиенту"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {PROPOSAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PROPOSAL_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(`/proposals/${r.id}`)}
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
        title="Удалить КП?"
        description={
          deleteTarget
            ? `${deleteTarget.number}. Удалять можно только черновики.`
            : undefined
        }
        action={async () => {
          if (!deleteTarget) return { ok: false, error: "Нет цели" };
          return deleteProposal(deleteTarget.id);
        }}
      />
    </div>
  );
}
