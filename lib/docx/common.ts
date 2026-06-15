import {
  AlignmentType,
  BorderStyle,
  Footer,
  Header,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
  type ISectionOptions,
} from "docx";

import type { ClauseRun } from "@/lib/documents/contractClauses";

/**
 * Общие константы и хелперы для Word-документов (.docx).
 * Цель — чистый, редактируемый документ в фирменном стиле .webvibe,
 * БЕЗ подписей (Word-версия по требованию идёт без подписи).
 */

export const BRAND = "2563EB"; // .webvibe accent (синий)
export const INK = "111114"; // основной текст
export const MUTED = "6B6B73"; // приглушённый
export const HAIRLINE = "E2E2E6"; // тонкие линии таблиц

export const FONT = "Calibri";
export const PAGE_WIDTH_DXA = 9026; // ширина контента A4 при полях ~2см

/** Фирменный header: «.webvibe» слева, контакты справа. */
export function brandHeader(rightText?: string): Header {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: PAGE_WIDTH_DXA }],
        children: [
          new TextRun({ text: ".", bold: true, color: BRAND, size: 22 }),
          new TextRun({ text: "webvibe", bold: true, color: INK, size: 22 }),
          ...(rightText
            ? [
                new TextRun({
                  text: `\t${rightText}`,
                  color: MUTED,
                  size: 16,
                }),
              ]
            : []),
        ],
      }),
    ],
  });
}

/** Фирменный footer: текст слева, «Puslapis N» справа. */
export function brandFooter(leftText: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: PAGE_WIDTH_DXA }],
        children: [
          new TextRun({ text: leftText, color: MUTED, size: 14 }),
          new TextRun({ text: "\tPuslapis ", color: MUTED, size: 14 }),
          new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 14 }),
        ],
      }),
    ],
  });
}

/** Заголовок раздела (§ договора / "Paslaugos" и т.п.). */
export function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, size: 21, color: INK })],
  });
}

/** Обычный абзац. */
export function para(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 20, color: INK })],
  });
}

/** Абзац из rich-run'ов (для общих ClauseRun[]). */
export function richPara(runs: ClauseRun[]): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: runs.map(
      (r) => new TextRun({ text: r.text, bold: r.bold, size: 20, color: INK }),
    ),
  });
}

/** Маркированный пункт из rich-run'ов. */
export function richBullet(runs: ClauseRun[]): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: runs.map(
      (r) => new TextRun({ text: r.text, bold: r.bold, size: 20, color: INK }),
    ),
  });
}

/** Документный заголовок (название документа). */
export function docTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [new TextRun({ text, bold: true, size: 32, color: INK })],
  });
}

export function docSubtitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 22, color: MUTED })],
  });
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

/**
 * Две колонки сторон (Продавец/Покупатель или Teikėjas/Užsakovas)
 * как таблица без рамок — название + строки реквизитов.
 */
export function partiesTable(
  left: { label: string; name: string; lines: string[] },
  right: { label: string; name: string; lines: string[] },
): Table {
  const col = (p: { label: string; name: string; lines: string[] }) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { top: 40, bottom: 40, right: 160 },
      children: [
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: p.label.toUpperCase(),
              bold: true,
              size: 16,
              color: MUTED,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: p.name, bold: true, size: 20, color: INK })],
        }),
        ...p.lines
          .filter((l) => l && l.trim() !== "")
          .map(
            (l) =>
              new Paragraph({
                spacing: { after: 20 },
                children: [new TextRun({ text: l, size: 18, color: INK })],
              }),
          ),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({ children: [col(left), col(right)] })],
  });
}

/** Стандартная секция страницы A4 с brand header/footer. */
export function pageSection(
  children: ISectionOptions["children"],
  footerLeft: string,
  headerRight?: string,
): ISectionOptions {
  return {
    properties: {
      page: {
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
      },
    },
    headers: { default: brandHeader(headerRight) },
    footers: { default: brandFooter(footerLeft) },
    children,
  };
}

// — переэкспорт часто используемого, чтобы рендереры импортировали из одного места —
export {
  AlignmentType,
  BorderStyle,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
};
