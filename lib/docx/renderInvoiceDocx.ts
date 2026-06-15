import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import { buildInvoiceData } from "@/lib/pdf/renderInvoice";
import {
  BG_EMPHASIS,
  docSubtitle,
  docTitle,
  FONT,
  HAIRLINE,
  heading,
  INK,
  MUTED,
  pageSection,
  para,
  partyBoxes,
  totalsBox,
} from "./common";

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: HAIRLINE };
const cellBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
};

function txt(text: string, opts?: { bold?: boolean; color?: string; size?: number }) {
  return new TextRun({
    text,
    bold: opts?.bold,
    color: opts?.color ?? INK,
    size: opts?.size ?? 18,
  });
}

function headCell(text: string, align: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  return new TableCell({
    borders: cellBorders,
    shading: { fill: BG_EMPHASIS },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: align,
        children: [txt(text, { bold: true, size: 16, color: MUTED })],
      }),
    ],
  });
}

function metaRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 20 },
    children: [
      txt(`${label}: `, { color: MUTED, size: 20 }),
      txt(value, { size: 20 }),
    ],
  });
}

/** Рендерит счёт в Word (.docx) Buffer. Без подписи (по требованию). */
export async function renderInvoiceDocx(invoiceId: string): Promise<Buffer> {
  const data = await buildInvoiceData(invoiceId);

  const headerRight = data.seller.website
    ? `${data.seller.website} | ${data.seller.email}`
    : data.seller.email;

  const sellerLines = [
    data.seller.regNumber
      ? `Individualios veiklos pažymos Nr. ${data.seller.regNumber}`
      : null,
    `El. paštas: ${data.seller.email}`,
    data.seller.phone ? `Tel.: ${data.seller.phone}` : null,
    data.seller.website ? `Svetainė: ${data.seller.website}` : null,
    `Wise sąskaita: ${data.seller.iban}`,
  ].filter((l): l is string => !!l);

  const buyerLines = [
    data.buyer.regNumber ? `Įmonės kodas: ${data.buyer.regNumber}` : null,
    data.buyer.vatId ? `PVM mokėtojo kodas: ${data.buyer.vatId}` : null,
    data.buyer.address ? `Registracijos adresas: ${data.buyer.address}` : null,
    data.buyer.representative ? `Atstovaujama ${data.buyer.representative}` : null,
    data.buyer.technicalContactName
      ? `Techninis kontaktas: ${data.buyer.technicalContactName}`
      : null,
    data.buyer.email ? `El. paštas: ${data.buyer.email}` : null,
    data.buyer.phone ? `Tel.: ${data.buyer.phone}` : null,
  ].filter((l): l is string => !!l);

  // Шапка таблицы услуг
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headCell("Nr.", AlignmentType.LEFT),
      headCell("Paslaugos pavadinimas", AlignmentType.LEFT),
      headCell("Kiekis", AlignmentType.RIGHT),
      headCell("Vnt. kaina", AlignmentType.RIGHT),
      headCell("Suma", AlignmentType.RIGHT),
    ],
  });

  const dataCell = (paras: Paragraph[]) =>
    new TableCell({
      borders: cellBorders,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: paras,
    });
  const rightCell = (text: string) =>
    dataCell([
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [txt(text)] }),
    ]);

  const bodyRows = data.items.map((item, idx) => {
    const titleParas: Paragraph[] = [
      new Paragraph({ children: [txt(item.title)] }),
    ];
    if (item.description) {
      titleParas.push(
        new Paragraph({ children: [txt(item.description, { color: MUTED })] }),
      );
    }
    return new TableRow({
      children: [
        dataCell([new Paragraph({ children: [txt(String(idx + 1))] })]),
        dataCell(titleParas),
        rightCell(item.qty),
        rightCell(item.unitPrice),
        rightCell(item.total),
      ],
    });
  });

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [700, 4800, 1100, 1300, 1300],
    rows: [headerRow, ...bodyRows],
  });

  const children: Array<Paragraph | Table> = [
    docTitle("SĄSKAITA FAKTŪRA"),
    docSubtitle(`Nr. ${data.number}`),

    metaRow("Išrašymo data", fmt(data.issuedAt)),
    ...(data.dueAt ? [metaRow("Apmokėti iki", fmt(data.dueAt))] : []),
    ...(data.contractRef ? [metaRow("Sutartis", data.contractRef)] : []),

    new Paragraph({ spacing: { after: 120 }, children: [] }),
    partyBoxes(
      { label: "Pardavėjas / Paslaugų teikėjas", name: data.seller.ownerName, lines: sellerLines },
      { label: "Pirkėjas / Užsakovas", name: data.buyer.name, lines: buyerLines },
    ),

    heading("Paslaugos"),
    itemsTable,

    new Paragraph({ spacing: { after: 100 }, children: [] }),
    totalsBox([
      { label: "Tarpinė suma:", value: data.subtotal },
      { label: "Iš viso apmokėti:", value: data.totalDue, emphasis: true },
      { label: "Suma be PVM", value: data.notVatRegisteredHint },
    ]),
  ];

  if (data.notes) {
    children.push(heading("Pastabos"), para(data.notes));
  }

  children.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [
        txt("Sąskaitą išrašė: ", { color: MUTED, size: 20 }),
        txt(data.issuedByName, { bold: true, size: 20 }),
      ],
    }),
  );

  if (data.pdfFooterNote) {
    children.push(
      new Paragraph({
        spacing: { before: 240 },
        alignment: AlignmentType.CENTER,
        children: [txt(data.pdfFooterNote, { color: MUTED, size: 14 })],
      }),
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [pageSection(children, `Sąskaita faktūra Nr. ${data.number}`, headerRight)],
  });

  return Packer.toBuffer(doc);
}

/** "yyyy-MM-dd" из Date (данные уже приведены к Vilnius-дате в buildInvoiceData). */
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
