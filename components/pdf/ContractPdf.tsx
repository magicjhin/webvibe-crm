import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { PdfHeader } from "./parts/PdfHeader";
import { PdfFooter } from "./parts/PdfFooter";
import { ensureFontsRegistered, pdfStyles } from "./parts/pdfStyles";

ensureFontsRegistered();

/**
 * ContractPdf — единая точка входа для всех трёх типов договора.
 *
 *  - STAGED / ADVANCE → один проектный шаблон `PASLAUGŲ TEIKIMO SUTARTIS`,
 *    §1–§3 + §5–§14 общие, §4 (KAINA) условный по `kind`.
 *  - MAINTENANCE      → отдельный короткий шаблон `INTERNETO SVETAINĖS
 *    TECHNINĖS PRIEŽIŪROS SUTARTIS` (§2–§5).
 *
 * Boilerplate перенесён дословно из CONTRACTS-LT-SOURCE.md (ADR-026).
 * Все суммы/даты приходят УЖЕ отформатированными строками (см. renderContract).
 */

export type ContractParty = {
  /** Заголовок над колонкой ("PASLAUGŲ TEIKĖJAS" / "UŽSAKOVAS"). */
  role: string;
  name: string;
  /** Реквизитные строки; пустые/нулевые отфильтровываются. */
  lines: Array<string | null | undefined>;
};

export type ContractScopeItem = {
  title: string;
  description: string | null;
};

export type ContractPaymentTerm = {
  /** Готовая строка суммы, напр. "1 000,00 €". */
  amount: string;
  label: string;
  dueLabel: string | null;
};

export type ContractSignature = {
  /** PNG в Vercel Blob (заказчик) — вшивается только при status==='signed'. */
  signatureUrl: string | null;
  signerName: string | null;
  /** Дата подписи "yyyy-MM-dd". */
  signedAt: string | null;
  signerIp: string | null;
};

export type ContractPdfData = {
  kind: "STAGED" | "ADVANCE" | "MAINTENANCE";
  number: string;
  /** "yyyy-MM-dd". */
  issuedAt: string;

  /** §2 — РЕДАКТИРУЕМЫЙ предмет (что именно делается). */
  subject: string;
  /** Итоговая сумма договора, отформатирована ("1 000,00 €"). */
  amount: string;
  /** Только для MAINTENANCE — месячная сумма (как правило = amount). */
  monthlyAmount: string | null;

  /** §3 — список работ (STAGED/ADVANCE). */
  scope: ContractScopeItem[];
  /** §3 — опциональные исключения. */
  excluded: ContractScopeItem[];
  /** §4 — платёжные этапы / части (STAGED/ADVANCE). */
  paymentTerms: ContractPaymentTerm[];
  /** MAINTENANCE — список включённых работ. */
  includes: string[];

  /** §9 — гарантия (terms.warranty или дефолт). */
  warranty: string;
  /** Доп. примечание (terms.termsNote), опционально. */
  termsNote: string | null;

  /** Срок оплаты счетов (Settings.defaultPaymentDays). */
  paymentDays: number;
  /** Текст про Wise/Belgiją (Settings.bankNote) или дефолт. */
  bankNote: string;
  iban: string;

  provider: ContractParty;
  customer: ContractParty;

  status: "draft" | "sent" | "signed" | "cancelled";
  /** Подпись исполнителя (Settings.signatureUrl). */
  providerSignatureUrl: string | null;
  /** Подпись заказчика. */
  signature: ContractSignature;
};

const DEFAULT_WARRANTY =
  "12 (dvylika) mėnesių nuo galutinio darbų perdavimo dienos.";

export function ContractPdf({ data }: { data: ContractPdfData }) {
  if (data.kind === "MAINTENANCE") {
    return <MaintenanceContract data={data} />;
  }
  return <ProjectContract data={data} />;
}

// ---------------------------------------------------------------------------
// Общие маленькие компоненты
// ---------------------------------------------------------------------------

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

/** Секция, которой разрешено переноситься между страницами (длинный §3). */
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

