import { Document, Packer, Paragraph, Table, TextRun } from "docx";

import { buildContractData } from "@/lib/pdf/renderContract";
import type { ContractPdfData } from "@/components/pdf/ContractPdf";
import {
  DEFAULT_WARRANTY,
  maintenanceClauses,
  projectBoilerplateClauses,
  type ClauseSection,
} from "@/lib/documents/contractClauses";
import {
  AlignmentType,
  docMeta,
  docSubtitle,
  docTitle,
  FONT,
  heading,
  INK,
  pageSection,
  para,
  partiesTable,
  richBullet,
  richPara,
} from "./common";

type Block = Paragraph | Table;

function strongRun(text: string) {
  return new TextRun({ text, bold: true, size: 20, color: INK });
}
function plainRun(text: string) {
  return new TextRun({ text, size: 20, color: INK });
}

/** Рендерит общий список ClauseSection в Word-параграфы. */
function renderClauseSections(sections: ClauseSection[]): Block[] {
  const out: Block[] = [];
  for (const sec of sections) {
    out.push(heading(sec.heading));
    for (const blk of sec.blocks) {
      out.push(blk.type === "bullet" ? richBullet(blk.runs) : richPara(blk.runs));
    }
  }
  return out;
}

/** Реквизиты сторон (без подписей — Word-версия идёт без подписи). */
function partiesBlock(data: ContractPdfData) {
  const lines = (raw: Array<string | null | undefined>) =>
    raw.filter((l): l is string => !!l && l.trim() !== "");
  return partiesTable(
    { label: data.provider.role, name: data.provider.name, lines: lines(data.provider.lines) },
    { label: data.customer.role, name: data.customer.name, lines: lines(data.customer.lines) },
  );
}

/**
 * §2 SUTARTIES DALYKAS IR DARBŲ APIMTIS + §3 APMOKĖJIMAS.
 * Текст тесно переплетён с динамикой (subject/scope/amount/paymentTerms),
 * поэтому здесь зеркалит components/pdf/ContractPdf.tsx (ProjectContract).
 * При правке §2/§3 — менять в ОБОИХ местах.
 */
function projectScopeAndPayment(data: ContractPdfData): Block[] {
  const out: Block[] = [];

  // §2
  out.push(heading("2. SUTARTIES DALYKAS IR DARBŲ APIMTIS"));
  out.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        plainRun("2.1. Paslaugų teikėjas įsipareigoja suteikti Užsakovui "),
        strongRun(data.subject),
        plainRun(
          " paslaugas, o Užsakovas įsipareigoja priimti suteiktas paslaugas ir už jas atsiskaityti šioje Sutartyje nustatyta tvarka.",
        ),
      ],
    }),
  );
  out.push(
    para(
      "2.2. Sprendimas kuriamas naudojant modernų technologinį pagrindą (pavyzdžiui, Next.js, React ir TypeScript), jeigu Šalys raštu nesusitaria kitaip.",
    ),
    para(
      "2.3. Į projekto darbų apimtį įeina toliau nurodytos funkcijos ir moduliai:",
    ),
  );
  data.scope.forEach((item, idx) => {
    out.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [strongRun(`2.3.${idx + 1}. ${item.title}`)],
      }),
    );
    if (item.description) out.push(richBullet([{ text: item.description }]));
  });
  if (data.excluded.length > 0) {
    out.push(
      para("Į darbų apimtį neįeina ir vykdoma atskirai pagal Šalių susitarimą:"),
    );
    data.excluded.forEach((item) =>
      out.push(
        richBullet([
          {
            text: item.description
              ? `${item.title} — ${item.description}`
              : item.title,
          },
        ]),
      ),
    );
  }
  out.push(
    para(
      "2.4. Į Sutarties kainą neįeina mokamų trečiųjų šalių paslaugų mokesčiai, įskaitant mokėjimų paslaugų teikėjus, el. pašto siuntimą, SMS, duomenų bazės, failų saugyklos, premium CMS, įskiepių, serverio nuomos ar kitų išorinių paslaugų mokesčius.",
    ),
    para(
      "2.5. Domeno įsigijimo, pratęsimo arba perkėlimo kaina nėra įtraukta į Sutarties kainą ir apmokama Užsakovo atskirai.",
    ),
    para(
      "2.6. Po sprendimo paleidimo Paslaugų teikėjas suteikia trumpą konsultaciją arba vaizdo instrukciją, kaip valdyti pagrindinį turinį ir informaciją, jeigu projekte naudojama turinio administravimo sistema.",
    ),
    para(
      "2.7. Jeigu ateityje projektas augs ar atsiras papildomų funkcijų, sistemą bus galima plėsti etapais. Tokie papildomi darbai derinami atskirai raštu.",
    ),
    para(
      "2.8. Jeigu projekto vykdymo metu Užsakovas pageidauja papildomų funkcijų, papildomų puslapių, sudėtingesnių integracijų, dizaino pakeitimų ar kitų darbų, kurie nėra aiškiai nurodyti šioje Sutartyje, tokie darbai laikomi papildomais darbais ir derinami atskirai.",
    ),
  );

  // §3
  out.push(heading("3. APMOKĖJIMAS"));
  out.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        plainRun("3.1. Bendra paslaugų kaina pagal šią Sutartį yra "),
        strongRun(data.amount),
        plainRun("."),
      ],
    }),
  );

  if (data.kind === "ADVANCE") {
    const advance = data.paymentTerms[0];
    const balance = data.paymentTerms[1];
    const DEF_ADVANCE =
      "avansinis mokėjimas mokamas po Sutarties pasirašymo ir prieš pradedant darbus.";
    const DEF_BALANCE =
      "mokama po darbų užbaigimo ir galutinio darbų perdavimo Užsakovui.";
    out.push(para("3.2. Atsiskaitymas vykdomas dviem dalimis:"));
    if (advance)
      out.push(
        richBullet([
          { text: advance.amount, bold: true },
          {
            text: ` ${advance.label}${advance.dueLabel ? ` — ${advance.dueLabel}` : ` ${DEF_ADVANCE}`}`,
          },
        ]),
      );
    if (balance)
      out.push(
        richBullet([
          { text: balance.amount, bold: true },
          {
            text: ` ${balance.label}${balance.dueLabel ? ` — ${balance.dueLabel}` : ` ${DEF_BALANCE}`}`,
          },
        ]),
      );
  } else {
    out.push(para("3.2. Atsiskaitymas vykdomas etapais:"));
    data.paymentTerms.forEach((p) =>
      out.push(
        richBullet([
          { text: p.amount, bold: true },
          { text: ` ${p.label}${p.dueLabel ? ` — ${p.dueLabel}` : ""}` },
        ]),
      ),
    );
  }

  out.push(
    para("3.3. Paslaugų teikėjas pradeda darbus tik gavęs avansinį mokėjimą."),
    para(
      `3.4. Sąskaitos apmokamos per ${data.paymentDays} kalendorinę dieną nuo jų pateikimo dienos, jeigu Šalys raštu nesusitaria kitaip.`,
    ),
  );
  out.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        plainRun("3.5. "),
        strongRun("Svarbu:"),
        plainRun(" mokėjimai atliekami į Paslaugų teikėjo Wise sąskaitą "),
        strongRun(data.iban),
        plainRun(`. ${data.bankNote}`),
      ],
    }),
  );

  return out;
}

