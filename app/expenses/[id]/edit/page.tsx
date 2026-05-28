import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { prisma } from "@/lib/db";
import type { ExpenseInput } from "@/lib/validators/expense";
import { formatDateOnly } from "@/lib/dates/parse";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = await prisma.expense.findUnique({
    where: { id },
    select: { description: true },
  });
  return { title: e ? `Редактировать — ${e.description}` : "Расход" };
}

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) notFound();

  const initial: ExpenseInput = {
    category: expense.category,
    vendor: expense.vendor,
    amount: expense.amount.toString(),
    currency: "EUR",
    occurredAt: formatDateOnly(expense.occurredAt) ?? new Date().toISOString().slice(0, 10),
    description: expense.description,
    fileUrl: expense.fileUrl,
    fileName: expense.fileName,
    recurring: expense.recurring,
    recurrence:
      expense.recurrence === "monthly" || expense.recurrence === "yearly"
        ? expense.recurrence
        : null,
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader title={`Редактировать — ${expense.description}`} />
        <ExpenseForm mode="edit" id={expense.id} initial={initial} />
      </div>
    </AppShell>
  );
}
