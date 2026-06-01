import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { PdfHeader } from "./parts/PdfHeader";
import { PdfFooter } from "./parts/PdfFooter";
import { ensureFontsRegistered, pdfStyles } from "./parts/pdfStyles";

ensureFontsRegistered();

/**
 * ContractPdf — единая точка входа для всех трёх типов договора.
 *
 *  - STAGED / ADVANCE → проектный шаблон `PASLAUGŲ TEIKIMO SUTARTIS`,
 *    §1 ŠALYS, §2 DALYKAS+APIMTIS, §3 APMOKĖJIMAS (платёжные части условны
 *    по `kind`), §4–§12 boilerplate, §13 ŠALIŲ REKVIZITAI IR PARAŠAI.
 *  - MAINTENANCE      → отдельный короткий шаблон `INTERNETO SVETAINĖS
 *    TECHNINĖS PRIEŽIŪROS SUTARTIS` (§1 ŠALYS, §2–§5 + реквизиты).
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
  /** Подпись исполнителя (per-contract self-sign или дефолт из Settings). */
  providerSignatureUrl: string | null;
  /** Имя подписавшего исполнителя (если подписано в приложении). */
  providerSignerName: string | null;
  /** Дата подписи исполнителя "yyyy-MM-dd". */
  providerSignedAt: string | null;
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
    <View wrap={false}>
      {/* Названия сторон отдельной строкой — колонки выравниваются по высоте. */}
      <View style={pdfStyles.partiesNameRow}>
        <View style={pdfStyles.partiesCol}>
          <Text style={pdfStyles.partyLabel}>{provider.role}</Text>
          <Text style={pdfStyles.partyName}>{provider.name}</Text>
        </View>
        <View style={pdfStyles.partiesCol}>
          <Text style={pdfStyles.partyLabel}>{customer.role}</Text>
          <Text style={pdfStyles.partyName}>{customer.name}</Text>
        </View>
      </View>
      {/* Реквизиты — начинаются на одной линии для обеих сторон. */}
      <View style={pdfStyles.partiesColRow}>
        <PartyLines lines={provider.lines} />
        <PartyLines lines={customer.lines} />
      </View>
    </View>
  );
}