/** Рендерит договор (любого типа) в Word (.docx) Buffer. Без подписи. */
export async function renderContractDocx(contractId: string): Promise<Buffer> {
  const data = await buildContractData(contractId);
  const isMaintenance = data.kind === "MAINTENANCE";

  const title = isMaintenance
    ? "INTERNETO SVETAINĖS TECHNINĖS PRIEŽIŪROS SUTARTIS"
    : "PASLAUGŲ TEIKIMO SUTARTIS";
  const footerLeft = isMaintenance
    ? `Techninės priežiūros sutartis Nr. ${data.number}`
    : `Paslaugų teikimo sutartis Nr. ${data.number}`;

  const intro = isMaintenance
    ? "Šios Šalys, toliau kartu vadinamos Šalimis, o kiekviena atskirai – Šalimi, sudarė šią interneto svetainės techninės priežiūros sutartį (toliau – Sutartis)."
    : "Šios Šalys, toliau kartu vadinamos Šalimis, o kiekviena atskirai – Šalimi, sudaro šią paslaugų teikimo sutartį (toliau – Sutartis).";

  const children: Block[] = [
    docTitle(title, AlignmentType.CENTER),
    docSubtitle(`Nr. ${data.number}`, AlignmentType.CENTER),
    docMeta(`${data.issuedAt}, Vilnius`, AlignmentType.CENTER),

    // §1 ŠALYS
    heading("1. ŠALYS"),
    partiesBlock(data),
    para(intro),
  ];

  if (isMaintenance) {
    children.push(
      ...renderClauseSections(
        maintenanceClauses({
          includes: data.includes,
          monthly: data.monthlyAmount ?? data.amount,
          iban: data.iban,
          termsNote: data.termsNote,
        }),
      ),
    );
  } else {
    children.push(...projectScopeAndPayment(data));
    children.push(
      ...renderClauseSections(
        projectBoilerplateClauses(data.warranty || DEFAULT_WARRANTY),
      ),
    );
    if (data.termsNote) {
      children.push(heading("PAPILDOMOS SĄLYGOS"), para(data.termsNote));
    }
  }

  // Реквизиты сторон (БЕЗ подписей)
  children.push(
    heading(
      isMaintenance ? "ŠALIŲ REKVIZITAI" : "13. ŠALIŲ REKVIZITAI",
    ),
    partiesBlock(data),
  );

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [pageSection(children, footerLeft)],
  });

  return Packer.toBuffer(doc);
}
