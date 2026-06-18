import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { InvoicesTable, type InvoiceRow } from "@/components/invoices/InvoicesTable";
import { prisma } from "@/lib/db";

export async function generateMetadata() {
  const t = await getTranslations("pages.invoices");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const t = await getTranslations("pages.invoices");
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
    isImported: !!i.pdfUrl,
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="size-4" />
                {t("action")}
              </Link>
            </Button>
          }
        />
        <InvoicesTable rows={rows} />
      </div>
    </AppShell>
  );
}
