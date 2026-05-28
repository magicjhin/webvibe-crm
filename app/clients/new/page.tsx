import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClientForm } from "@/components/forms/ClientForm";

export const metadata = { title: "Новый клиент" };

export default function NewClientPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Новый клиент"
          description="Заполни хотя бы имя и тип. Реквизиты можно дозаполнить позже."
        />
        <ClientForm mode="create" />
      </div>
    </AppShell>
  );
}
