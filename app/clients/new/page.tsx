import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientForm } from "@/components/forms/ClientForm";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("clientForm");
  return { title: t("newTitle") };
}

export default async function NewClientPage() {
  const t = await getTranslations("clientForm");
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("newTitle")}
          description={t("newDesc")}
        />
        <ClientForm mode="create" />
      </div>
    </AppShell>
  );
}
