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
 * Цель — чтобы Word визуально совпадал с PDF (@react-pdf/renderer):
 * та же палитра, тот же фирменный header/footer, рамочные блоки сторон и
 * итогов. БЕЗ подписей (Word-версия по требованию идёт без подписи).
 *
 * Палитра зеркалит components/pdf/parts/pdfStyles.ts → colors.
 */

export const BLACK = "0A0A0B"; // бренд / сильные заголовки (= colors.black)
export const INK = "1A1A1F"; // основной текст (= colors.text)
export const MUTED = "6B6B73"; // приглушённый (= colors.textMuted)
export const SUBTLE = "9A9AA0"; // ещё бледнее, мелкие подписи (= colors.textSubtle)
export const HAIRLINE = "E5E5E8"; // тонкие линии таблиц (= colors.border)
export const HAIRLINE_STRONG = "C9C9CC"; // более заметные линии (= colors.borderStrong)
export const BG_EMPHASIS = "F0F0F2"; // фон шапок таблиц / выделенной строки

/** @deprecated оставлен для обратной совместимости импортов; теперь = BLACK. */
export const BRAND = BLACK;

// Inter в .docx без embed'а не доступен на машинах без него → Word подставит
// что попало. Arial — ближайший гарантированно доступный (Win + macOS/Pages)
// к Inter гротеск, поэтому даёт наиболее близкий к PDF вид.
export const FONT = "Arial";
export const PAGE_WIDTH_DXA = 9026; // ширина контента A4 при полях ~2см

/** Фирменный header: «.webvibe» слева (чёрный, как в PDF), контакты справа. */
export function brandHeader(rightText?: string): Header {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: PAGE_WIDTH_DXA }],
        children: [
          new TextRun({ text: ".", bold: true, color: BLACK, size: 28 }),
          new TextRun({ text: "webvibe", bold: true, color: BLACK, size: 28 }),
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
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: HAIRLINE, space: 6 },
        },
        children: [
          new TextRun({ text: leftText, color: SUBTLE, size: 14 }),
          new TextRun({ text: "\tPuslapis ", color: SUBTLE, size: 14 }),
          new TextRun({ children: [PageNumber.CURRENT], color: SUBTLE, size: 14 }),
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
    children: [new TextRun({ text, bold: true, size: 21, color: BLACK })],
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

/**
 * Документный заголовок (название документа).
 * align — LEFT для счёта (как в PDF docTitle), CENTER для договора
 * (как в PDF contractTitle).
 */
export function docTitle(
  text: string,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
): Paragraph {
  const centered = align === AlignmentType.CENTER;
  return new Paragraph({
    alignment: align,
    spacing: { before: 120, after: centered ? 20 : 40 },
    children: [
      new TextRun({ text, bold: true, size: centered ? 30 : 44, color: BLACK }),
    ],
  });
}

/**
 * Номер документа под заголовком. В PDF номер — INK semibold (не приглушённый).
 * align повторяет выравнивание заголовка.
 */
export function docSubtitle(
  text: string,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
): Paragraph {
  return new Paragraph({
    alignment: align,
    spacing: { after: align === AlignmentType.CENTER ? 40 : 160 },
    children: [new TextRun({ text, bold: true, size: 22, color: INK })],
  });
}

/** Мелкая приглушённая мета-строка под номером (дата/город договора). */
export function docMeta(
  text: string,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
): Paragraph {
  return new Paragraph({
    alignment: align,
    spacing: { after: 200 },
    children: [new TextRun({ text, size: 17, color: MUTED })],
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
const HL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: HAIRLINE };
const boxBorders = {
  top: HL_BORDER,
  bottom: HL_BORDER,
  left: HL_BORDER,
  right: HL_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

type PartySide = { label: string; name: string; lines: string[] };

/**
 * Две колонки сторон. Таблица без видимых рамок.
 * Используется в договоре (§1 / §13) — в PDF там тоже стороны без рамок
 * (pdfStyles.partiesColRow).
 */
export function partiesTable(left: PartySide, right: PartySide): Table {
  const col = (p: PartySide) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { top: 40, bottom: 40, right: 160 },
      children: partyCellContent(p),
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({ children: [col(left), col(right)] })],
  });
}

/**
 * Две стороны в рамочных блоках со светлым фоном — как PDF pdfStyles.partyBox
 * в счёте. Между блоками — тонкая колонка-распорка (rounded corners в docx
 * невозможны, но рамка + padding дают близкий вид).
 */
export function partyBoxes(left: PartySide, right: PartySide): Table {
  const box = (p: PartySide) =>
    new TableCell({
      width: { size: 47, type: WidthType.PERCENTAGE },
      borders: boxBorders,
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      children: partyCellContent(p),
    });
  const spacer = new TableCell({
    width: { size: 6, type: WidthType.PERCENTAGE },
    borders: noBorders,
    children: [new Paragraph({ children: [] })],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({ children: [box(left), spacer, box(right)] })],
  });
}

function partyCellContent(p: PartySide): Paragraph[] {
  return [
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
  ];
}

/**
 * Рамочный блок итогов справа — как PDF pdfStyles.totalsBox в счёте.
 * Последняя «итоговая» строка — на сером фоне и жирная.
 */
export function totalsBox(
  rows: Array<{ label: string; value: string; emphasis?: boolean }>,
): Table {
  return new Table({
    alignment: AlignmentType.RIGHT,
    width: { size: 5200, type: WidthType.DXA },
    columnWidths: [3000, 2200],
    borders: {
      top: HL_BORDER,
      bottom: HL_BORDER,
      left: HL_BORDER,
      right: HL_BORDER,
      insideHorizontal: HL_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: rows.map(
      (r) =>
        new TableRow({
          children: [
            new TableCell({
              borders: {
                top: NO_BORDER,
                bottom: HL_BORDER,
                left: NO_BORDER,
                right: NO_BORDER,
              },
              shading: r.emphasis ? { fill: BG_EMPHASIS } : undefined,
              margins: { top: 80, bottom: 80, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: r.label,
                      bold: r.emphasis,
                      size: 20,
                      color: MUTED,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: {
                top: NO_BORDER,
                bottom: HL_BORDER,
                left: NO_BORDER,
                right: NO_BORDER,
              },
              shading: r.emphasis ? { fill: BG_EMPHASIS } : undefined,
              margins: { top: 80, bottom: 80, left: 140, right: 140 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: r.value,
                      bold: r.emphasis,
                      size: 20,
                      color: INK,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    ),
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
