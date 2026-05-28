"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Search, Wallet } from "lucide-react";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data/DataTable";
import { EmptyState } from "@/components/data/EmptyState";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import { deletePayment } from "@/lib/actions/payments";
import { PAYMENT_KINDS } from "@/lib/validators/payment";

export type PaymentRow = {
  id: string;
  paidAt: Date;
  kind: (typeof PAYMENT_KINDS)[number];
  amount: string;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectTitle: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  note: string | null;
};

const KIND_LABEL: Record<PaymentRow["kind"], string> = {
  advance: "Аванс",
  final: "Остаток",
  full: "Полная",
  maintenance: "Поддержка",
  other: "Другое",
};

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | PaymentRow["kind"]>("all");
  const [deleteTarget, setDeleteTarget] = useState<PaymentRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        r.clientName.toLowerCase().includes(q) ||
        (r.projectTitle?.toLowerCase().includes(q) ?? false) ||
        (r.invoiceNumber?.toLowerCase().includes(q) ?? false) ||
        (r.note?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, kindFilter]);

  const columns = useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        accessorKey: "paidAt",
        header: "Дата",
        cell: ({ row }) => <DateDisplay date={row.original.paidAt} />,
      },
      {
        accessorKey: "clientName",
        header: "Клиент",
        cell: ({ row }) => (
          <Link
            href={`/clients/${row.original.clientId}`}
            className="hover:underline"
          >
            {row.original.clientName}
          </Link>
        ),
      },
      {
        accessorKey: "invoiceNumber",
        header: "Счёт",
        cell: ({ row }) =>
          row.original.invoiceId && row.original.invoiceNumber ? (
            <Link
              href={`/invoices/${row.original.invoiceId}`}
              className="font-mono text-xs hover:underline"
            >
              {row.original.invoiceNumber}
            </Link>
          ) : (
            <span className="text-xs text-foreground-subtle">—</span>
          ),
      },
      {
        accessorKey: "projectTitle",
        header: "Проект",
        cell: ({ row }) =>
          row.original.projectId && row.original.projectTitle ? (
            <Link
              href={`/projects/${row.original.projectId}`}
              className="text-foreground-muted hover:text-foreground hover:underline"
            >
              {row.original.projectTitle}
            </Link>
          ) : (
            <span className="text-xs text-foreground-subtle">—</span>
          ),
      },
      {
        accessorKey: "kind",
        header: "Тип",
        cell: ({ row }) => (
          <span className="text-xs text-foreground-muted">
            {KIND_LABEL[row.original.kind]}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Сумма",
        cell: ({ row }) => (
          <span className="font-medium">
            <MoneyDisplay value={row.original.amount} />
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Действия">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
        icon={Wallet}
        title="Платежей пока нет"
        description="Когда поступит оплата от клиента — добавь её сюда. Можно привязать к конкретному счёту."
        action={
          <Button asChild>
            <Link href="/payments/new">
              <Plus className="size-4" />
              Добавить платёж
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
            placeholder="Поиск по клиенту, счёту, проекту, заметке"
            className="pl-9"
          />
        </div>
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {PAYMENT_KINDS.map((k) => (
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
        title="Удалить платёж?"
        description={
          deleteTarget
            ? `${deleteTarget.clientName} — ${Number(deleteTarget.amount).toFixed(2)} EUR. Действие необратимо.`
            : undefined
        }
        action={async () => {
          if (!deleteTarget) return { ok: false, error: "Нет цели" };
          return deletePayment(deleteTarget.id);
        }}
      />
    </div>
  );
}
