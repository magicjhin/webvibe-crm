import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";

/**
 * Watermark рендерится без `fixed` — это значит он есть только на первой
 * странице. Если фон нужен на каждой странице (multi-page invoice — редко
 * для нашего workflow), можно добавить `fixed`, но тогда react-pdf
 * рисует watermark ПОВЕРХ контента, что нам не нужно.
 */
export function PdfWatermark() {
  return (
    <View style={pdfStyles.watermark}>
      <Text style={pdfStyles.watermarkText}>webvibe</Text>
    </View>
  );
}
