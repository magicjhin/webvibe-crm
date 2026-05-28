"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Paperclip, Plus, Receipt, Search } from "lucide-react";

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
import { deleteExpense } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/validators/expense";

export type ExpenseRow = {
  id: string;
  occurredAt: Date;
  category: (typeof EXPENSE_CATEGORIES)[number];
  vendor: string | null;
  description: string;
  amount: string;
  fileUrl: string | null;
  recurring: boolean;
};

const CATEGORY_LABEL: Record<ExpenseRow["category"], string> = {
  ai_tools: "AI-инструменты",
  hosting: "Хостинг",
  domains: "Домены",
  software: "Софт",
  hardware: "Железо",
  ads: "Реклама",
  transport: "Транспорт",
  other: "Другое",
};

export function ExpensesTable({ rows }: { rows: ExpenseRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<"all" | ExpenseRow["category"]>("all");
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.description.toLowerCase().includes(q) ||
        (r.vendor?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, categoryFilter]);

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(
    () => [
      {
        accessorKey: "occurredAt",
        header: "Дата",
        cell: ({ row }) => <DateDisplay date={row.original.occurredAt} />,
      },
      {
        accessorKey: "category",
        header: "Категория",
        cell: ({ row }) => (
          <span className="text-xs text-foreground-muted">
            {CATEGORY_LABEL[row.original.category]}
          </span>
        ),
      },
      {
        accessorKey: "vendor",
        header: "Поставщик",
        cell: ({ row }) =>
          row.original.vendor ? (
            <span className="text-sm">{row.original.vendor}</span>
          ) : (
            <span className="text-xs text-foreground-subtle">—</span>
          ),
      },
      {
        accessorKey: "description",
        header: "Описание",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.description}
            {row.original.recurring ? (
              <span className="ml-2 inline-flex rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-foreground-muted">
                regular
              </span>
            ) : null}
          </span>
        ),
      },
      {
        id: "file",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.fileUrl ? (
            <a
              href={row.original.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground-muted hover:text-foreground"
              aria-label="Открыть чек"
              onClick={(e) => e.stopPropagation()}
            >
              <Paperclip className="size-4" />
            </a>
          ) : null,
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
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Действия">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/expenses/${row.original.id}/edit`}>
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
        icon={Receipt}
        title="Расходов пока нет"
        description="Записывай сюда подписки на AI, хостинг, рекламу — всё, что относится к работе."
        action={
          <Button asChild>
            <Link href="/expenses/new">
              <Plus className="size-4" />
              Добавить расход
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
            placeholder="Поиск по описанию или поставщику"
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(`/expenses/${r.id}/edit`)}
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
        title="Удалить расход?"
        description={
          deleteTarget
            ? `${deleteTarget.description} — ${Number(deleteTarget.amount).toFixed(2)} EUR. Если есть файл-чек, он тоже будет удалён.`
            : undefined
        }
        action={async () => {
          if (!deleteTarget) return { ok: false, error: "Нет цели" };
          return deleteExpense(deleteTarget.id);
        }}
      />
    </div>
  );
}
