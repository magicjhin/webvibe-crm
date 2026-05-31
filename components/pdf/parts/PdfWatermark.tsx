import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";

/**
 * Watermark рендерится `fixed` — это убирает баг @react-pdf, когда
 * full-bleed absolute-блок (top/left/right/bottom: 0) БЕЗ `fixed`
 * засчитывался в высоту потока первой страницы и выталкивал контент,
 * создавая пустую первую страницу на многостраничных документах.
 *
 * Используется только в счёте и КП. В договоре watermark убран намеренно.
 */
export function PdfWatermark() {
  return (
    <View style={pdfStyles.watermark} fixed>
      <Text style={pdfStyles.watermarkText}>webvibe</Text>
    </View>
  );
}