function PartiesRow({
  provider,
  customer,
}: {
  provider: ContractParty;
  customer: ContractParty;
}) {
  return (
    <View style={pdfStyles.partiesColRow}>
      <PartyCol party={provider} />
      <PartyCol party={customer} />
    </View>
  );
}

function PartyCol({ party }: { party: ContractParty }) {
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

/** Блок одной подписи (роль + картинка/линия + имя + дата). */
function SignBlock({
  role,
  signatureUrl,
  signerName,
  signedAt,
  signerIp,
}: {
  role: string;
  signatureUrl: string | null;
  signerName: string | null;
  signedAt: string | null;
  signerIp: string | null;
}) {
  return (
    <View style={pdfStyles.signCol} wrap={false}>
      <Text style={pdfStyles.signRole}>{role}</Text>
      {signatureUrl ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image style={pdfStyles.signImage} src={signatureUrl} />
      ) : (
        <View style={pdfStyles.signImagePlaceholder} />
      )}
      <View style={pdfStyles.signLine}>
        <Text style={pdfStyles.signCaption}>(parašas, vardas, pavardė)</Text>
      </View>
      {signerName ? <Text style={pdfStyles.signName}>{signerName}</Text> : null}
      {signedAt ? (
        <Text style={pdfStyles.signMeta}>Pasirašyta: {signedAt}</Text>
      ) : null}
      {signerIp ? (
        <Text style={pdfStyles.signMeta}>IP: {signerIp}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// STAGED / ADVANCE — PASLAUGŲ TEIKIMO SUTARTIS
// ---------------------------------------------------------------------------

function ProjectContract({ data }: { data: ContractPdfData }) {
  const footerLeft = `Paslaugų teikimo sutartis Nr. ${data.number}`;
  const isSigned = data.status === "signed" && !!data.signature.signatureUrl;

  return (
    <Document title={`Paslaugu teikimo sutartis ${data.number}`}>
      <Page size="A4" style={pdfStyles.page} wrap>
        <PdfHeader />

        <Text style={pdfStyles.contractTitle}>PASLAUGŲ TEIKIMO SUTARTIS</Text>
        <Text style={pdfStyles.contractSub}>Nr. {data.number}</Text>
        <Text style={pdfStyles.contractMeta}>{data.issuedAt}, Vilnius</Text>

        {/* §1 ŠALYS */}
        <Section heading="1. ŠALYS">
          <PartiesRow provider={data.provider} customer={data.customer} />
          <Para>
            Šios Šalys, toliau kartu vadinamos Šalimis, o kiekviena atskirai –
            Šalimi, sudaro šią paslaugų teikimo sutartį (toliau – Sutartis).
          </Para>
        </Section>

        {/* §2 SUTARTIES DALYKAS */}
        <Section heading="2. SUTARTIES DALYKAS">
          <Para>
            2.1. Paslaugų teikėjas įsipareigoja suteikti Užsakovui{" "}
            <Text style={pdfStyles.clauseStrong}>{data.subject}</Text> paslaugas,
            o Užsakovas įsipareigoja priimti suteiktas paslaugas ir už jas
            atsiskaityti šioje Sutartyje nustatyta tvarka.
          </Para>
          <Para>
            2.2. Projektas vykdomas etapais. Bendra projekto kaina apima šioje
            Sutartyje nurodytą Užsakovo pateiktą funkcijų sąrašą. Funkcijos,
            kurios nėra nurodytos šioje Sutartyje, arba keičia suderintą projekto
            logiką ir apimtį, laikomos papildomais darbais.
          </Para>
          <Para>
            2.3. Pilna techninė specifikacija rengiama po Sutarties pasirašymo,
            remiantis Užsakovo pateiktu funkcijų sąrašu. Jeigu techninės
            specifikacijos rengimo metu paaiškėja poreikis funkcijoms, kurios
            nėra nurodytos šios Sutarties darbų apimtyje, tokios funkcijos
            laikomos papildomais darbais ir derinamos atskirai raštu.
          </Para>
        </Section>

        {/* §3 DARBŲ APIMTIS — длинный, переносится */}
        <SectionWrap heading="3. DARBŲ APIMTIS">
          <Para>
            3.1. Į projekto darbų apimtį įeina toliau nurodytos funkcijos ir
            moduliai:
          </Para>
          {data.scope.map((item, idx) => (
            <View key={idx} style={pdfStyles.scopeItem} wrap={false}>
              <Text style={pdfStyles.scopeTitle}>
                3.1.{idx + 1}. {item.title}
              </Text>
              {item.description ? <Bullet>{item.description}</Bullet> : null}
            </View>
          ))}
          <Para>
            3.2. Jeigu projekto vykdymo metu Užsakovas pageidauja papildomų
            funkcijų, integracijų, dizaino pakeitimų, papildomų ekranų ar kitų
            darbų, kurie nėra aiškiai nurodyti 3.1 punkte, tokie darbai laikomi
            papildomais darbais. Papildomi darbai atliekami tik Šalims raštu
            suderinus jų apimtį, terminus ir kainą.
          </Para>
          <Para>
            3.3. Trečiųjų šalių paslaugų mokesčiai (serverio nuoma, domenas, SMS
            tiekėjai, el. pašto siuntimas, failų saugykla, mokami API, licencijos
            ir kt.) nėra įtraukti į Sutarties kainą ir apmokami Užsakovo atskirai,
            jeigu Šalys raštu nesusitaria kitaip.
          </Para>
          {data.excluded.length > 0 ? (
            <View wrap={false}>
              <Para>
                3.4. Į Sutarties darbų apimtį neįeina (vykdoma atskirai pagal
                susitarimą):
              </Para>
              {data.excluded.map((item, idx) => (
                <Bullet key={idx}>
                  {item.title}
                  {item.description ? ` — ${item.description}` : ""}
                </Bullet>
              ))}
            </View>
          ) : null}
        </SectionWrap>

        {/* §4 KAINA IR ATSISKAITYMO TVARKA — условный по kind */}
        <SectionWrap heading="4. KAINA IR ATSISKAITYMO TVARKA">
          <Para>
            4.1. Bendra Sutarties kaina už šioje Sutartyje nurodytus darbus yra{" "}
            <Text style={pdfStyles.clauseStrong}>{data.amount}</Text>.
          </Para>

          {data.kind === "ADVANCE" ? (
            <AdvanceTerms paymentTerms={data.paymentTerms} />
          ) : (
            <StagedTerms paymentTerms={data.paymentTerms} />
          )}

          <Para>
            4.3. Paslaugų teikėjas pradeda darbus tik gavęs avansinį mokėjimą.
          </Para>
          <Para>
            4.4. Sąskaitos apmokamos per {data.paymentDays} kalendorinę dieną nuo
            jų pateikimo, jeigu Šalys raštu nesusitaria kitaip.
          </Para>
          <Para>
            4.5. Mokėjimai atliekami į Paslaugų teikėjo Wise sąskaitą:{" "}
            <Text style={pdfStyles.clauseStrong}>{data.iban}</Text>. {data.bankNote}
          </Para>
          <Para>
            4.6. Jeigu Užsakovas vėluoja atlikti mokėjimą, Paslaugų teikėjas turi
            teisę sustabdyti darbus iki mokėjimo gavimo. Tokiu atveju projekto
            terminai atitinkamai pratęsiami.
          </Para>
        </SectionWrap>

        {/* §5–§13 фиксированный boilerplate */}
        <BoilerplateClauses warranty={data.warranty || DEFAULT_WARRANTY} />

        {data.termsNote ? (
          <Section heading="PAPILDOMOS SĄLYGOS">
            <Para>{data.termsNote}</Para>
          </Section>
        ) : null}

        {/* §14 ŠALIŲ REKVIZITAI IR PARAŠAI */}
        <SectionWrap heading="14. ŠALIŲ REKVIZITAI IR PARAŠAI">
          <PartiesRow provider={data.provider} customer={data.customer} />
          <View style={pdfStyles.signRow}>
            <SignBlock
              role="Paslaugų teikėjas"
              signatureUrl={data.providerSignatureUrl}
              signerName={data.provider.name}
              signedAt={null}
              signerIp={null}
            />
            <SignBlock
              role="Užsakovas"
              signatureUrl={isSigned ? data.signature.signatureUrl : null}
              signerName={isSigned ? data.signature.signerName : null}
              signedAt={isSigned ? data.signature.signedAt : null}
              signerIp={isSigned ? data.signature.signerIp : null}
            />
          </View>
        </SectionWrap>

        <PdfFooter leftText={footerLeft} />
      </Page>
    </Document>
  );
}

function StagedTerms({
  paymentTerms,
}: {
  paymentTerms: ContractPaymentTerm[];
}) {
  return (
    <View wrap={false}>
      <Para>4.2. Atsiskaitymas vykdomas etapais:</Para>
      {paymentTerms.map((p, idx) => (
        <Bullet key={idx}>
          <Text style={pdfStyles.clauseStrong}>{p.amount}</Text> {p.label}
          {p.dueLabel ? ` — ${p.dueLabel}` : ""}
        </Bullet>
      ))}
    </View>
  );
}

function AdvanceTerms({
  paymentTerms,
}: {
  paymentTerms: ContractPaymentTerm[];
}) {
  // ADVANCE: backend заполняет paymentTerms двумя частями (аванс / остаток).
  // Уважаем пользовательские label/dueLabel; дефолтная формулировка — только
  // когда срок не задан.
  const advance = paymentTerms[0];
  const balance = paymentTerms[1];
  const DEF_ADVANCE =
    "avansinis mokėjimas mokamas po Sutarties pasirašymo ir prieš pradedant darbus.";
  const DEF_BALANCE =
    "mokama po darbų užbaigimo ir galutinio darbų perdavimo Užsakovui.";
  return (
    <View wrap={false}>
      <Para>4.2. Atsiskaitymas vykdomas dviem dalimis:</Para>
      {advance ? (
        <Bullet>
          <Text style={pdfStyles.clauseStrong}>{advance.amount}</Text> {advance.label}
          {advance.dueLabel ? ` — ${advance.dueLabel}` : ` ${DEF_ADVANCE}`}
        </Bullet>
      ) : null}
      {balance ? (
        <Bullet>
          <Text style={pdfStyles.clauseStrong}>{balance.amount}</Text> {balance.label}
          {balance.dueLabel ? ` — ${balance.dueLabel}` : ` ${DEF_BALANCE}`}
        </Bullet>
      ) : null}
    </View>
  );
}

/**
 * §5–§13 — фиксированный boilerplate проектного договора (DSK PDF, стр. 3–5).
 * Параметризуем только §9 GARANTIJA через `warranty`.
 */
function BoilerplateClauses({ warranty }: { warranty: string }) {
  return (
    <>
      <Section heading="5. DARBŲ TERMINAI">
        <Para>
          5.1. Darbai pradedami gavus avansinį mokėjimą ir Užsakovui pateikus
          visą darbams pradėti reikalingą medžiagą bei prieigas.
        </Para>
        <Para>
          5.2. Konkretūs etapų terminai derinami Šalių raštu (el. paštu) ir gali
          būti pratęsiami, jeigu Užsakovas vėluoja pateikti medžiagą, atsakymus
          ar mokėjimus.
        </Para>
      </Section>

      <Section heading="6. UŽSAKOVO ĮSIPAREIGOJIMAI">
        <Para>
          6.1. Užsakovas įsipareigoja laiku pateikti Paslaugų teikėjui visą
          darbams reikalingą informaciją, medžiagą (tekstus, logotipus,
          nuotraukas) ir prieigas.
        </Para>
        <Para>
          6.2. Užsakovas įsipareigoja per protingą terminą peržiūrėti pateiktus
          darbus ir pateikti pastabas arba juos patvirtinti.
        </Para>
        <Para>
          6.3. Užsakovas atsako už jam pateiktos medžiagos teisėtumą ir teises ją
          naudoti.
        </Para>
      </Section>

      <Section heading="7. PASLAUGŲ TEIKĖJO ĮSIPAREIGOJIMAI">
        <Para>
          7.1. Paslaugų teikėjas įsipareigoja atlikti darbus kokybiškai, laikantis
          gerosios praktikos ir suderintos apimties.
        </Para>
        <Para>
          7.2. Paslaugų teikėjas informuoja Užsakovą apie darbų eigą ir esmines
          aplinkybes, galinčias turėti įtakos terminams ar apimčiai.
        </Para>
      </Section>

      <Section heading="8. DARBŲ PERDAVIMAS IR PRIĖMIMAS">
        <Para>
          8.1. Užbaigti darbai (etapas) perduodami Užsakovui pateikiant prieigą
          arba rezultatą peržiūrai.
        </Para>
        <Para>
          8.2. Jeigu Užsakovas per 5 (penkias) darbo dienas nepateikia pastabų,
          darbai laikomi priimtais.
        </Para>
      </Section>

      <Section heading="9. GARANTIJA">
        <Para>
          9.1. Paslaugų teikėjas suteikia atliktų darbų garantiją – {warranty}
        </Para>
        <Para>
          9.2. Garantija netaikoma trūkumams, atsiradusiems dėl Užsakovo ar
          trečiųjų šalių veiksmų, neteisėto naudojimo, savavališkų pakeitimų ar
          trečiųjų šalių paslaugų sutrikimų.
        </Para>
      </Section>

      <Section heading="10. INTELEKTINĖ NUOSAVYBĖ">
        <Para>
          10.1. Visiškai apmokėjus Sutarties kainą, sukurto rezultato turtinės
          teisės pereina Užsakovui, išskyrus trečiųjų šalių komponentus ir
          licencijuojamą programinę įrangą.
        </Para>
        <Para>
          10.2. Paslaugų teikėjas turi teisę naudoti atliktą darbą savo portfelyje,
          jeigu Šalys raštu nesusitaria kitaip.
        </Para>
      </Section>

      <Section heading="11. KONFIDENCIALUMAS">
        <Para>
          11.1. Šalys įsipareigoja neatskleisti tretiesiems asmenims
          konfidencialios informacijos, gautos vykdant šią Sutartį.
        </Para>
      </Section>

      <Section heading="12. SUTARTIES NUTRAUKIMAS">
        <Para>
          12.1. Sutartis gali būti nutraukta Šalių susitarimu arba vienos Šalies
          iniciatyva, jei kita Šalis iš esmės pažeidžia Sutartį.
        </Para>
        <Para>
          12.2. Nutraukus Sutartį, Užsakovas apmoka už faktiškai atliktus darbus
          iki nutraukimo dienos.
        </Para>
      </Section>

      <Section heading="13. BAIGIAMOSIOS NUOSTATOS">
        <Para>
          13.1. Sutarčiai taikoma Lietuvos Respublikos teisė. Ginčai sprendžiami
          derybomis, o nepavykus susitarti – Lietuvos Respublikos teismuose.
        </Para>
        <Para>
          13.2. Sutartis sudaryta dviem vienodą teisinę galią turinčiais
          egzemplioriais, po vieną kiekvienai Šaliai (arba elektroniniu būdu).
        </Para>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// MAINTENANCE — INTERNETO SVETAINĖS TECHNINĖS PRIEŽIŪROS SUTARTIS
// ---------------------------------------------------------------------------

function MaintenanceContract({ data }: { data: ContractPdfData }) {
  const footerLeft = `Techninės priežiūros sutartis Nr. ${data.number}`;
  const isSigned = data.status === "signed" && !!data.signature.signatureUrl;
  const monthly = data.monthlyAmount ?? data.amount;

  return (
    <Document title={`Technines prieziuros sutartis ${data.number}`}>
      <Page size="A4" style={pdfStyles.page} wrap>
        <PdfHeader />

        <Text style={pdfStyles.contractTitle}>
          INTERNETO SVETAINĖS TECHNINĖS PRIEŽIŪROS SUTARTIS
        </Text>
        <Text style={pdfStyles.contractSub}>Nr. {data.number}</Text>
        <Text style={pdfStyles.contractMeta}>{data.issuedAt}, Vilnius</Text>

        {/* §1 ŠALYS */}
        <Section heading="1. ŠALYS">
          <PartiesRow provider={data.provider} customer={data.customer} />
          <Para>
            Šios Šalys, toliau kartu vadinamos Šalimis, o kiekviena atskirai –
            Šalimi, sudarė šią interneto svetainės techninės priežiūros sutartį
            (toliau – Sutartis).
          </Para>
        </Section>

        {/* §2 SUTARTIES DALYKAS */}
        <Section heading="2. SUTARTIES DALYKAS">
          <Para>
            2.1. <Text style={pdfStyles.clauseStrong}>Paslaugų apimtis:</Text>{" "}
            Paslaugų teikėjas įsipareigoja vykdyti nuolatinę techninę Užsakovo
            svetainės priežiūrą, kuri apima:
          </Para>
          {data.includes.map((line, idx) => (
            <Bullet key={idx}>{line}</Bullet>
          ))}
          <Para>
            2.2.{" "}
            <Text style={pdfStyles.clauseStrong}>Atsakomybės ribos:</Text>{" "}
            Palaikymas neapima naujų didelės apimties modulių kūrimo ar esminio
            svetainės perdarymo, dėl kurių šalys tariasi atskirai.
          </Para>
        </Section>

        {/* §3 ATLYGIS IR ATSISKAITYMO TVARKA */}
        <Section heading="3. ATLYGIS IR ATSISKAITYMO TVARKA">
          <Para>
            3.1. Paslaugų kaina yra{" "}
            <Text style={pdfStyles.clauseStrong}>{monthly}</Text> už vieną
            kalendorinį mėnesį.
          </Para>
          <Para>
            3.2. <Text style={pdfStyles.clauseStrong}>Mokėjimo tvarka:</Text>{" "}
            Užsakovas moka fiksuotą mėnesinį mokestį prieš prasidedant paslaugų
            teikimo laikotarpiui (išankstinis apmokėjimas).
          </Para>
          <Para>
            3.3. Sąskaita išrašoma kiekvieno mėnesio pradžioje, o apmokėjimas turi
            būti atliktas per 3 (tris) darbo dienas.
          </Para>
          <Para>
            3.4. <Text style={pdfStyles.clauseStrong}>Svarbu:</Text> Atliekant
            pavedimą į Wise sąskaitą (
            <Text style={pdfStyles.clauseStrong}>{data.iban}</Text>), mokėjimo
            nurodyme būtina pasirinkti šalį –{" "}
            <Text style={pdfStyles.clauseStrong}>Belgiją</Text>.
          </Para>
        </Section>

        {/* §4 TERMINAI IR NUTRAUKIMAS */}
        <Section heading="4. TERMINAI IR NUTRAUKIMAS">
          <Para>4.1. Sutartis sudaroma neterminuotam laikotarpiui.</Para>
          <Para>
            4.2. Kiekviena šalis gali nutraukti sutartį informavusi kitą šalį
            prieš 30 kalendorinių dienų.
          </Para>
        </Section>

        {/* §5 GARANTIJA IR ATSAKOMYBĖ */}
        <Section heading="5. GARANTIJA IR ATSAKOMYBĖ">
          <Para>
            5.1. Paslaugų teikėjas užtikrina stabilų svetainės veikimą ir techninę
            priežiūrą pagal suteiktas prieigas.
          </Para>
          <Para>
            5.2. Teikėjas neatsako už sutrikimus, kilusius dėl trečiųjų šalių
            (hostingo, domenų) kaltės, jei jie nepatenka į Teikėjo kontrolės
            sritį.
          </Para>
          {data.termsNote ? <Para>{data.termsNote}</Para> : null}
        </Section>

        {/* Реквизиты + подписи */}
        <SectionWrap heading="ŠALIŲ REKVIZITAI IR PARAŠAI">
          <PartiesRow provider={data.provider} customer={data.customer} />
          <View style={pdfStyles.signRow}>
            <SignBlock
              role="Paslaugų teikėjas"
              signatureUrl={data.providerSignatureUrl}
              signerName={data.provider.name}
              signedAt={null}
              signerIp={null}
            />
            <SignBlock
              role="Užsakovas"
              signatureUrl={isSigned ? data.signature.signatureUrl : null}
              signerName={isSigned ? data.signature.signerName : null}
              signedAt={isSigned ? data.signature.signedAt : null}
              signerIp={isSigned ? data.signature.signerIp : null}
            />
          </View>
        </SectionWrap>

        <PdfFooter leftText={footerLeft} />
      </Page>
    </Document>
  );
}
