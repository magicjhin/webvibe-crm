"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { NAV } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Открыть меню"
          className="inline-flex size-11 items-center justify-center rounded-md text-foreground-muted hover:bg-secondary hover:text-foreground md:hidden"
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[280px] gap-0 border-r border-border bg-sidebar p-0"
      >
        <SheetHeader className="flex h-[60px] flex-row items-center justify-between border-b border-border px-5">
          <SheetTitle className="text-base font-semibold tracking-tight">
            <span className="text-accent-gradient">webvibe</span>
            <span className="text-foreground-muted"> / CRM</span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Главное меню навигации
          </SheetDescription>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="Закрыть меню"
              className="inline-flex size-9 items-center justify-center rounded-md text-foreground-muted hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </SheetClose>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-foreground"
                        : "text-foreground-muted hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0 opacity-70 group-hover:opacity-100" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-border px-5 py-3 text-xs text-foreground-subtle">
          v0.1.0 · iter 3
        </div>
      </SheetContent>
    </Sheet>
  );
}
