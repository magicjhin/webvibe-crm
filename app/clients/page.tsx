import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ClientsTable, type ClientRow } from "@/components/clients/ClientsTable";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("clients");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const t = await getTranslations("clients");
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  const rows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    kind: c.kind,
    status: c.status,
    projectsCount: c._count.projects,
    createdAt: c.createdAt,
  }));

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <Button asChild>
              <Link href="/clients/new">
                <Plus className="size-4" />
                {t("new")}
              </Link>
            </Button>
          }
        />
        <ClientsTable rows={rows} />
      </div>
    </AppShell>
  );
}
