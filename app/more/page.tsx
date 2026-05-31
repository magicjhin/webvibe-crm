import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { NAV, MOBILE_TABS } from "@/components/layout/nav-items";

export const metadata = { title: "Ещё" };

export default function MorePage() {
  // Show everything not already reachable from the bottom tab bar.
  const tabHrefs = new Set(MOBILE_TABS.map((t) => t.href));
  const items = NAV.filter((item) => !tabHrefs.has(item.href));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader title="Ещё" description="Дополнительные разделы CRM." />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex flex-col items-start gap-2 rounded-lg border border-border bg-background-elevated p-4 transition-colors hover:border-foreground-subtle"
              >
                <item.icon className="size-5 text-foreground-muted" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
