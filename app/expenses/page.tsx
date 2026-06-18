import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  ExpensesTable,
  type ExpenseRow,
} from "@/components/expenses/ExpensesTable";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("pages.expenses");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const t = await getTranslations("pages.expenses");
  const expenses = await prisma.expense.findMany({
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    occurredAt: e.occurredAt,
    category: e.category,
    vendor: e.vendor,
    description: e.description,
    amount: e.amount.toString(),
    fileUrl: e.fileUrl,
    recurring: e.recurring,
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <Button asChild>
              <Link href="/expenses/new">
                <Plus className="size-4" />
                {t("action")}
              </Link>
            </Button>
          }
        />
        <ExpensesTable rows={rows} />
      </div>
    </AppShell>
  );
}
