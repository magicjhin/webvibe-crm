import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { prisma } from "@/lib/db";
import type { SettingsInput } from "@/lib/validators/settings";

export const metadata = {
  title: "Настройки",
};

export const dynamic = "force-dynamic";

export default async function SettingsProfilePage() {
  const row = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!row) {
    // Settings singleton must exist after `prisma/seed.ts`.
    // If it's missing here, something is off — fail loud.
    notFound();
  }

  // Cast prisma row → form-shaped input (currency/language are literals).
  const initial: SettingsInput = {
    companyName: row.companyName,
    ownerName: row.ownerName,
    personalCode: row.personalCode ?? null,
    vatId: row.vatId ?? null,
    regNumber: row.regNumber ?? null,
    address: row.address,
    iban: row.iban,
    swift: row.swift ?? null,
    bankNote: row.bankNote ?? null,
    email: row.email,
    phone: row.phone ?? null,
    website: row.website ?? null,
    logoUrl: row.logoUrl ?? null,
    signatureUrl: row.signatureUrl ?? null,
    invoicePrefix: row.invoicePrefix,
    invoiceCounter: row.invoiceCounter,
    invoicePadding: row.invoicePadding,
    contractPrefix: row.contractPrefix,
    contractCounter: row.contractCounter,
    contractPadding: row.contractPadding,
    proposalPrefix: row.proposalPrefix,
    proposalCounter: row.proposalCounter,
    proposalPadding: row.proposalPadding,
    defaultCurrency: "EUR",
    documentLanguage: "lt",
    pdfFooterNote: row.pdfFooterNote ?? null,
    defaultPaymentDays: row.defaultPaymentDays,
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
          <p className="text-sm text-foreground-muted">
            Реквизиты, нумерация документов и параметры PDF. Изменения сохраняются сразу.
          </p>
        </header>
        <SettingsForm initial={initial} />
      </div>
    </AppShell>
  );
}
