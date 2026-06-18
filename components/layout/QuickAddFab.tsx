"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  FileText,
  FolderKanban,
  Plus,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS = [
  { href: "/clients/new", key: "newClient", icon: Users },
  { href: "/projects/new", key: "newProject", icon: FolderKanban },
  { href: "/invoices/new", key: "newInvoice", icon: FileText },
  { href: "/payments/new", key: "newPayment", icon: Wallet },
  { href: "/expenses/new", key: "newExpense", icon: Receipt },
] as const;

export function QuickAddFab() {
  const t = useTranslations("quickAdd");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("title")}
          className="fixed bottom-20 right-4 z-40 inline-flex size-14 items-center justify-center rounded-full text-white shadow-lg bg-accent-gradient active:scale-95 sm:hidden"
        >
          <Plus className="size-6" strokeWidth={2.25} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={12}
        className="min-w-[220px]"
      >
        <DropdownMenuLabel className="text-xs text-foreground-muted">
          {t("title")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ITEMS.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="cursor-pointer">
              <item.icon className="size-4" />
              {t(item.key)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
