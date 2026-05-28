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
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { deleteInvoice } from "@/lib/actions/invoices";
import {
  INVOICE_KINDS,
  INVOICE_STATUSES,
} from "@/lib/validators/invoice";

export type InvoiceRow = {
  id: string;
  number: string;
  kind: (typeof INVOICE_KINDS)[number];
  status: (typeof INVOICE_STATUSES)[number];
  clientId: string;
  clientName: string;
  projectTitle: string | null;
  issuedAt: Date;
  dueAt: Date | null;
  total: string;
};

const KIND_LABEL: Record<InvoiceRow["kind"], string> = {
  advance: "Аванс",
  final: "Остаток",
  full: "Полная",
  maintenance: "Поддержка",
};

export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceRow["status"]>("all");
  const [kindFilter, setKindFilter] = useState<"all" | InvoiceRow["kind"]>("all");
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        r.number.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        (r.projectTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, statusFilter, kindFilter]);

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Nr.",
        cell: ({ row }) => (
          <Link
            href={`/invoices/${row.original.id}`}
            className="font-mono font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.number}
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
        accessorKey: "kind",
        header: "Тип",
        cell: ({ row }) => (
          <span className="text-foreground-muted text-xs">
            {KIND_LABEL[row.original.kind]}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => (
          <InvoiceStatusBadge
            status={row.original.status}
            dueAt={row.original.dueAt}
          />
        ),
      },
      {
        accessorKey: "issuedAt",
        header: "Išrašyta",
        cell: ({ row }) => <DateDisplay date={row.original.issuedAt} />,
      },
      {
        accessorKey: "dueAt",
        header: "Apmokėti iki",
        cell: ({ row }) => <DateDisplay date={row.original.dueAt} />,
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
                  <Link href={`/invoices/${row.original.id}`}>Открыть</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={`/api/invoices/${row.original.id}/pdf?download=1`}
                    download={`${row.original.number}.pdf`}
                  >
                    Скачать PDF
                  </a>
                </DropdownMenuItem>
                {row.original.status === "draft" ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/invoices/${row.original.id}/edit`}>
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
        title="Пока нет счетов"
        description="Создай первый счёт. PDF сгенерируется автоматически по твоим реквизитам."
        action={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="size-4" />
              Создать счёт
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
            placeholder="Поиск по номеру, клиенту, проекту"
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
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
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
            {INVOICE_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(`/invoices/${r.id}`)}
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
        title="Удалить счёт?"
        description={
          deleteTarget
            ? `${deleteTarget.number}. Удалять можно только черновики.`
            : undefined
        }
        action={async () => {
          if (!deleteTarget) return { ok: false, error: "Нет цели" };
          return deleteInvoice(deleteTarget.id);
        }}
      />
    </div>
  );
}
