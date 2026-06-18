import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ProposalsTable, type ProposalRow } from "@/components/proposals/ProposalsTable";
import { getProposals } from "@/lib/actions/proposals";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("pages.proposals");
  return { title: t("metaTitle") };
}
export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const t = await getTranslations("pages.proposals");
  const proposals = await getProposals();

  const rows: ProposalRow[] = proposals.map((p) => ({
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
            <Button asChild>
              <Link href="/proposals/new">
                <Plus className="size-4" />
                {t("action")}
              </Link>
            </Button>
          }
        />
        <ProposalsTable rows={rows} />
      </div>
    </AppShell>
  );
}
