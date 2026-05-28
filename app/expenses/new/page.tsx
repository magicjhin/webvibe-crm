import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpenseForm } from "@/components/forms/ExpenseForm";

export const metadata = { title: "Новый расход" };

export default function NewExpensePage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Новый расход"
          description="Запиши расход — можно прикрепить PDF или фото чека."
        />
        <ExpenseForm mode="create" />
      </div>
    </AppShell>
  );
}
