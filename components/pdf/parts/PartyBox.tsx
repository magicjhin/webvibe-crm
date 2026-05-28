import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./pdfStyles";

export type PartyLine = string | null | undefined;

export function PartyBox({
  label,
  name,
  lines,
}: {
  label: string;
  name: string;
  lines: PartyLine[];
}) {
  return (
    <View style={pdfStyles.partyBox}>
      <Text style={pdfStyles.partyLabel}>{label}</Text>
      <Text style={pdfStyles.partyName}>{name}</Text>
      {lines.filter((l): l is string => !!l && l.trim() !== "").map((l, i) => (
        <Text key={i} style={pdfStyles.partyLine}>
          {l}
        </Text>
      ))}
    </View>
  );
}
