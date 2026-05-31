import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ContractsTable, type ContractRow } from "@/components/contracts/ContractsTable";
import { getContracts } from "@/lib/actions/contracts";

export const metadata = { title: "Договора" };
export const dynamic = "force-dynamic";

export default async function ContractsPage() {
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
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Договора"
          description="Sutartys клиентам. Литовский PDF, ручная подпись по ссылке /sign."
          actions={
            <Button asChild>
              <Link href="/contracts/new">
                <Plus className="size-4" />
                Новый договор
              </Link>
            </Button>
          }
        />
        <ContractsTable rows={rows} />
      </div>
    </AppShell>
  );
}
