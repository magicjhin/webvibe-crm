import { renderToBuffer } from "@react-pdf/renderer";
import { formatInTimeZone } from "date-fns-tz";
import type Decimal from "decimal.js";

import {
  ContractPdf,
  type ContractParty,
  type ContractPdfData,
  type ContractScopeItem,
  type ContractPaymentTerm,
} from "@/components/pdf/ContractPdf";
import { prisma } from "@/lib/db";
import { PROJECT_TZ } from "@/lib/dates/parse";
import {
  contractTermsSchema,
  type ContractTerms,
} from "@/lib/validators/contract";

/** "1234.56" / Decimal → "1 234,56 €" (lt-LT, currency symbol). */
const fmtMoney = (value: Decimal | string | number, currency = "EUR") => {
  const num = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
};

const fmtDate = (d: Date) =>
  formatInTimeZone(d, PROJECT_TZ, "yyyy-MM-dd");

const DEFAULT_BANK_NOTE =
  "Atliekant mokėjimą į Wise sąskaitą, mokėjimo šalyje būtina pasirinkti Belgiją. Mokėjimo paskirtyje rekomenduojama nurodyti Sutarties arba sąskaitos numerį.";

const DEFAULT_WARRANTY =
  "12 (dvylika) mėnesių nuo galutinio darbų perdavimo dienos.";

const DEFAULT_MAINTENANCE_INCLUDES = [
  "Sistemos stabilumo stebėjimą ir klaidų (bugs) šalinimą.",
  "Kritinių saugumo atnaujinimų diegimą.",
  "Smulkių dizaino ar turinio korekcijų atlikimą (iki 2 valandų per mėnesį).",
  "Konsultacijas svetainės veikimo klausimais.",
];

/**
 * Грузит договор + Settings + Client, парсит terms по дискриминатору kind,
 * собирает ContractPdfData и рендерит PDF в Buffer (Node runtime).
 */
export async function renderContractPdf(contractId: string): Promise<Buffer> {
  const [settings, contract] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.contract.findUnique({
      where: { id: contractId },
      include: { client: true },
    }),
  ]);

  if (!settings) throw new Error("Settings not initialised");
  if (!contract) throw new Error("Contract not found");

  // terms — JSON; парсим строго по схеме (kind должен совпадать с contract.kind).
  const parsed = contractTermsSchema.safeParse(contract.terms);
  if (!parsed.success) {
    throw new Error("Contract terms are invalid");
  }
  const terms: ContractTerms = parsed.data;

  const currency = contract.currency || "EUR";

  const provider: ContractParty = {
    role: "PASLAUGŲ TEIKĖJAS",
    name: settings.ownerName,
    lines: [
      settings.personalCode ? `Asmens kodas: ${settings.personalCode}` : null,
      settings.regNumber
        ? `Individualios veiklos pažymos Nr. ${settings.regNumber}`
        : null,
      `El. paštas: ${settings.email}`,
      settings.phone ? `Tel.: ${settings.phone}` : null,
      settings.website ? `Svetainė: ${settings.website}` : null,
    ],
  };

  const c = contract.client;
  const customer: ContractParty = {
    role: "UŽSAKOVAS",
    name: c.name,
    lines: [
      c.regNumber ? `Įmonės kodas: ${c.regNumber}` : null,
      c.vatId ? `PVM mokėtojo kodas: ${c.vatId}` : null,
      c.address ? `Registracijos adresas: ${c.address}` : null,
      c.representative ? `Atstovaujama ${c.representative}` : null,
      c.technicalContactName
        ? `Techninis kontaktas: ${c.technicalContactName}`
        : null,
      c.phone ? `Tel.: ${c.phone}` : null,
      c.email ? `El. paštas: ${c.email}` : null,
    ],
  };

  let scope: ContractScopeItem[] = [];
  let excluded: ContractScopeItem[] = [];
  let paymentTerms: ContractPaymentTerm[] = [];
  let includes: string[] = [];
  let monthlyAmount: string | null = null;

  if (terms.kind === "MAINTENANCE") {
    monthlyAmount = fmtMoney(terms.monthlyAmount, currency);
    includes =
      terms.includes && terms.includes.length > 0
        ? terms.includes
        : DEFAULT_MAINTENANCE_INCLUDES;
  } else {
    // STAGED | ADVANCE
    scope = terms.scope.map((s) => ({
      title: s.title,
      description: s.description ?? null,
    }));
    paymentTerms = terms.paymentTerms.map((p) => ({
      amount: fmtMoney(p.amount, currency),
      label: p.label,
      dueLabel: p.dueLabel ?? null,
    }));
  }

  excluded = (terms.excluded ?? []).map((s) => ({
    title: s.title,
    description: s.description ?? null,
  }));

  const data: ContractPdfData = {
    kind: contract.kind,
    number: contract.number,
    issuedAt: fmtDate(contract.issuedAt),

    subject: terms.subject,
    amount: fmtMoney(contract.amount, currency),
    monthlyAmount,

    scope,
    excluded,
    paymentTerms,
    includes,

    warranty: terms.warranty ?? DEFAULT_WARRANTY,
    termsNote: terms.termsNote ?? null,

    paymentDays: settings.defaultPaymentDays,
    bankNote: settings.bankNote ?? DEFAULT_BANK_NOTE,
    iban: settings.iban,

    provider,
    customer,

    status: contract.status,
    providerSignatureUrl: settings.signatureUrl ?? null,
    signature: {
      signatureUrl: contract.signatureUrl,
      signerName: contract.signerName,
      signedAt: contract.signedAt ? fmtDate(contract.signedAt) : null,
      signerIp: contract.signerIp,
    },
  };

  return renderToBuffer(<ContractPdf data={data} />);
}
