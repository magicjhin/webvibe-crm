import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";

/**
 * .webvibe brand mark on the left, website on the right.
 * The leading dot is part of the brand — keep it.
 */
export function PdfHeader({ rightText }: { rightText?: string }) {
  return (
    <View style={pdfStyles.headerRow} fixed>
      <Text style={pdfStyles.brand}>
        <Text style={pdfStyles.brandDot}>.</Text>webvibe
      </Text>
      {rightText ? <Text style={pdfStyles.headerRight}>{rightText}</Text> : null}
    </View>
  );
}
