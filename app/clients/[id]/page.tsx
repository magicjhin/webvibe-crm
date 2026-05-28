import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, FolderKanban, Plus, Wallet } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ClientHeader } from "@/components/clients/ClientHeader";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { EmptyState } from "@/components/data/EmptyState";
import { StatusBadge } from "@/components/data/StatusBadge";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: client?.name ?? "Клиент" };
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          price: true,
          deadlineAt: true,
        },
      },
      invoices: {
        orderBy: [{ issuedAt: "desc" }, { number: "desc" }],
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          issuedAt: true,
          dueAt: true,
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          kind: true,
          invoice: { select: { id: true, number: true } },
        },
      },
    },
  });
  if (!client) notFound();

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <ClientHeader
          id={client.id}
          name={client.name}
          status={client.status}
          kind={client.kind}
        />

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Детали</TabsTrigger>
            <TabsTrigger value="projects">
              Проекты ({client.projects.length})
            </TabsTrigger>
            <TabsTrigger value="documents">Документы</TabsTrigger>
            <TabsTrigger value="payments">Платежи</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Контакты</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <Row label="Email" value={client.email} />
                  <Row label="Телефон" value={client.phone} />
                  <Row label="Сайт" value={client.website} link />
                  <Row label="Источник" value={client.source} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Реквизиты</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <Row label="PVM kodas" value={client.vatId} mono />
                  <Row label="Įmonės kodas" value={client.regNumber} mono />
                  <Row label="Адрес" value={client.address} />
                  <Row label="Представитель" value={client.representative} />
                  <Row label="Тех. контакт" value={client.technicalContactName} />
                  <Row label="Язык документов" value={client.language?.toUpperCase()} mono />
                </CardContent>
              </Card>
              {client.notes ? (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Заметки</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-foreground-muted">
                    {client.notes}
                  </CardContent>
                </Card>
              ) : null}
              <Card className="md:col-span-2">
                <CardContent className="flex items-center justify-between py-4 text-xs text-foreground-subtle">
                  <span>
                    Создан <DateDisplay date={client.createdAt} mode="long" />
                  </span>
                  <span>
                    Обновлён <DateDisplay date={client.updatedAt} mode="relative" />
                  </span>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <div className="flex items-center justify-between pb-3">
              <p className="text-sm text-foreground-muted">
                Проекты этого клиента
              </p>
              <Button asChild>
                <Link href={`/projects/new?clientId=${client.id}`}>
                  <Plus className="size-4" />
                  Новый проект
                </Link>
              </Button>
            </div>
            {client.projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="У клиента нет проектов"
                description="Создай первый проект — он появится здесь и в общем списке."
                action={
                  <Button asChild>
                    <Link href={`/projects/new?clientId=${client.id}`}>
                      <Plus className="size-4" />
                      Создать проект
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {client.projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-background-elevated px-4 py-3 transition-colors hover:border-border-strong"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{p.title}</span>
                        <div className="flex items-center gap-2 text-xs text-foreground-muted">
                          <span>{p.type}</span>
                          <span>•</span>
                          <DateDisplay date={p.deadlineAt} mode="short" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MoneyDisplay value={p.price} />
                        <StatusBadge kind="project" value={p.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {client.invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Счетов пока нет"
                description="КП и договоры появятся в Iter 4. Счета можно создавать уже сейчас."
                action={
                  <Button asChild>
                    <Link href={`/invoices/new?clientId=${client.id}`}>
                      <Plus className="size-4" />
                      Создать счёт
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {client.invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-4 rounded-md border border-border bg-background-elevated p-3 transition-colors hover:border-foreground/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium">{inv.number}</span>
                        <span className="text-xs text-foreground-muted">
                          <DateDisplay date={inv.issuedAt} />
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MoneyDisplay value={inv.total} />
                        <InvoiceStatusBadge status={inv.status} dueAt={inv.dueAt} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {client.payments.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Платежей пока нет"
                description="Когда поступит оплата от клиента — добавь её, привязать к счёту опционально."
                action={
                  <Button asChild>
                    <Link href={`/payments/new?clientId=${client.id}`}>
                      <Plus className="size-4" />
                      Добавить платёж
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {client.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-border bg-background-elevated p-3"
                  >
                    <div className="flex items-center gap-3">
                      <DateDisplay date={p.paidAt} />
                      {p.invoice ? (
                        <Link
                          href={`/invoices/${p.invoice.id}`}
                          className="font-mono text-xs text-foreground-muted hover:underline"
                        >
                          {p.invoice.number}
                        </Link>
                      ) : (
                        <span className="text-xs text-foreground-subtle">без счёта</span>
                      )}
                    </div>
                    <span className="font-medium">
                      <MoneyDisplay value={p.amount} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  link,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  link?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
      <span className="text-xs uppercase tracking-wide text-foreground-subtle">
        {label}
      </span>
      {value ? (
        link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words text-foreground hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className={mono ? "font-mono break-words" : "break-words"}>{value}</span>
        )
      ) : (
        <span className="text-foreground-subtle">—</span>
      )}
    </div>
  );
}
