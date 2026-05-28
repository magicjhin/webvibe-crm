import { Document, Page, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { PdfHeader } from "./parts/PdfHeader";
import { PdfFooter } from "./parts/PdfFooter";
import { PdfWatermark } from "./parts/PdfWatermark";
import { PartyBox } from "./parts/PartyBox";
import { ensureFontsRegistered, pdfStyles } from "./parts/pdfStyles";

ensureFontsRegistered();

export type InvoicePdfData = {
  number: string;
  issuedAt: Date;
  dueAt: Date | null;
  contractRef: string | null; // "Paslaugų teikimo sutartis Nr. WVS..." or null
  notes: string | null;

  seller: {
    name: string;
    ownerName: string;
    regNumber: string | null;
    email: string;
    phone: string | null;
    website: string | null;
    iban: string;
    bankNote: string | null;
  };

  buyer: {
    name: string;
    regNumber: string | null;
    vatId: string | null;
    address: string | null;
    representative: string | null;
    technicalContactName: string | null;
    email: string | null;
    phone: string | null;
  };

  items: Array<{
    title: string;
    description: string | null;
    qty: string; // pre-formatted number ("1", "1,5")
    unitPrice: string; // pre-formatted EUR ("1000,00 EUR")
    total: string;
  }>;

  subtotal: string;
  totalDue: string;
  notVatRegisteredHint: string; // "—" или "Pardavėjas nėra PVM mokėtojas"

  issuedByName: string;
  pdfFooterNote: string | null;
};

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd", { locale: lt });

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const footerLeft = `Sąskaita faktūra Nr. ${data.number}`;
  const headerRight = data.seller.website
    ? `${data.seller.website} | ${data.seller.email}`
    : data.seller.email;

  const sellerLines = [
    data.seller.ownerName,
    data.seller.regNumber
      ? `Individualios veiklos pažymos Nr. ${data.seller.regNumber}`
      : null,
    `El. paštas: ${data.seller.email}`,
    data.seller.phone ? `Tel.: ${data.seller.phone}` : null,
    data.seller.website ? `Svetainė: ${data.seller.website}` : null,
    `Wise sąskaita: ${data.seller.iban}`,
  ];

  const buyerLines = [
    data.buyer.regNumber ? `Įmonės kodas: ${data.buyer.regNumber}` : null,
    data.buyer.vatId ? `PVM mokėtojo kodas: ${data.buyer.vatId}` : null,
    data.buyer.address ? `Registracijos adresas: ${data.buyer.address}` : null,
    data.buyer.representative
      ? `Atstovaujama ${data.buyer.representative}`
      : null,
    data.buyer.technicalContactName
      ? `Techninis kontaktas: ${data.buyer.technicalContactName}`
      : null,
    data.buyer.email ? `El. paštas: ${data.buyer.email}` : null,
    data.buyer.phone ? `Tel.: ${data.buyer.phone}` : null,
  ];

  return (
    <Document title={`Saskaita faktura ${data.number}`}>
      <Page size="A4" style={pdfStyles.page} wrap>
        <PdfWatermark />
        <PdfHeader rightText={headerRight} />

        <Text style={pdfStyles.docTitle}>SĄSKAITA FAKTŪRA</Text>
        <Text style={pdfStyles.docNumber}>Nr. {data.number}</Text>

        {/* Meta */}
        <View style={pdfStyles.metaTable}>
          <MetaRow label="Išrašymo data" value={fmtDate(data.issuedAt)} />
          {data.dueAt ? (
            <MetaRow label="Apmokėti iki" value={fmtDate(data.dueAt)} />
          ) : null}
          {data.contractRef ? (
            <MetaRow label="Sutartis" value={data.contractRef} />
          ) : null}
        </View>

        {/* Parties */}
        <View style={pdfStyles.partyRow}>
          <PartyBox
            label="Pardavėjas / Paslaugų teikėjas"
            name={data.seller.ownerName}
            lines={sellerLines.slice(1)}
          />
          <PartyBox
            label="Pirkėjas / Užsakovas"
            name={data.buyer.name}
            lines={buyerLines}
          />
        </View>

        {/* Items */}
        <Text style={pdfStyles.sectionTitle}>Paslaugos</Text>
        <View style={pdfStyles.itemsTable}>
          <View style={pdfStyles.itemsHeader}>
            <Text style={pdfStyles.colNr}>Nr.</Text>
            <Text style={pdfStyles.colTitle}>Paslaugos pavadinimas</Text>
            <Text style={pdfStyles.colQty}>Kiekis</Text>
            <Text style={pdfStyles.colUnit}>Vnt. kaina</Text>
            <Text style={pdfStyles.colSum}>Suma</Text>
          </View>
          {data.items.map((item, idx) => (
            <View
              key={idx}
              style={[
                pdfStyles.itemsRow,
                idx === data.items.length - 1 ? pdfStyles.itemsRowLast : {},
              ]}
              wrap={false}
            >
              <Text style={pdfStyles.colNr}>{idx + 1}</Text>
              <View style={pdfStyles.colTitle}>
                <Text>{item.title}</Text>
                {item.description ? (
                  <Text style={{ color: "#6B6B73", marginTop: 2 }}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Text style={pdfStyles.colQty}>{item.qty}</Text>
              <Text style={pdfStyles.colUnit}>{item.unitPrice}</Text>
              <Text style={pdfStyles.colSum}>{item.total}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={pdfStyles.totalsWrap} wrap={false}>
          <View style={pdfStyles.totalsBox}>
            <View style={pdfStyles.totalsRow}>
              <Text>Tarpinė suma:</Text>
              <Text>{data.subtotal}</Text>
            </View>
            <View style={[pdfStyles.totalsRow, pdfStyles.totalsRowLast]}>
              <Text>Iš viso apmokėti:</Text>
              <Text>{data.totalDue}</Text>
            </View>
            <View style={pdfStyles.totalsRow}>
              <Text>Suma be PVM</Text>
              <Text>{data.notVatRegisteredHint}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes ? (
          <View style={pdfStyles.notesBlock} wrap={false}>
            <Text style={pdfStyles.sectionTitle}>Pastabos</Text>
            <Text style={pdfStyles.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* Issued by */}
        <View style={pdfStyles.issuedByRow} wrap={false}>
          <Text style={pdfStyles.issuedByLabel}>Sąskaitą išrašė:</Text>
          <Text style={pdfStyles.issuedByValue}>{data.issuedByName}</Text>
        </View>

        {data.pdfFooterNote ? (
          <Text
            style={{
              marginTop: 18,
              fontSize: 8,
              color: "#9A9AA0",
              textAlign: "center",
            }}
          >
            {data.pdfFooterNote}
          </Text>
        ) : null}

        <PdfFooter leftText={footerLeft} />
      </Page>
    </Document>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.metaRow}>
      <Text style={pdfStyles.metaLabel}>{label}</Text>
      <Text style={pdfStyles.metaValue}>{value}</Text>
    </View>
  );
}
