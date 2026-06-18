import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  InvoicesTable,
  type InvoiceRow,
} from "@/components/invoices/InvoicesTable";
import {
  ContractsTable,
  type ContractRow,
} from "@/components/contracts/ContractsTable";
import {
  ProposalsTable,
  type ProposalRow,
} from "@/components/proposals/ProposalsTable";
import { prisma } from "@/lib/db";
import { getContracts } from "@/lib/actions/contracts";
import { getProposals } from "@/lib/actions/proposals";

export async function generateMetadata() {
  const t = await getTranslations("documents");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string }>;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("documents");
  const { tab } = await searchParams;
  const activeTab =
    tab === "contracts" || tab === "proposals" ? tab : "invoices";

  const [invoices, contracts, proposals] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: [{ issuedAt: "desc" }, { number: "desc" }],
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { title: true } },
      },
    }),
    getContracts(),
    getProposals(),
  ]);

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
    isImported: !!i.pdfUrl,
  }));

  const contractRows: ContractRow[] = contracts.map((c) => ({
    id: c.id,
    number: c.number,
    kind: c.kind,
    status: c.status,
    clientId: c.clientId,
    clientName: c.client.name,
    projectTitle: c.project?.title ?? null,
    issuedAt: c.issuedAt,
    amount: c.amount.toString(),
    isImported: !!c.pdfUrl,
  }));

  const proposalRows: ProposalRow[] = proposals.map((p) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    status: p.status,
    clientId: p.clientId,
    clientName: p.client.name,
    validUntil: p.validUntil,
    total: p.total.toString(),
    createdAt: p.createdAt,
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  {t("create")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/invoices/new">{t("invoice")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/contracts/new">{t("contract")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/proposals/new">{t("proposal")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-foreground-subtle">
                  {t("importOldPdf")}
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/invoices/import">{t("importInvoice")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/contracts/import">{t("importContract")}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        <Tabs defaultValue={activeTab}>
          <TabsList>
            <TabsTrigger value="invoices">
              {t("tabInvoices")}
              <span className="ml-2 text-xs text-foreground-muted">
                {rows.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="contracts">
              {t("tabContracts")}
              <span className="ml-2 text-xs text-foreground-muted">
                {contractRows.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="proposals">
              {t("tabProposals")}
              <span className="ml-2 text-xs text-foreground-muted">
                {proposalRows.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            <InvoicesTable rows={rows} />
          </TabsContent>

          <TabsContent value="contracts" className="mt-4">
            <ContractsTable rows={contractRows} />
          </TabsContent>

          <TabsContent value="proposals" className="mt-4">
            <ProposalsTable rows={proposalRows} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
