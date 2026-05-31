import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PdfHeader } from "./parts/PdfHeader";
import { PdfFooter } from "./parts/PdfFooter";
import { PdfWatermark } from "./parts/PdfWatermark";
import { ensureFontsRegistered, pdfStyles } from "./parts/pdfStyles";

ensureFontsRegistered();

/**
 * ProposalPdf — коммерческое предложение (КП) на литовском.
 * Стиль consistent с ContractPdf/InvoicePdf. Без PVM (ADR-007).
 * Все суммы/даты приходят уже отформатированными (см. renderProposal).
 */

export type ProposalParty = {
  role: string;
  name: string;
  lines: Array<string | null | undefined>;
};

export type ProposalScope = {
  title: string;
  description: string | null;
};

export type ProposalMilestone = {
  name: string;
  deliverable: string | null;
  dueLabel: string | null;
};

export type ProposalPayment = {
  label: string;
  amount: string;
  dueLabel: string | null;
};

export type ProposalLink = {
  label: string;
  url: string;
};

export type ProposalPdfData = {
  number: string;
  title: string;
  /** "yyyy-MM-dd". */
  issuedAt: string;
  /** "yyyy-MM-dd" или null. */
  validUntil: string | null;

  /** Итоговая сумма, отформатирована ("1 000,00 €"). */
  total: string;

  provider: ProposalParty;
  customer: ProposalParty;

  scopeIncluded: ProposalScope[];
  scopeExcluded: ProposalScope[];
  milestones: ProposalMilestone[];
  paymentPlan: ProposalPayment[];
  warranty: string | null;
  portfolioLinks: ProposalLink[];

  pdfFooterNote: string | null;
};

export function ProposalPdf({ data }: { data: ProposalPdfData }) {
  const footerLeft = `Komercinis pasiūlymas Nr. ${data.number}`;

  return (
    <Document title={`Komercinis pasiulymas ${data.number}`}>
      <Page size="A4" style={pdfStyles.page} wrap>
        <PdfWatermark />
        <PdfHeader />

        <Text style={pdfStyles.contractTitle}>KOMERCINIS PASIŪLYMAS</Text>
        <Text style={pdfStyles.contractSub}>Nr. {data.number}</Text>
        <Text style={pdfStyles.contractMeta}>
          {data.issuedAt}, Vilnius
          {data.validUntil ? ` · Galioja iki: ${data.validUntil}` : ""}
        </Text>

        <Text
          style={{
            fontSize: 11,
            fontWeight: 600,
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          {data.title}
        </Text>

        {/* §1 ŠALYS */}
        <Section heading="1. ŠALYS">
          <View style={pdfStyles.partiesColRow}>
            <PartyCol party={data.provider} />
            <PartyCol party={data.customer} />
          </View>
        </Section>

        {/* §2 DARBŲ APIMTIS */}
        <SectionWrap heading="2. DARBŲ APIMTIS">
          {data.scopeIncluded.map((item, idx) => (
            <View key={idx} style={pdfStyles.scopeItem} wrap={false}>
              <Text style={pdfStyles.scopeTitle}>
                2.{idx + 1}. {item.title}
              </Text>
              {item.description ? <Bullet>{item.description}</Bullet> : null}
            </View>
          ))}
        </SectionWrap>

        {/* §3 Į PASIŪLYMĄ NEĮEINA (опционально) */}
        {data.scopeExcluded.length > 0 ? (
          <Section heading="3. Į PASIŪLYMĄ NEĮEINA">
            {data.scopeExcluded.map((item, idx) => (
              <Bullet key={idx}>
                {item.title}
                {item.description ? ` — ${item.description}` : ""}
              </Bullet>
            ))}
          </Section>
        ) : null}

        {/* Этапы / milestones (опционально) */}
        {data.milestones.length > 0 ? (
          <SectionWrap heading="DARBŲ ETAPAI">
            {data.milestones.map((m, idx) => (
              <View key={idx} style={pdfStyles.scopeItem} wrap={false}>
                <Text style={pdfStyles.scopeTitle}>
                  {idx + 1}. {m.name}
                  {m.dueLabel ? ` (${m.dueLabel})` : ""}
                </Text>
                {m.deliverable ? <Bullet>{m.deliverable}</Bullet> : null}
              </View>
            ))}
          </SectionWrap>
        ) : null}

        {/* План оплаты (опционально) */}
        {data.paymentPlan.length > 0 ? (
          <Section heading="ATSISKAITYMO TVARKA">
            {data.paymentPlan.map((p, idx) => (
              <Bullet key={idx}>
                <Text style={pdfStyles.clauseStrong}>{p.amount}</Text> {p.label}
                {p.dueLabel ? ` — ${p.dueLabel}` : ""}
              </Bullet>
            ))}
          </Section>
        ) : null}

        {/* Гарантия (опционально) */}
        {data.warranty ? (
          <Section heading="GARANTIJA">
            <Para>{data.warranty}</Para>
          </Section>
        ) : null}

        {/* Сумма крупно */}
        <View style={pdfStyles.bigAmountWrap} wrap={false}>
          <View style={pdfStyles.bigAmountBox}>
            <Text style={pdfStyles.bigAmountLabel}>Bendra pasiūlymo kaina</Text>
            <Text style={pdfStyles.bigAmountValue}>{data.total}</Text>
            <Text style={pdfStyles.beforePvm}>Suma be PVM</Text>
          </View>
        </View>

        {/* Портфолио (опционально) */}
        {data.portfolioLinks.length > 0 ? (
          <Section heading="PAVYZDŽIAI / PORTFELIS">
            {data.portfolioLinks.map((l, idx) => (
              <Bullet key={idx}>
                {l.label}: {l.url}
              </Bullet>
            ))}
          </Section>
        ) : null}

        {data.pdfFooterNote ? (
          <Text
            style={{
              marginTop: 12,
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

// --- shared small pieces (mirrors ContractPdf) -----------------------------

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <View style={pdfStyles.clauseSection} wrap={false}>
      <Text style={pdfStyles.clauseHeading}>{heading}</Text>
      {children}
    </View>
  );
}

function SectionWrap({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <View style={pdfStyles.clauseSection}>
      <Text style={pdfStyles.clauseHeading}>{heading}</Text>
      {children}
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={pdfStyles.clausePara}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={pdfStyles.bulletRow} wrap={false}>
      <Text style={pdfStyles.bulletDot}>•</Text>
      <Text style={pdfStyles.bulletText}>{children}</Text>
    </View>
  );
}

function PartyCol({ party }: { party: ProposalParty }) {
  const lines = party.lines.filter(
    (l): l is string => !!l && l.trim() !== "",
  );
  return (
    <View style={pdfStyles.partiesCol}>
      <Text style={pdfStyles.partyLabel}>{party.role}</Text>
      <Text style={[pdfStyles.partyName, pdfStyles.partyNameClause]}>
        {party.name}
      </Text>
      {lines.map((l, i) => (
        <Text key={i} style={pdfStyles.partyLine}>
          {l}
        </Text>
      ))}
    </View>
  );
}
