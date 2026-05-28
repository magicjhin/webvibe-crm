import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";

export function PdfFooter({ leftText }: { leftText: string }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text>{leftText}</Text>
      <Text
        render={({ pageNumber }) => `Puslapis ${pageNumber}`}
      />
    </View>
  );
}
