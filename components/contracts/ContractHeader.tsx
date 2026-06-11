"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Edit, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContractStatusBadge } from "./ContractStatusBadge";
import { SharePdfButton } from "@/components/common/SharePdfButton";
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import { deleteContract, setContractStatus } from "@/lib/actions/contracts";
import type { ContractStatus } from "@/lib/validators/contract";

export function ContractHeader({
  id,
  number,
  status,
  clientName,
}: {
  id: string;
  number: string;
  status: ContractStatus;
  clientName: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onStatusChange = (next: ContractStatus) => {
    startTransition(async () => {
      const result = await setContractStatus(id, next);
      if (!result.ok) toast.error(result.error);
      else toast.success("Статус обновлён");
    });
  };

  // Редактировать/удалять можно, пока договор не подписан (draft/sent).
  // signed — подпись клиента неприкосновенна, cancelled — terminal: заморожены.
  const canEdit = status === "draft" || status === "sent";

  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link href="/contracts" className="hover:text-foreground">
            Договора
          </Link>
          <span>/</span>
          <span>{clientName}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{number}</h1>
          <ContractStatusBadge status={status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Button asChild variant="outline">
          <a href={`/api/contracts/${id}/pdf?download=1`} download={`${number}.pdf`}>
            <Download className="size-4" />
            PDF
          </a>
        </Button>
        <SharePdfButton url={`/api/contracts/${id}/pdf?download=1`} filename={`${number}.pdf`} />
        {canEdit ? (
          <Button asChild variant="outline">
            <Link href={`/contracts/${id}/edit`}>
              <Edit className="size-4" />
              Редактировать
            </Link>
          </Button>
        ) : null}
        {status === "draft" || status === "sent" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ещё действия">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* draft → sent/cancelled, sent → cancelled. signed/cancelled terminal. */}
              {status === "draft" ? (
                <DropdownMenuItem
                  disabled={isPending}
                  onSelect={() => onStatusChange("sent")}
                >
                  Отметить как отправленный
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => onStatusChange("cancelled")}
              >
                Отменить
              </DropdownMenuItem>
              {canEdit ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[hsl(var(--danger))] focus:text-[hsl(var(--danger))]"
                    onSelect={(e) => {
                      e.preventDefault();
                      setConfirmOpen(true);
                    }}
                  >
                    Удалить
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <DeleteConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Удалить договор?"
        description={`${number}. Удалить можно черновик или отправленный (не подписанный) договор.`}
        action={() => deleteContract(id)}
        onSuccess={() => router.push("/contracts")}
      />
    </header>
  );
}
