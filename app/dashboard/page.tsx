import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertTriangle,
  ArrowUpRight,
  FileText,
  FolderKanban,
  Receipt,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { EmptyState } from "@/components/data/EmptyState";
import { prisma } from "@/lib/db";
import { parseDateOnly, PROJECT_TZ } from "@/lib/dates/parse";
import { EXPENSE_CATEGORIES } from "@/lib/validators/expense";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  ai_tools: "AI-инструменты",
  hosting: "Хостинг",
  domains: "Домены",
  software: "Софт",
  hardware: "Железо",
  ads: "Реклама",
  transport: "Транспорт",
  other: "Другое",
};

// First-of-this-month and first-of-next-month, both in Vilnius TZ, as UTC Dates.
function monthBounds(): { start: Date; end: Date } {
  const now = new Date();
  const yyyy = Number(formatInTimeZone(now, PROJECT_TZ, "yyyy"));
  const mm = Number(formatInTimeZone(now, PROJECT_TZ, "MM"));
  const start = parseDateOnly(`${yyyy}-${String(mm).padStart(2, "0")}-01`)!;
  const nextY = mm === 12 ? yyyy + 1 : yyyy;
  const nextM = mm === 12 ? 1 : mm + 1;
  const end = parseDateOnly(`${nextY}-${String(nextM).padStart(2, "0")}-01`)!;
  return { start, end };
}

function sumDecimal(values: { toString(): string }[]): number {
  return values.reduce<number>((acc, v) => acc + Number(v.toString()), 0);
}

export default async function DashboardPage() {
  const { start, end } = monthBounds();
  const now = new Date();

  const [
    paymentsThisMonth,
    expensesThisMonth,
    sentInvoices,
    activeProjectsCount,
    recentPayments,
    overdueInvoices,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: { occurredAt: { gte: start, lt: end } },
      select: { amount: true, category: true },
    }),
    prisma.invoice.findMany({
      where: { status: "sent" },
      include: {
        client: { select: { id: true, name: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    prisma.project.count({
      where: { status: { notIn: ["paid", "archived"] } },
    }),
    prisma.payment.findMany({
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: {
        client: { select: { id: true, name: true } },
        invoice: { select: { id: true, number: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { status: "sent", dueAt: { lt: now } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
  ]);

  const incomeMonth = sumDecimal(paymentsThisMonth.map((p) => p.amount));
  const expenseMonth = sumDecimal(expensesThisMonth.map((e) => e.amount));
  const netMonth = incomeMonth - expenseMonth;

  // Outstanding = sum of (invoice.total - paid) for sent invoices
  const outstandingTotal = sentInvoices.reduce<number>((acc, inv) => {
    const paid = sumDecimal(inv.payments.map((p) => p.amount));
    return acc + Math.max(0, Number(inv.total.toString()) - paid);
  }, 0);
  const overdueCount = overdueInvoices.length;

  // Top categories this month
  const byCategory = new Map<string, number>();
  for (const e of expensesThisMonth) {
    byCategory.set(
      e.category,
      (byCategory.get(e.category) ?? 0) + Number(e.amount.toString()),
    );
  }
  const topCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const monthLabel = formatInTimeZone(new Date(), PROJECT_TZ, "LLLL yyyy");

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Dashboard"
          description={`Текущий месяц: ${monthLabel}. Чистые цифры по работе.`}
        />

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Wallet className="size-4" />}
            label="Доход за месяц"
            value={<MoneyDisplay value={incomeMonth} />}
            hint={`Чистыми: ${netMonth >= 0 ? "+" : ""}${netMonth.toFixed(2)} EUR`}
            href="/payments"
          />
          <KpiCard
            icon={<FileText className="size-4" />}
            label="Неоплаченные счета"
            value={<MoneyDisplay value={outstandingTotal} />}
            hint={
              overdueCount > 0
                ? `${sentInvoices.length} sent · ${overdueCount} просрочено`
                : `${sentInvoices.length} sent`
            }
            href="/invoices"
            danger={overdueCount > 0}
          />
          <KpiCard
            icon={<FolderKanban className="size-4" />}
            label="Активные проекты"
            value={String(activeProjectsCount)}
            hint="не paid и не archived"
            href="/projects"
          />
          <KpiCard
            icon={<Receipt className="size-4" />}
            label="Расходы за месяц"
            value={<MoneyDisplay value={expenseMonth} />}
            hint={`${expensesThisMonth.length} записей`}
            href="/expenses"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overdue invoices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {overdueCount > 0 ? (
                  <AlertTriangle className="size-4 text-[hsl(var(--danger))]" />
                ) : (
                  <FileText className="size-4 text-foreground-muted" />
                )}
                Просроченные счета
              </CardTitle>
              <CardDescription>
                Status=sent, дата оплаты прошла.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueInvoices.length === 0 ? (
                <EmptyState
                  title="Всё чисто"
                  description="Просроченных счетов нет."
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {overdueInvoices.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--danger)/0.3)] bg-[hsl(var(--danger)/0.05)] px-3 py-2 text-sm"
                    >
                      <div>
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-mono font-medium hover:underline"
                        >
                          {inv.number}
                        </Link>
                        <span className="ml-2 text-foreground-muted">
                          {inv.client.name}
                        </span>
                        <span className="ml-2 text-xs text-[hsl(var(--danger))]">
                          до <DateDisplay date={inv.dueAt} />
                        </span>
                      </div>
                      <span className="font-medium">
                        <MoneyDisplay value={inv.total} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent payments */}
          <Card>
            <CardHeader>
              <CardTitle>Свежие платежи</CardTitle>
              <CardDescription>Последние 5 поступлений.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <EmptyState
                  title="Платежей пока нет"
                  description="Добавь первый платёж — появится здесь."
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {recentPayments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-background-elevated px-3 py-2 text-sm"
                    >
                      <div>
                        <DateDisplay date={p.paidAt} />
                        <span className="ml-2 text-foreground-muted">
                          {p.client.name}
                        </span>
                        {p.invoice ? (
                          <Link
                            href={`/invoices/${p.invoice.id}`}
                            className="ml-2 font-mono text-xs text-foreground-muted hover:underline"
                          >
                            {p.invoice.number}
                          </Link>
                        ) : null}
                      </div>
                      <span className="font-medium">
                        <MoneyDisplay value={p.amount} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Expense categories */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Расходы по категориям</CardTitle>
                <CardDescription>{monthLabel}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/expenses">
                  Все расходы
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {topCategories.length === 0 ? (
                <EmptyState
                  title="Расходов в этом месяце нет"
                  description="Записи появятся, когда добавишь первый расход."
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {topCategories.map(([cat, sum]) => {
                    const pct = expenseMonth > 0 ? (sum / expenseMonth) * 100 : 0;
                    return (
                      <li key={cat} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat}
                          </span>
                          <span className="font-medium tabular-nums">
                            <MoneyDisplay value={sum} />{" "}
                            <span className="text-xs text-foreground-subtle">
                              ({pct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-accent-gradient"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  href,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  href: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
        <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          danger ? "text-[hsl(var(--danger))]" : ""
        }`}
      >
        {value}
      </div>
      {hint ? (
        <p className="mt-1 text-xs text-foreground-subtle">{hint}</p>
      ) : null}
    </Link>
  );
}
