import { notFound } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceHeader } from "@/components/invoices/InvoiceHeader";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { EmptyState } from "@/components/data/EmptyState";
import { prisma } from "@/lib/db";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: inv ? inv.number : "Счёт" };
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
      items: { orderBy: { order: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const totalPaid = invoice.payments.reduce<number>(
    (sum, p) => sum + Number(p.amount.toString()),
    0,
  );
  const remaining = Number(invoice.total.toString()) - totalPaid;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <InvoiceHeader
          id={invoice.id}
          number={invoice.number}
          status={invoice.status}
          dueAt={invoice.dueAt}
          clientName={invoice.client.name}
          isImported={!!invoice.pdfUrl}
        />

        {/* PDF preview */}
        <Card>
          <CardHeader>
            <CardTitle>PDF</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <iframe
              src={`/api/invoices/${invoice.id}/pdf`}
              title={`PDF ${invoice.number}`}
              className="h-[600px] w-full rounded-md border border-border bg-white"
            />
            <p className="text-xs text-foreground-muted">
              PDF собирается из последних данных счёта. Кнопка «PDF» в шапке откроет его в новой вкладке.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Сумма
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                <MoneyDisplay value={invoice.total} />
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Tarpinė: <MoneyDisplay value={invoice.subtotal} /> · Suma be PVM (ADR-007)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Оплачено
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                <MoneyDisplay value={totalPaid} />
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Остаток: <MoneyDisplay value={remaining} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Сроки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-foreground-muted">Išrašyta:</span>{" "}
                <DateDisplay date={invoice.issuedAt} />
              </p>
              <p>
                <span className="text-foreground-muted">Apmokėti iki:</span>{" "}
                <DateDisplay date={invoice.dueAt} />
              </p>
              <p>
                <span className="text-foreground-muted">Клиент:</span>{" "}
                <Link
                  href={`/clients/${invoice.client.id}`}
                  className="hover:underline"
                >
                  {invoice.client.name}
                </Link>
              </p>
              {invoice.project ? (
                <p>
                  <span className="text-foreground-muted">Проект:</span>{" "}
                  <Link
                    href={`/projects/${invoice.project.id}`}
                    className="hover:underline"
                  >
                    {invoice.project.title}
                  </Link>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Items table */}
        <Card>
          <CardHeader>
            <CardTitle>Paslaugos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {invoice.items.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-md border border-border bg-background-elevated px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {idx + 1}. {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-xs text-foreground-muted whitespace-pre-wrap">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      <MoneyDisplay value={item.total} />
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {item.qty.toString()} × <MoneyDisplay value={item.unitPrice} />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Payments by this invoice */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Платежи по счёту</CardTitle>
            {/* Платёж можно привязать только к sent/paid счёту (см. createPayment guard) */}
            {remaining > 0 && (invoice.status === "sent" || invoice.status === "paid") ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/payments/new?invoiceId=${invoice.id}`}>
                  <Plus className="size-4" />
                  Добавить платёж
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {invoice.payments.length === 0 ? (
              <EmptyState
                title="Платежей пока нет"
                description={
                  invoice.status === "draft"
                    ? "Сначала переведи счёт в Sent — после этого можно регистрировать платежи."
                    : `Когда поступит платёж — добавь его и привяжи к ${invoice.number}.`
                }
                action={
                  invoice.status === "sent" || invoice.status === "paid" ? (
                    <Button asChild size="sm">
                      <Link href={`/payments/new?invoiceId=${invoice.id}`}>
                        <Plus className="size-4" />
                        Добавить платёж
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {invoice.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-border bg-background-elevated px-4 py-3 text-sm"
                  >
                    <div>
                      <DateDisplay date={p.paidAt} />
                      {p.note ? (
                        <span className="ml-3 text-xs text-foreground-muted">{p.note}</span>
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

        {invoice.notes ? (
          <Card>
            <CardHeader>
              <CardTitle>Pastabos</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-foreground-muted">
              {invoice.notes}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
