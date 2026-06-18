"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Edit, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/data/StatusBadge";
import { DeleteConfirm } from "@/components/data/DeleteConfirm";
import { deleteClient } from "@/lib/actions/clients";

export function ClientHeader({
  id,
  name,
  status,
  kind,
}: {
  id: string;
  name: string;
  status: "active" | "archived";
  kind: "individual" | "company";
}) {
  const router = useRouter();
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link href="/clients" className="hover:text-foreground">
            {t("title")}
          </Link>
          <span>/</span>
          <span>{t(kind === "company" ? "kindCompany" : "kindIndividual")}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <StatusBadge kind="client" value={status} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline">
          <Link href={`/clients/${id}/edit`}>
            <Edit className="size-4" />
            {tc("edit")}
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label={tc("moreActions")}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-[hsl(var(--danger))] focus:text-[hsl(var(--danger))]"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
            >
              {t("deleteMenu")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("deleteTitle")}
        description={t("deleteDescShort", { name })}
        action={() => deleteClient(id)}
        onSuccess={() => router.push("/clients")}
      />
    </header>
  );
}
