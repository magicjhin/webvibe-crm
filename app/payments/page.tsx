import Link from "next/link";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  PaymentsTable,
  type PaymentRow,
} from "@/components/payments/PaymentsTable";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("pages.payments");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const t = await getTranslations("pages.payments");
  const payments = await prisma.payment.findMany({
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
      invoice: { select: { id: true, number: true } },
    },
  });

  const rows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    paidAt: p.paidAt,
    kind: p.kind,
    amount: p.amount.toString(),
    clientId: p.client.id,
    clientName: p.client.name,
    projectId: p.project?.id ?? null,
    projectTitle: p.project?.title ?? null,
    invoiceId: p.invoice?.id ?? null,
    invoiceNumber: p.invoice?.number ?? null,
    note: p.note,
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <Button asChild>
              <Link href="/payments/new">
                <Plus className="size-4" />
                {t("action")}
              </Link>
            </Button>
          }
        />
        <PaymentsTable rows={rows} />
      </div>
    </AppShell>
  );
}
