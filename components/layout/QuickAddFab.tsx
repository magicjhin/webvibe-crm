"use client";

import Link from "next/link";
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
  { href: "/clients/new", label: "Новый клиент", icon: Users },
  { href: "/projects/new", label: "Новый проект", icon: FolderKanban },
  { href: "/invoices/new", label: "Новый счёт", icon: FileText },
  { href: "/payments/new", label: "Новый платёж", icon: Wallet },
  { href: "/expenses/new", label: "Новый расход", icon: Receipt },
];

export function QuickAddFab() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Быстрое создание"
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
          Быстрое создание
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ITEMS.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="cursor-pointer">
              <item.icon className="size-4" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
