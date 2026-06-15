import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { lt } from "date-fns/locale";
import type Decimal from "decimal.js";

import { InvoicePdf, type InvoicePdfData } from "@/components/pdf/InvoicePdf";
import { prisma } from "@/lib/db";
import { PROJECT_TZ } from "@/lib/dates/parse";

const fmtMoney = (value: Decimal | string | number) => {
  const num = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(num)
    // lt-LT puts the currency code after the amount: "1 000,00 €" → we want "1000,00 EUR".
    .replace("€", "EUR")
    .replace(/\s+EUR/, " EUR")
    .trim();
};

const fmtQty = (value: Decimal | string | number) => {
  const num = typeof value === "number" ? value : Number(value.toString());
  // Show integer for whole numbers, otherwise 2 decimals
  if (Number.isInteger(num)) return String(num);
  return num.toLocaleString("lt-LT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Loads Settings + invoice (items/client/project) and assembles InvoicePdfData.
 * Shared by the PDF renderer and the Word (.docx) renderer so both stay in sync.
 */
export async function buildInvoiceData(
  invoiceId: string,
): Promise<InvoicePdfData> {
  const [settings, invoice] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        project: { select: { id: true, title: true } },
        items: { orderBy: { order: "asc" } },
      },
    }),
  ]);

  if (!settings) throw new Error("Settings not initialised");
  if (!invoice) throw new Error("Invoice not found");

  // Vilnius date (PDF reader expects local dates, not UTC instants).
  const issuedAt = new Date(
    formatInTimeZone(invoice.issuedAt, PROJECT_TZ, "yyyy-MM-dd'T'00:00:00"),
  );
  const dueAt = invoice.dueAt
    ? new Date(formatInTimeZone(invoice.dueAt, PROJECT_TZ, "yyyy-MM-dd'T'00:00:00"))
    : null;

  const data: InvoicePdfData = {
    number: invoice.number,
    issuedAt,
    dueAt,
    contractRef: null, // wired up in Iter 4 when contracts exist
    notes: invoice.notes ?? settings.bankNote ?? null,

    seller: {
      name: settings.companyName,
      ownerName: settings.ownerName,
      regNumber: settings.regNumber,
      email: settings.email,
      phone: settings.phone,
      website: settings.website,
      iban: settings.iban,
      bankNote: settings.bankNote,
    },

    buyer: {
      name: invoice.client.name,
      regNumber: invoice.client.regNumber,
      vatId: invoice.client.vatId,
      address: invoice.client.address,
      representative: invoice.client.representative,
      technicalContactName: invoice.client.technicalContactName,
      email: invoice.client.email,
      phone: invoice.client.phone,
    },

    items: invoice.items.map((item) => ({
      title: item.title,
      description: item.description,
      qty: fmtQty(item.qty),
      unitPrice: fmtMoney(item.unitPrice),
      total: fmtMoney(item.total),
    })),

    subtotal: fmtMoney(invoice.subtotal),
    totalDue: fmtMoney(invoice.total),
    // ADR-007: я не плательщик PVM. В шаблоне не считаем PVM, а явно
    // указываем "Suma be PVM" со строкой-пояснением вместо строки "PVM 0,00 EUR".
    notVatRegisteredHint: "Pardavėjas nėra PVM mokėtojas",

    issuedByName: settings.ownerName,
    pdfFooterNote: settings.pdfFooterNote,
  };

  // touch `format`/`lt` so tree-shaking keeps them
  void format(new Date(), "yyyy-MM-dd", { locale: lt });

  return data;
}

/**
 * Builds the data object for InvoicePdf and renders it to a Buffer.
 * Reads Settings (singleton) + the invoice with items + client + project.
 */
export async function renderInvoicePdf(invoiceId: string): Promise<Buffer> {
  const data = await buildInvoiceData(invoiceId);
  return renderToBuffer(<InvoicePdf data={data} />);
}
