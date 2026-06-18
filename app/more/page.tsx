import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NAV, MOBILE_TABS } from "@/components/layout/nav-items";

export async function generateMetadata() {
  const t = await getTranslations("more");
  return { title: t("title") };
}

export default async function MorePage() {
  const t = await getTranslations("more");
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  // Show everything not already reachable from the bottom tab bar.
  const tabHrefs = new Set(MOBILE_TABS.map((tab) => tab.href));
  const items = NAV.filter((item) => !tabHrefs.has(item.href));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("description")} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex flex-col items-start gap-2 rounded-lg border border-border bg-background-elevated p-4 transition-colors hover:border-foreground-subtle"
              >
                <item.icon className="size-5 text-foreground-muted" />
                <span className="text-sm font-medium">{tNav(item.key)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background-elevated p-4">
          <span className="text-sm font-medium">{tCommon("language")}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </AppShell>
  );
}
