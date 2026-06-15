import { notFound } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractHeader } from "@/components/contracts/ContractHeader";
import { ContractKindBadge } from "@/components/contracts/ContractKindBadge";
import { ContractTermsView } from "@/components/contracts/ContractTermsView";
import { ContractSignPanel } from "@/components/contracts/ContractSignPanel";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import { DateDisplay } from "@/components/data/DateDisplay";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.contract.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: c ? c.number : "Договор" };
}

export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
      maintenance: { select: { id: true } },
    },
  });
  if (!contract) notFound();

  const canSign = contract.status === "draft" || contract.status === "sent";

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <ContractHeader
          id={contract.id}
          number={contract.number}
          status={contract.status}
          clientName={contract.client.name}
          isImported={!!contract.pdfUrl}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">Сумма</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                <MoneyDisplay value={contract.amount} />
              </p>
              <p className="mt-2">
                <ContractKindBadge kind={contract.kind} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">Стороны</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-foreground-muted">Клиент:</span>{" "}
                <Link href={`/clients/${contract.client.id}`} className="hover:underline">
                  {contract.client.name}
                </Link>
              </p>
              {contract.project ? (
                <p>
                  <span className="text-foreground-muted">Проект:</span>{" "}
                  <Link href={`/projects/${contract.project.id}`} className="hover:underline">
                    {contract.project.title}
                  </Link>
                </p>
              ) : null}
              <p>
                <span className="text-foreground-muted">Įsigaliojimo data:</span>{" "}
                <DateDisplay date={contract.issuedAt} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground-muted">Подпись</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-foreground-muted">Я (исполнитель):</span>{" "}
                {contract.providerSignatureUrl ? (
                  <>
                    {contract.providerSignerName ?? "✓"}
                    {contract.providerSignedAt ? (
                      <>
                        {" · "}
                        <DateDisplay date={contract.providerSignedAt} />
                      </>
                    ) : null}
                  </>
                ) : (
                  <span className="text-foreground-muted">— не подписано</span>
                )}
              </p>
              <p>
                <span className="text-foreground-muted">Клиент:</span>{" "}
                {contract.status === "signed" ? (
                  <>
                    {contract.signerName ?? "✓"}
                    {contract.signedAt ? (
                      <>
                        {" · "}
                        <DateDisplay date={contract.signedAt} />
                      </>
                    ) : null}
                  </>
                ) : (
                  <span className="text-foreground-muted">— не подписано</span>
                )}
              </p>
              {contract.maintenance ? (
                <p>
                  <Link href="/maintenance" className="text-xs hover:underline">
                    Создана запись поддержки →
                  </Link>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* PDF preview */}
        <Card>
          <CardHeader>
            <CardTitle>PDF</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <iframe
              src={`/api/contracts/${contract.id}/pdf`}
              title={`PDF ${contract.number}`}
              className="h-[600px] w-full rounded-md border border-border bg-white"
            />
            <p className="text-xs text-foreground-muted">
              PDF на литовском. После подписи в него вшивается подпись клиента.
            </p>
          </CardContent>
        </Card>

        {canSign ? <ContractSignPanel contractId={contract.id} /> : null}

        <ContractTermsView terms={contract.terms} />
      </div>
    </AppShell>
  );
}
