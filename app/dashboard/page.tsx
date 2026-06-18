import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  FolderKanban,
  Receipt,
  TrendingDown,
  TrendingUp,
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
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import {
  IncomeExpenseChart,
  type ChartPoint,
} from "@/components/dashboard/IncomeExpenseChart";
import { prisma } from "@/lib/db";
import {
  getPeriodBounds,
  isValidPeriod,
  todayCursor,
  type Period,
} from "@/lib/dashboard/periodBounds";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ period?: string; cursor?: string }>;

function bucketIndex(
  date: Date,
  buckets: { start: Date; end: Date }[],
): number {
  // Бары упорядочены хронологически — простой линейный поиск (max 31 итерация для месяца).
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i]!;
    if (date >= b.start && date < b.end) return i;
  }
  return -1;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("dashboard");
  const tCat = await getTranslations("expenseCategory");
  const params = await searchParams;
  const period: Period = isValidPeriod(params.period) ? params.period : "month";
  const cursor = params.cursor ?? todayCursor();
  const locale = await getLocale();
  const bounds = getPeriodBounds(period, cursor, locale);
  const now = new Date();

  // Все aggregates за период + non-period-dependent блоки в parallel
  const [
    payments,
    expenses,
    sentInvoices,
    activeProjectsCount,
    recentPayments,
    overdueInvoices,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: bounds.start, lt: bounds.end } },
      select: { amount: true, paidAt: true },
    }),
    prisma.expense.findMany({
      where: { occurredAt: { gte: bounds.start, lt: bounds.end } },
      select: { amount: true, category: true, occurredAt: true },
    }),
    prisma.invoice.findMany({
      where: { status: "sent" },
      include: {
        payments: { select: { amount: true } },
      },
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

  // KPI summary
  const income = payments.reduce<number>(
    (acc, p) => acc + Number(p.amount.toString()),
    0,
  );
  const expense = expenses.reduce<number>(
    (acc, e) => acc + Number(e.amount.toString()),
    0,
  );
  const net = income - expense;

  // Chart data — бары по бакетам
  const chartData: ChartPoint[] = bounds.buckets.map((b) => ({
    label: b.label,
    income: 0,
    expense: 0,
  }));
  for (const p of payments) {
    const idx = bucketIndex(p.paidAt, bounds.buckets);
    if (idx >= 0) chartData[idx]!.income += Number(p.amount.toString());
  }
  for (const e of expenses) {
    const idx = bucketIndex(e.occurredAt, bounds.buckets);
    if (idx >= 0) chartData[idx]!.expense += Number(e.amount.toString());
  }

  // Outstanding (период-независимое)
  const outstandingTotal = sentInvoices.reduce<number>((acc, inv) => {
    const paid = inv.payments.reduce<number>(
      (s, p) => s + Number(p.amount.toString()),
      0,
    );
    return acc + Math.max(0, Number(inv.total.toString()) - paid);
  }, 0);
  const overdueCount = overdueInvoices.length;

  // Top categories за период
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(
      e.category,
      (byCategory.get(e.category) ?? 0) + Number(e.amount.toString()),
    );
  }
  const topCategories = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("title")}
          description={t("description", { label: bounds.label })}
        />

        <PeriodSwitcher
          period={bounds.period}
          label={bounds.label}
          prevCursor={bounds.prevCursor}
          nextCursor={bounds.nextCursor}
          cursor={bounds.cursor}
        />

        {/* Period-dependent KPI */}
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            icon={<TrendingUp className="size-4" />}
            label={t("income")}
            value={<MoneyDisplay value={income} />}
            hint={t("paymentsCount", { count: payments.length })}
            accent="positive"
          />
          <KpiCard
            icon={<TrendingDown className="size-4" />}
            label={t("expense")}
            value={<MoneyDisplay value={expense} />}
            hint={t("expensesCount", { count: expenses.length })}
            accent="negative"
          />
          <KpiCard
            icon={
              net >= 0 ? (
                <ArrowUpRight className="size-4" />
              ) : (
                <ArrowDownRight className="size-4" />
              )
            }
            label={t("net")}
            value={
              <>
                {net >= 0 ? "+" : ""}
                <MoneyDisplay value={net} />
              </>
            }
            hint={net >= 0 ? t("profitPeriod") : t("lossPeriod")}
            accent={net >= 0 ? "positive" : "negative"}
            big
          />
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("chartTitle")}</CardTitle>
            <CardDescription>
              {period === "month"
                ? t("chartByDays")
                : period === "quarter"
                  ? t("chartByQuarterMonths")
                  : t("chartByYearMonths")}
              {t("chartLegend")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {income === 0 && expense === 0 ? (
              <EmptyState
                title={t("noPeriodData")}
                description={t("noPeriodDataDesc")}
              />
            ) : (
              <IncomeExpenseChart data={chartData} />
            )}
          </CardContent>
        </Card>

        {/* Non-period blocks */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<FileText className="size-4" />}
            label={t("outstanding")}
            value={<MoneyDisplay value={outstandingTotal} />}
            hint={
              overdueCount > 0
                ? t("outstandingHintOverdue", {
                    count: sentInvoices.length,
                    overdue: overdueCount,
                  })
                : t("outstandingHint", { count: sentInvoices.length })
            }
            href="/invoices"
            danger={overdueCount > 0}
          />
          <KpiCard
            icon={<FolderKanban className="size-4" />}
            label={t("activeProjects")}
            value={String(activeProjectsCount)}
            hint={t("activeProjectsHint")}
            href="/projects"
          />
          <KpiCard
            icon={<Wallet className="size-4" />}
            label={t("recentPaymentsKpi")}
            value={String(recentPayments.length)}
            hint={t("recentPaymentsHint")}
            href="/payments"
          />
          <KpiCard
            icon={<Receipt className="size-4" />}
            label={t("expensesInPeriod")}
            value={String(expenses.length)}
            hint={t("expensesInPeriodHint")}
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
                {t("overdueTitle")}
              </CardTitle>
              <CardDescription>{t("overdueDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueInvoices.length === 0 ? (
                <EmptyState title={t("allClear")} description={t("allClearDesc")} />
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
                          {t("due")} <DateDisplay date={inv.dueAt} />
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
              <CardTitle>{t("recentPaymentsTitle")}</CardTitle>
              <CardDescription>{t("recentPaymentsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <EmptyState
                  title={t("noPayments")}
                  description={t("noPaymentsDesc")}
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

          {/* Top categories за период */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("byCategoryTitle")}</CardTitle>
                <CardDescription>{bounds.label}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/expenses">
                  {t("allExpenses")}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {topCategories.length === 0 ? (
                <EmptyState
                  title={t("noCategoryData")}
                  description={t("noCategoryDataDesc")}
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {topCategories.map(([cat, sum]) => {
                    const pct = expense > 0 ? (sum / expense) * 100 : 0;
                    return (
                      <li key={cat} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{tCat(cat)}</span>
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
  accent,
  big,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
  danger?: boolean;
  accent?: "positive" | "negative";
  big?: boolean;
}) {
  const accentClass =
    accent === "positive"
      ? "text-[var(--color-status-paid)]"
      : accent === "negative"
        ? "text-[var(--color-status-overdue)]"
        : danger
          ? "text-[var(--danger)]"
          : "";

  const content = (
    <>
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
        {href ? (
          <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
      <div
        className={`mt-2 font-semibold tabular-nums ${big ? "text-3xl" : "text-2xl"} ${accentClass}`}
      >
        {value}
      </div>
      {hint ? (
        <p className="mt-1 text-xs text-foreground-subtle">{hint}</p>
      ) : null}
    </>
  );

  const baseClass = "block rounded-lg border border-border bg-card p-4";
  if (href) {
    return (
      <Link
        href={href}
        className={`group ${baseClass} transition-colors hover:border-foreground/20`}
      >
        {content}
      </Link>
    );
  }
  return <div className={baseClass}>{content}</div>;
}
