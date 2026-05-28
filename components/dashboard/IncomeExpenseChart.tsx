"use client";

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
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            stroke="hsl(var(--foreground-muted))"
            style={{ fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v: number) => fmtEur(v)}
            tickLine={false}
            axisLine={false}
            stroke="hsl(var(--foreground-muted))"
            style={{ fontSize: 11 }}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--secondary))", opacity: 0.3 }}
            contentStyle={{
              backgroundColor: "hsl(var(--background-elevated))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            formatter={(value, name) => [
              typeof value === "number" ? fmtEurFull(value) : String(value),
              name === "income" ? "Доход" : "Расход",
            ]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (value === "income" ? "Доход" : "Расход")}
          />
          <Bar
            dataKey="income"
            fill="hsl(var(--color-status-paid, 142 70% 45%))"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="expense"
            fill="hsl(var(--color-status-overdue, 0 75% 60%))"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
