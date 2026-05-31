import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ProposalsTable, type ProposalRow } from "@/components/proposals/ProposalsTable";
import { getProposals } from "@/lib/actions/proposals";

export const metadata = { title: "КП" };
export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
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
          title="Коммерческие предложения"
          description="Pasiūlymai клиентам. Литовский PDF, конверсия в проект на accepted."
          actions={
            <Button asChild>
              <Link href="/proposals/new">
                <Plus className="size-4" />
                Новое КП
              </Link>
            </Button>
          }
        />
        <ProposalsTable rows={rows} />
      </div>
    </AppShell>
  );
}
