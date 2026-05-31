"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Edit, FolderPlus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProposalStatusBadge } from "./ProposalStatusBadge";
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import { deleteProposal, setProposalStatus } from "@/lib/actions/proposals";
import type { ProposalStatus } from "@/lib/validators/proposal";

export function ProposalHeader({
  id,
  number,
  status,
  clientName,
  projectId,
}: {
  id: string;
  number: string;
  status: ProposalStatus;
  clientName: string;
  projectId: string | null;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onStatusChange = (next: ProposalStatus) => {
    startTransition(async () => {
      const result = await setProposalStatus(id, next);
      if (!result.ok) toast.error(result.error);
      else toast.success("Статус обновлён");
    });
  };

  const canEdit = status === "draft";
  // draft → sent; sent → accepted/declined/revisions; revisions → sent/declined.
  const hasStatusActions = status === "draft" || status === "sent" || status === "revisions";

  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link href="/proposals" className="hover:text-foreground">
            КП
          </Link>
          <span>/</span>
          <span>{clientName}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{number}</h1>
          <ProposalStatusBadge status={status} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status === "accepted" ? (
          <Button asChild variant="default">
            {/* Convert-to-project wizard lands later; link prefilled with proposal context. */}
            <Link href={projectId ? `/projects/${projectId}` : `/projects/new?proposalId=${id}`}>
              <FolderPlus className="size-4" />
              {projectId ? "Открыть проект" : "Создать проект"}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <a href={`/api/proposals/${id}/pdf?download=1`} download={`${number}.pdf`}>
            <Download className="size-4" />
            PDF
          </a>
        </Button>
        {canEdit ? (
          <Button asChild variant="outline">
            <Link href={`/proposals/${id}/edit`}>
              <Edit className="size-4" />
              Редактировать
            </Link>
          </Button>
        ) : null}
        {hasStatusActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ещё действия">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === "draft" ? (
                <DropdownMenuItem disabled={isPending} onSelect={() => onStatusChange("sent")}>
                  Отметить как отправленное
                </DropdownMenuItem>
              ) : null}
              {status === "revisions" ? (
                <DropdownMenuItem disabled={isPending} onSelect={() => onStatusChange("sent")}>
                  Отправить повторно
                </DropdownMenuItem>
              ) : null}
              {status === "sent" || status === "revisions" ? (
                <>
                  {status === "sent" ? (
                    <DropdownMenuItem disabled={isPending} onSelect={() => onStatusChange("accepted")}>
                      Принято клиентом
                    </DropdownMenuItem>
                  ) : null}
                  {status === "sent" ? (
                    <DropdownMenuItem disabled={isPending} onSelect={() => onStatusChange("revisions")}>
                      Запрошены правки
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem disabled={isPending} onSelect={() => onStatusChange("declined")}>
                    Отклонено
                  </DropdownMenuItem>
                </>
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
        ) : null}
      </div>

      <DeleteConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Удалить КП?"
        description={`${number}. Удалять можно только черновики.`}
        action={() => deleteProposal(id)}
        onSuccess={() => router.push("/proposals")}
      />
    </header>
  );
}
