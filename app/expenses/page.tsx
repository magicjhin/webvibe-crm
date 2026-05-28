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

export const metadata = { title: "Расходы" };
export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
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
          title="Расходы"
          description="Подписки, инструменты, реклама — всё, что относится к работе."
          actions={
            <Button asChild>
              <Link href="/expenses/new">
                <Plus className="size-4" />
                Добавить расход
              </Link>
            </Button>
          }
        />
        <ExpensesTable rows={rows} />
      </div>
    </AppShell>
  );
}