function PartyLines({ lines }: { lines: Array<string | null | undefined> }) {
  const clean = lines.filter((l): l is string => !!l && l.trim() !== "");
  return (
    <View style={pdfStyles.partiesCol}>
      {clean.map((l, i) => (
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

        {/* §1 ŠALYS — реквизиты сторон + вводный абзац (как в эталоне). */}
        <Section heading="1. ŠALYS">
          <PartiesRow provider={data.provider} customer={data.customer} />
          <Para>
            Šios Šalys, toliau kartu vadinamos Šalimis, o kiekviena atskirai –
            Šalimi, sudaro šią paslaugų teikimo sutartį (toliau – Sutartis).
          </Para>
        </Section>

        {/* §2 SUTARTIES DALYKAS IR DARBŲ APIMTIS — динамика: subject + scope. */}
        <SectionWrap heading="2. SUTARTIES DALYKAS IR DARBŲ APIMTIS">
          <Para>
            2.1. Paslaugų teikėjas įsipareigoja suteikti Užsakovui{" "}
            <Text style={pdfStyles.clauseStrong}>{data.subject}</Text> paslaugas,
            o Užsakovas įsipareigoja priimti suteiktas paslaugas ir už jas
            atsiskaityti šioje Sutartyje nustatyta tvarka.
          </Para>
          <Para>
            2.2. Sprendimas kuriamas naudojant modernų technologinį pagrindą
            (pavyzdžiui, Next.js, React ir TypeScript), jeigu Šalys raštu
            nesusitaria kitaip.
          </Para>
          <Para>
            2.3. Į projekto darbų apimtį įeina toliau nurodytos funkcijos ir
            moduliai:
          </Para>
          {data.scope.map((item, idx) => (
            <View key={idx} style={pdfStyles.scopeItem} wrap={false}>
              <Text style={pdfStyles.scopeTitle}>
                2.3.{idx + 1}. {item.title}
              </Text>
              {item.description ? <Bullet>{item.description}</Bullet> : null}
            </View>
          ))}
          {data.excluded.length > 0 ? (
            <View wrap={false}>
              <Para>
                Į darbų apimtį neįeina ir vykdoma atskirai pagal Šalių
                susitarimą:
              </Para>
              {data.excluded.map((item, idx) => (
                <Bullet key={idx}>
                  {item.title}
                  {item.description ? ` — ${item.description}` : ""}
                </Bullet>
              ))}
            </View>
          ) : null}
          <Para>
            2.4. Į Sutarties kainą neįeina mokamų trečiųjų šalių paslaugų
            mokesčiai, įskaitant mokėjimų paslaugų teikėjus, el. pašto siuntimą,
            SMS, duomenų bazės, failų saugyklos, premium CMS, įskiepių, serverio
            nuomos ar kitų išorinių paslaugų mokesčius.
          </Para>
          <Para>
            2.5. Domeno įsigijimo, pratęsimo arba perkėlimo kaina nėra įtraukta į
            Sutarties kainą ir apmokama Užsakovo atskirai.
          </Para>
          <Para>
            2.6. Po sprendimo paleidimo Paslaugų teikėjas suteikia trumpą
            konsultaciją arba vaizdo instrukciją, kaip valdyti pagrindinį turinį
            ir informaciją, jeigu projekte naudojama turinio administravimo
            sistema.
          </Para>
          <Para>
            2.7. Jeigu ateityje projektas augs ar atsiras papildomų funkcijų,
            sistemą bus galima plėsti etapais. Tokie papildomi darbai derinami
            atskirai raštu.
          </Para>
          <Para>
            2.8. Jeigu projekto vykdymo metu Užsakovas pageidauja papildomų
            funkcijų, papildomų puslapių, sudėtingesnių integracijų, dizaino
            pakeitimų ar kitų darbų, kurie nėra aiškiai nurodyti šioje Sutartyje,
            tokie darbai laikomi papildomais darbais ir derinami atskirai.
          </Para>
        </SectionWrap>

        {/* §3 APMOKĖJIMAS — динамика: amount + paymentTerms + paymentDays/iban/bankNote. */}
        <SectionWrap heading="3. APMOKĖJIMAS">
          <Para>
            3.1. Bendra paslaugų kaina pagal šią Sutartį yra{" "}
            <Text style={pdfStyles.clauseStrong}>{data.amount}</Text>.
          </Para>

          {data.kind === "ADVANCE" ? (
            <AdvanceTerms paymentTerms={data.paymentTerms} />
          ) : (
            <StagedTerms paymentTerms={data.paymentTerms} />
          )}

          <Para>
            3.3. Paslaugų teikėjas pradeda darbus tik gavęs avansinį mokėjimą.
          </Para>
          <Para>
            3.4. Sąskaitos apmokamos per {data.paymentDays} kalendorinę dieną nuo
            jų pateikimo dienos, jeigu Šalys raštu nesusitaria kitaip.
          </Para>
          <Para>
            3.5. <Text style={pdfStyles.clauseStrong}>Svarbu:</Text> mokėjimai
            atliekami į Paslaugų teikėjo Wise sąskaitą{" "}
            <Text style={pdfStyles.clauseStrong}>{data.iban}</Text>. {data.bankNote}
          </Para>
        </SectionWrap>

        {/* §5–§13 фиксированный boilerplate */}
        <BoilerplateClauses warranty={data.warranty || DEFAULT_WARRANTY} />

        {data.termsNote ? (
          <Section heading="PAPILDOMOS SĄLYGOS">
            <Para>{data.termsNote}</Para>
          </Section>
        ) : null}

        {/* §13 ŠALIŲ REKVIZITAI IR PARAŠAI — неразрывный блок: заголовок,
            реквизиты и подписи всегда вместе на одной странице. */}
        <Section heading="13. ŠALIŲ REKVIZITAI IR PARAŠAI">
          <PartiesRow provider={data.provider} customer={data.customer} />
          <View style={pdfStyles.signRow}>
            <SignBlock
              role="Paslaugų teikėjas"
              signatureUrl={data.providerSignatureUrl}
              signerName={data.providerSignerName ?? data.provider.name}
              signedAt={data.providerSignedAt}
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
        </Section>

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
      <Para>3.2. Atsiskaitymas vykdomas etapais:</Para>
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
      <Para>3.2. Atsiskaitymas vykdomas dviem dalimis:</Para>
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
 * §4–§12 — статический boilerplate проектного договора.
 * Параметризуем только §8 GARANTIJA через `warranty`.
 */
function BoilerplateClauses({ warranty }: { warranty: string }) {
  return (
    <>
      <Section heading="4. TERMINAI">
        <Para>
          4.1. Darbai pradedami po Sutarties pasirašymo, avansinio mokėjimo
          gavimo ir visos pradinei projekto eigai reikalingos informacijos iš
          Užsakovo gavimo.
        </Para>
        <Para>
          4.2. Preliminarus darbų atlikimo terminas suderinamas Šalių raštu (el.
          paštu), jeigu Užsakovas laiku pateikia visą reikalingą informaciją,
          turinį, prieigas, patvirtinimus ir grįžtamąjį ryšį.
        </Para>
        <Para>
          4.3. Jeigu Užsakovas vėluoja pateikti informaciją, turinį,
          prisijungimus, patvirtinimus ar grįžtamąjį ryšį, projekto terminai
          pratęsiami atitinkamam vėlavimo laikotarpiui.
        </Para>
        <Para>
          4.4. Jeigu Užsakovas laiku nesusisiekia, neatsako į Paslaugų teikėjo
          užklausas arba kitaip neleidžia tęsti darbų, darbų atlikimo terminas
          nukeliamas tam laikotarpiui, kurį Užsakovas nebuvo pasiekiamas arba
          nepateikė reikalingo atsakymo.
        </Para>
      </Section>

      <Section heading="5. UŽSAKOVO ĮSIPAREIGOJIMAI">
        <Para>Užsakovas įsipareigoja:</Para>
        <Bullet>
          Laiku pateikti Paslaugų teikėjui projekto įgyvendinimui reikalingą
          faktinę informaciją: tekstus, kontaktus, logotipą, nuotraukas, kainas
          ir kitus duomenis, reikalingus darbams atlikti.
        </Bullet>
        <Bullet>
          Užtikrinti, kad pateikta faktinė informacija, prekės ženklai,
          logotipai, nuotraukos ir kiti duomenys yra tikslūs, aktualūs ir gali
          būti teisėtai naudojami.
        </Bullet>
        <Bullet>
          Suteikti reikiamas prieigas prie domeno, mokėjimų paslaugų teikėjo,
          turinio valdymo ar kitų sistemų, jeigu jos reikalingos projekto
          įgyvendinimui.
        </Bullet>
        <Bullet>
          Laiku peržiūrėti pateiktus darbus ir pateikti pastabas arba
          patvirtinimą.
        </Bullet>
        <Bullet>
          Atsiskaityti su Paslaugų teikėju šioje Sutartyje nustatyta tvarka.
        </Bullet>
      </Section>

      <Section heading="6. PASLAUGŲ TEIKĖJO ĮSIPAREIGOJIMAI">
        <Para>Paslaugų teikėjas įsipareigoja:</Para>
        <Bullet>
          Atlikti darbus profesionaliai, vadovaujantis šioje Sutartyje nustatyta
          darbų apimtimi ir gerąja praktika.
        </Bullet>
        <Bullet>
          Informuoti Užsakovą apie svarbius techninius klausimus, galinčius
          turėti įtakos projekto eigai, apimčiai ar terminams.
        </Bullet>
        <Bullet>
          Įgyvendinti šioje Sutartyje numatytą funkcionalumą pagal suderintą
          apimtį.
        </Bullet>
        <Bullet>
          Paruošti rezultatą greičio ir bazinės SEO optimizacijos požiūriu, kai
          tai taikoma projektui.
        </Bullet>
        <Bullet>
          Pašalinti programavimo klaidas, atsiradusias dėl Paslaugų teikėjo
          kaltės, garantiniu laikotarpiu pagal šios Sutarties 8 skyrių.
        </Bullet>
      </Section>

      <Section heading="7. DARBŲ PERDAVIMAS IR PRIĖMIMAS">
        <Para>
          7.1. Darbai laikomi perduotais, kai Paslaugų teikėjas pateikia
          Užsakovui veikiančią rezultato versiją pagal šioje Sutartyje nurodytą
          darbų apimtį.
        </Para>
        <Para>
          7.2. Užsakovas per 5 (penkias) darbo dienas nuo darbų pateikimo dienos
          turi pateikti motyvuotas pastabas arba patvirtinti atliktus darbus.
        </Para>
        <Para>
          7.3. Jeigu per 5 (penkias) darbo dienas Užsakovas nepateikia motyvuotų
          pastabų, laikoma, kad darbai yra priimti.
        </Para>
        <Para>
          7.4. Smulkūs pataisymai, kurie nekeičia suderintos darbų apimties,
          atliekami pagal Šalių suderintą tvarką. Esminiai pakeitimai, papildomos
          funkcijos ar nauji reikalavimai laikomi papildomais darbais.
        </Para>
      </Section>

      <Section heading="8. GARANTIJA">
        <Para>
          8.1. Paslaugų teikėjas suteikia sukurtam programiniam kodui garantiją –{" "}
          {warranty}
        </Para>
        <Para>
          8.2. Garantija taikoma programavimo klaidoms, kurios atsirado dėl
          Paslaugų teikėjo kaltės ir trukdo naudotis pagal Sutartį sukurta
          funkcionalumo apimtimi.
        </Para>
        <Para>
          8.3. Garantija netaikoma trečiųjų šalių paslaugų sutrikimams, hostingo
          ar platformų veikimo pokyčiams, mokėjimų paslaugų teikėjo ar kitų
          išorinių sistemų sutrikimams, Užsakovo ar trečiųjų asmenų atliktiems
          pakeitimams, naujų funkcijų kūrimui ar turinio administravimui.
        </Para>
      </Section>

      <Section heading="9. INTELEKTINĖ NUOSAVYBĖ">
        <Para>
          9.1. Užsakovui visiškai atsiskaičius pagal šią Sutartį, Užsakovui
          perduodamos teisės naudotis pagal šią Sutartį sukurtu rezultatu ir jo
          funkcionalumu, išskyrus trečiųjų šalių komponentus ir licencijuojamą
          programinę įrangą.
        </Para>
        <Para>
          9.2. Iki visiško atsiskaitymo visi Paslaugų teikėjo sukurti sprendimai,
          programinis kodas, dizaino sprendimai ir kiti darbo rezultatai lieka
          Paslaugų teikėjo nuosavybe.
        </Para>
        <Para>
          9.3. Paslaugų teikėjas turi teisę naudoti projekto pavadinimą, aprašymą
          ir ekrano vaizdus savo portfolio, interneto svetainėje, socialiniuose
          tinkluose ar komerciniuose pristatymuose, jeigu Užsakovas raštu
          nenurodo kitaip.
        </Para>
      </Section>

      <Section heading="10. KONFIDENCIALUMAS">
        <Para>
          10.1. Šalys įsipareigoja neatskleisti tretiesiems asmenims
          konfidencialios informacijos, gautos vykdant šią Sutartį, išskyrus
          atvejus, kai tai būtina Sutarties vykdymui arba to reikalauja teisės
          aktai.
        </Para>
      </Section>

      <SectionWrap heading="11. SUTARTIES NUTRAUKIMAS, ATSAKOMYBĖ IR PINIGŲ GRĄŽINIMAS">
        <Para>11.1. Sutartis gali būti nutraukta Šalių rašytiniu susitarimu.</Para>
        <Para>
          11.2. Jeigu Užsakovas vienašališkai nutraukia Sutartį po darbų pradžios,
          Užsakovas įsipareigoja atsiskaityti už faktiškai atliktus darbus iki
          Sutarties nutraukimo dienos.
        </Para>
        <Para>
          11.3. Avansinis mokėjimas nėra grąžinamas, jeigu darbai jau buvo
          pradėti, išskyrus atvejus, kai Šalys raštu susitaria kitaip.
        </Para>
        <Para>
          11.4. Paslaugų teikėjas turi teisę sustabdyti arba nutraukti darbus,
          jeigu Užsakovas vėluoja atlikti mokėjimus, nepateikia reikalingos
          informacijos arba kitaip trukdo vykdyti Sutartį.
        </Para>
        <Para>
          11.5. Pinigų grąžinimas galimas tik už neatliktą darbų dalį tais
          atvejais, kai Sutartyje numatyti darbai neatliekami arba nepagrįstai
          pradelsiami dėl Paslaugų teikėjo kaltės, o ne dėl Užsakovo vėlavimo,
          nepateiktos informacijos, nesuteiktų prieigų, nepatvirtintų sprendimų,
          trečiųjų šalių paslaugų, techninių apribojimų ar kitų nuo Paslaugų
          teikėjo nepriklausančių aplinkybių.
        </Para>
        <Para>
          11.6. Prieš reikalaujant nutraukti Sutartį ar grąžinti pinigus,
          Užsakovas turi raštu informuoti Paslaugų teikėją apie pažeidimą ir
          suteikti protingą terminą jam pašalinti.
        </Para>
        <Para>
          11.7. Jeigu per Šalių raštu suderintą arba protingą terminą pažeidimas
          nėra pašalinamas, Užsakovas turi teisę nutraukti Sutartį ir reikalauti
          grąžinti už neatliktą darbų dalį sumokėtas sumas, atsižvelgiant į
          faktiškai atliktų darbų apimtį.
        </Para>
      </SectionWrap>

      <Section heading="12. BAIGIAMOSIOS NUOSTATOS">
        <Para>
          12.1. Sutartis įsigalioja nuo jos pasirašymo dienos ir galioja iki
          visiško Šalių įsipareigojimų įvykdymo.
        </Para>
        <Para>
          12.2. Visi šios Sutarties pakeitimai ir papildymai galioja tik tuo
          atveju, jeigu yra suderinti raštu.
        </Para>
        <Para>
          12.3. Šalių susirašinėjimas el. paštu laikomas tinkama komunikacijos ir
          rašytinio suderinimo forma.
        </Para>
        <Para>
          12.4. Ginčai sprendžiami derybų būdu. Nepavykus susitarti, ginčai
          sprendžiami Lietuvos Respublikos teisės aktų nustatyta tvarka.
        </Para>
        <Para>
          12.5. Sutartis sudaryta dviem vienodą teisinę galią turinčiais
          egzemplioriais arba pasirašoma elektroniniu būdu.
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

        {/* §1 ŠALYS — реквизиты сторон + вводный абзац. */}
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

        {/* Реквизиты + подписи — неразрывный блок (заголовок + реквизиты + подписи). */}
        <Section heading="ŠALIŲ REKVIZITAI IR PARAŠAI">
          <PartiesRow provider={data.provider} customer={data.customer} />
          <View style={pdfStyles.signRow}>
            <SignBlock
              role="Paslaugų teikėjas"
              signatureUrl={data.providerSignatureUrl}
              signerName={data.providerSignerName ?? data.provider.name}
              signedAt={data.providerSignedAt}
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
        </Section>

        <PdfFooter leftText={footerLeft} />
      </Page>
    </Document>
  );
}
