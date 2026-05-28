import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";

export function PdfWatermark() {
  return (
    <View style={pdfStyles.watermark} fixed>
      <Text style={pdfStyles.watermarkText}>webvibe</Text>
    </View>
  );
}
