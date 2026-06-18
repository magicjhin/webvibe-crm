import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("clients");
  return { title: client?.name ?? t("detailFallback") };
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("clients");
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
            <TabsTrigger value="details">{t("tabDetails")}</TabsTrigger>
            <TabsTrigger value="projects">
              {t("tabProjects")} ({client.projects.length})
            </TabsTrigger>
            <TabsTrigger value="documents">{t("tabDocuments")}</TabsTrigger>
            <TabsTrigger value="payments">{t("tabPayments")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("contacts")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <Row label="Email" value={client.email} />
                  <Row label={t("phone")} value={client.phone} />
                  <Row label={t("website")} value={client.website} link />
                  <Row label={t("source")} value={client.source} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("requisites")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <Row label="PVM kodas" value={client.vatId} mono />
                  <Row label="Įmonės kodas" value={client.regNumber} mono />
                  <Row label={t("address")} value={client.address} />
                  <Row label={t("representative")} value={client.representative} />
                  <Row label={t("techContact")} value={client.technicalContactName} />
                  <Row label={t("docLanguage")} value={client.language?.toUpperCase()} mono />
                </CardContent>
              </Card>
              {client.notes ? (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>{t("notes")}</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-foreground-muted">
                    {client.notes}
                  </CardContent>
                </Card>
              ) : null}
              <Card className="md:col-span-2">
                <CardContent className="flex items-center justify-between py-4 text-xs text-foreground-subtle">
                  <span>
                    {t("createdAtLabel")} <DateDisplay date={client.createdAt} mode="long" />
                  </span>
                  <span>
                    {t("updatedAtLabel")} <DateDisplay date={client.updatedAt} mode="relative" />
                  </span>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <div className="flex items-center justify-between pb-3">
              <p className="text-sm text-foreground-muted">
                {t("projectsOfClient")}
              </p>
              <Button asChild>
                <Link href={`/projects/new?clientId=${client.id}`}>
                  <Plus className="size-4" />
                  {t("newProject")}
                </Link>
              </Button>
            </div>
            {client.projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title={t("noProjects")}
                description={t("noProjectsDesc")}
                action={
                  <Button asChild>
                    <Link href={`/projects/new?clientId=${client.id}`}>
                      <Plus className="size-4" />
                      {t("createProject")}
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
                title={t("noInvoices")}
                description={t("noInvoicesDesc")}
                action={
                  <Button asChild>
                    <Link href={`/invoices/new?clientId=${client.id}`}>
                      <Plus className="size-4" />
                      {t("createInvoice")}
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
                title={t("noPaymentsTitle")}
                description={t("noPaymentsDesc")}
                action={
                  <Button asChild>
                    <Link href={`/payments/new?clientId=${client.id}`}>
                      <Plus className="size-4" />
                      {t("addPayment")}
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
                        <span className="text-xs text-foreground-subtle">{t("noInvoiceLink")}</span>
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
