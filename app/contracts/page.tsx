import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ContractsTable, type ContractRow } from "@/components/contracts/ContractsTable";
import { getContracts } from "@/lib/actions/contracts";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("pages.contracts");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const t = await getTranslations("pages.contracts");
  const contracts = await getContracts();

  const rows: ContractRow[] = contracts.map((c) => ({
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

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <Button asChild>
              <Link href="/contracts/new">
                <Plus className="size-4" />
                {t("action")}
              </Link>
            </Button>
          }
        />
        <ContractsTable rows={rows} />
      </div>
    </AppShell>
  );
}
