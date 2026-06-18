"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

export type ChartPoint = {
  label: string;
  income: number;
  expense: number;
};

const fmtEur = (n: number) =>
  new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtEurFull = (n: number) =>
  new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
  }).format(n);

export function IncomeExpenseChart({ data }: { data: ChartPoint[] }) {
  const t = useTranslations("dashboard");
  // На мобиле даём min-width пропорционально количеству баров (для месяца — 31×36 = ~1100px).
  // Outer wrapper скроллится, чтобы пользователь свайпом видел весь период.
  // Для короткой шкалы (квартал = 3 бара) дефолт 360px чтобы не плющилось.
  const minWidth = Math.max(360, data.length * 36);

  return (
    <div
      className="w-full overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--foreground-muted)]/40 [&::-webkit-scrollbar-thumb]:hover:bg-[var(--foreground-muted)]/60 [&::-webkit-scrollbar-track]:bg-transparent"
      style={{ scrollbarColor: "var(--foreground-muted) transparent", scrollbarWidth: "thin" }}
    >
      <div className="h-[260px]" style={{ minWidth }}>
        <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            stroke="var(--foreground-muted)"
            tick={{ fill: "var(--foreground-muted)" }}
            style={{ fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v: number) => fmtEur(v)}
            tickLine={false}
            axisLine={false}
            stroke="var(--foreground-muted)"
            tick={{ fill: "var(--foreground-muted)" }}
            style={{ fontSize: 11 }}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "var(--secondary)", opacity: 0.3 }}
            contentStyle={{
              backgroundColor: "var(--background-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
            itemStyle={{ color: "var(--foreground)" }}
            formatter={(value, name) => [
              typeof value === "number" ? fmtEurFull(value) : String(value),
              name === "income" ? t("income") : t("expense"),
            ]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (value === "income" ? t("income") : t("expense"))}
          />
          <Bar
            dataKey="income"
            fill="var(--chart-income)"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="expense"
            fill="var(--chart-expense)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
