import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { EmptyState } from "@/components/data/EmptyState";
import {
  InvoicesTable,
  type InvoiceRow,
} from "@/components/invoices/InvoicesTable";
import { prisma } from "@/lib/db";

export const metadata = { title: "Документы" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string }>;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab } = await searchParams;
  const activeTab =
    tab === "contracts" || tab === "proposals" ? tab : "invoices";

  const invoices = await prisma.invoice.findMany({
    orderBy: [{ issuedAt: "desc" }, { number: "desc" }],
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { title: true } },
    },
  });

  const rows: InvoiceRow[] = invoices.map((i) => ({
    id: i.id,
    number: i.number,
    kind: i.kind,
    status: i.status,
    clientId: i.clientId,
    clientName: i.client.name,
    projectTitle: i.project?.title ?? null,
    issuedAt: i.issuedAt,
    dueAt: i.dueAt,
    total: i.total.toString(),
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Документы"
          description="Все счета, договоры и КП. Управляй статусами и скачивай PDF без захода в карточку клиента."
          actions={
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="size-4" />
                Новый счёт
              </Link>
            </Button>
          }
        />

        <Tabs defaultValue={activeTab}>
          <TabsList>
            <TabsTrigger value="invoices">
              Счета
              <span className="ml-2 text-xs text-foreground-muted">
                {rows.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="contracts">Договора</TabsTrigger>
            <TabsTrigger value="proposals">КП</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            <InvoicesTable rows={rows} />
          </TabsContent>

          <TabsContent value="contracts" className="mt-4">
            <EmptyState
              icon={FileText}
              title="Договора появятся в Iter 4"
              description="Project contracts + maintenance contracts с manual signature через /sign/[token]. Нумерация WVS000001."
            />
          </TabsContent>

          <TabsContent value="proposals" className="mt-4">
            <EmptyState
              icon={FileText}
              title="КП появятся в Iter 4"
              description="Коммерческие предложения с PDF и конверсией в Project. Нумерация WVP-001."
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
