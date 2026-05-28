import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientForm } from "@/components/forms/ClientForm";
import { prisma } from "@/lib/db";
import type { ClientInput } from "@/lib/validators/client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.client.findUnique({ where: { id }, select: { name: true } });
  return { title: c ? `Редактировать — ${c.name}` : "Клиент" };
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await prisma.client.findUnique({ where: { id } });
  if (!c) notFound();

  const initial: ClientInput = {
    kind: c.kind,
    name: c.name,
    email: c.email,
    phone: c.phone,
    website: c.website,
    vatId: c.vatId,
    regNumber: c.regNumber,
    address: c.address,
    language: c.language,
    status: c.status,
    source: c.source,
    notes: c.notes,
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader title={`Редактировать — ${c.name}`} />
        <ClientForm mode="edit" id={c.id} initial={initial} />
      </div>
    </AppShell>
  );
}
