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
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import { deleteInvoice, setInvoiceStatus } from "@/lib/actions/invoices";

type Status = "draft" | "sent" | "paid" | "cancelled";

export function InvoiceHeader({
  id,
  number,
  status,
  dueAt,
  clientName,
}: {
  id: string;
  number: string;
  status: Status;
  dueAt: Date | null;
  clientName: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onStatusChange = (next: Status) => {
    startTransition(async () => {
      const result = await setInvoiceStatus(id, next);
      if (!result.ok) toast.error(result.error);
      else toast.success("Статус обновлён");
    });
  };

  const canEdit = status === "draft";

  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link href="/invoices" className="hover:text-foreground">
            Счета
          </Link>
          <span>/</span>
          <span>{clientName}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{number}</h1>
          <InvoiceStatusBadge status={status} dueAt={dueAt} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline">
          <a
            href={`/api/invoices/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="size-4" />
            PDF
          </a>
        </Button>
        {canEdit ? (
          <Button asChild variant="outline">
            <Link href={`/invoices/${id}/edit`}>
              <Edit className="size-4" />
              Редактировать
            </Link>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Ещё действия">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Allowed transitions: draft → sent/paid/cancelled, sent → paid/cancelled, paid → cancelled. Cancelled is terminal. */}
            {status === "draft" ? (
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => onStatusChange("sent")}
              >
                Отметить как отправленный
              </DropdownMenuItem>
            ) : null}
            {(status === "draft" || status === "sent") ? (
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => onStatusChange("paid")}
              >
                Отметить как оплаченный
              </DropdownMenuItem>
            ) : null}
            {status !== "cancelled" ? (
              <DropdownMenuItem
                disabled={isPending}
                onSelect={() => onStatusChange("cancelled")}
              >
                {status === "paid" ? "Отменить (refund)" : "Отменить"}
              </DropdownMenuItem>
            ) : null}
            {status === "draft" ? (
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
      </div>

      <DeleteConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Удалить счёт?"
        description={`${number}. Удалять можно только черновики.`}
        action={() => deleteInvoice(id)}
        onSuccess={() => router.push("/invoices")}
      />
    </header>
  );
}
