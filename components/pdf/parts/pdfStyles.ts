import path from "node:path";
import { StyleSheet, Font } from "@react-pdf/renderer";

/**
 * Inter TTF для PDF — лежат локально в assets/fonts/. Шрифты содержат
 * latin + latin-ext, обязательно для литовских диакритик (ą, č, ę, ė, į,
 * š, ų, ū, ž) — без них рендерятся .notdef прямоугольники.
 *
 * Ранее грузились с fonts.gstatic.com, но Google ротирует hash в URL'ах →
 * 404 в production. Локальные файлы гарантируют детерминизм.
 *
 * Файлы взяты из @expo-google-fonts/inter (Google Fonts официальные TTF).
 * См. assets/fonts/README.md (если будет).
 */
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

let fontsRegistered = false;
export function ensureFontsRegistered() {
  if (fontsRegistered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(FONT_DIR, "Inter-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Inter-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "Inter-Bold.ttf"), fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

/**
 * Общие стили PDF документов — счёт, договор, КП.
 * Все размеры в точках (1 pt = 1/72 дюйма). A4 = 595 x 842 pt.
 */
export const colors = {
  black: "#0A0A0B",
  text: "#1A1A1F",
  textMuted: "#6B6B73",
  textSubtle: "#9A9AA0",
  border: "#E5E5E8",
  borderStrong: "#C9C9CC",
  bg: "#FFFFFF",
  bgRow: "#F7F7F8",
  bgEmphasis: "#F0F0F2",
};

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: colors.text,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
  },

  /* Header */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brand: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.black,
  },
  brandDot: {
    color: colors.black,
  },
  headerRight: {
    fontSize: 8,
    color: colors.textMuted,
  },

  /* Document title */
  docTitle: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  docNumber: {
    fontSize: 11,
    fontWeight: 600,
    marginTop: 2,
    marginBottom: 16,
  },

  /* Meta block (Issued / Due / Contract) */
  metaTable: {
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    width: 110,
    color: colors.textMuted,
  },
  metaValue: {
    flex: 1,
    color: colors.text,
  },

  /* Party boxes side-by-side */
  partyRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 10,
  },
  partyLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  partyName: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
  },
  partyLine: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: colors.text,
  },

  /* Section heading */
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    marginTop: 8,
    marginBottom: 8,
  },

  /* Items table */
  itemsTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginBottom: 12,
  },
  itemsHeader: {
    flexDirection: "row",
    backgroundColor: colors.bgEmphasis,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontWeight: 600,
    fontSize: 8.5,
  },
  itemsRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemsRowLast: {
    borderBottomWidth: 0,
  },
  colNr: { width: 28 },
  colTitle: { flex: 1, paddingRight: 8 },
  colQty: { width: 50, textAlign: "right" },
  colUnit: { width: 80, textAlign: "right" },
  colSum: { width: 80, textAlign: "right" },

  /* Totals */
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 18,
  },
  totalsBox: {
    width: 260,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalsRowLast: {
    borderBottomWidth: 0,
    backgroundColor: colors.bgEmphasis,
    fontWeight: 700,
  },

  /* Notes */
  notesBlock: {
    marginTop: 4,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.45,
    color: colors.text,
  },

  /* Issued-by line */
  issuedByRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  issuedByLabel: {
    width: 110,
    color: colors.textMuted,
  },
  issuedByValue: {
    flex: 1,
  },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.textSubtle,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },

  /* Watermark (vertical, faint) */
  watermark: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.06,
  },
  watermarkText: {
    fontSize: 90,
    fontWeight: 700,
    transform: "rotate(-90deg)",
    width: 600,
    textAlign: "center",
  },
});
