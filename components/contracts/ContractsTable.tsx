"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { FileSignature, MoreHorizontal, Plus, Search } from "lucide-react";

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
import { ContractStatusBadge } from "./ContractStatusBadge";
import { ContractKindBadge } from "./ContractKindBadge";
import { deleteContract } from "@/lib/actions/contracts";
import {
  CONTRACT_KINDS,
  CONTRACT_STATUSES,
  type ContractKind,
  type ContractStatus,
} from "@/lib/validators/contract";

export type ContractRow = {
  id: string;
  number: string;
  kind: ContractKind;
  status: ContractStatus;
  clientId: string;
  clientName: string;
  projectTitle: string | null;
  issuedAt: Date;
  amount: string;
  /** Импортированный договор (загруженный PDF) — Word недоступен. */
  isImported?: boolean;
};

export function ContractsTable({ rows }: { rows: ContractRow[] }) {
  const router = useRouter();
  const t = useTranslations("contracts");
  const tc = useTranslations("common");
  const tStatus = useTranslations("docStatus.contract");
  const tKind = useTranslations("docStatus.contractKind");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
  const [kindFilter, setKindFilter] = useState<"all" | ContractKind>("all");
  const [deleteTarget, setDeleteTarget] = useState<ContractRow | null>(null);

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

  const columns = useMemo<ColumnDef<ContractRow>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Nr.",
        cell: ({ row }) => (
          <Link
            href={`/contracts/${row.original.id}`}
            className="font-mono font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.number}
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
        accessorKey: "kind",
        header: t("colKind"),
        cell: ({ row }) => <ContractKindBadge kind={row.original.kind} />,
      },
      {
        accessorKey: "status",
        header: t("colStatus"),
        cell: ({ row }) => <ContractStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "issuedAt",
        header: "Data",
        cell: ({ row }) => <DateDisplay date={row.original.issuedAt} />,
      },
      {
        accessorKey: "amount",
        header: "Suma",
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={tc("actionsFor", { name: row.original.number })}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/contracts/${row.original.id}`}>{tc("open")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={`/api/contracts/${row.original.id}/pdf?download=1`}
                    download={`${row.original.number}.pdf`}
                  >
                    {t("downloadPdf")}
                  </a>
                </DropdownMenuItem>
                {!row.original.isImported ? (
                  <DropdownMenuItem asChild>
                    <a
                      href={`/api/contracts/${row.original.id}/docx`}
                      download={`${row.original.number}.docx`}
                    >
                      {t("downloadWord")}
                    </a>
                  </DropdownMenuItem>
                ) : null}
                {row.original.status === "draft" || row.original.status === "sent" ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/contracts/${row.original.id}/edit`}>
                        {tc("edit")}
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
                      {tc("delete")}
                    </DropdownMenuItem>
                  </>
                ) : null}
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
        icon={FileSignature}
        title={t("emptyTitle")}
        description={t("emptyDesc")}
        action={
          <Button asChild>
            <Link href="/contracts/new">
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
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {CONTRACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={kindFilter}
          onValueChange={(v) => setKindFilter(v as typeof kindFilter)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allKinds")}</SelectItem>
            {CONTRACT_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {tKind(k)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(`/contracts/${r.id}`)}
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
            ? t("deleteDesc", { number: deleteTarget.number })
            : undefined
        }
        action={async () => {
          if (!deleteTarget) return { ok: false, error: tc("noTarget") };
          return deleteContract(deleteTarget.id);
        }}
      />
    </div>
  );
}
