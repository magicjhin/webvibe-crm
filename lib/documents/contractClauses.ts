/**
 * Единый источник правды для статических/полустатических пунктов договора.
 *
 * Текст перенесён дословно из CONTRACTS-LT-SOURCE.md (ADR-026). И PDF-шаблон
 * (`components/pdf/ContractPdf.tsx`), и Word-рендерер (`lib/docx/renderContractDocx.ts`)
 * рендерят ОДНИ И ТЕ ЖЕ данные отсюда, чтобы юридический текст не «разъезжался»
 * между форматами. Динамические значения (warranty, monthly, iban, includes,
 * termsNote) подставляются через параметры builder-функций.
 *
 * Модель:
 *  - ClauseRun   — отрезок текста, опционально жирный (bold).
 *  - ClauseBlock — абзац ("para") или маркированный пункт ("bullet").
 *  - ClauseSection — заголовок + блоки; `breakable` разрешает перенос между
 *    страницами в PDF (длинные §-ы).
 */

export type ClauseRun = { text: string; bold?: boolean };

export type ClauseBlock =
  | { type: "para"; runs: ClauseRun[] }
  | { type: "bullet"; runs: ClauseRun[] };

export type ClauseSection = {
  heading: string;
  blocks: ClauseBlock[];
  /** PDF: разрешить разрыв секции между страницами (по умолчанию false). */
  breakable?: boolean;
};

// — конструкторы для краткости —
const t = (text: string): ClauseRun => ({ text });
const strong = (text: string): ClauseRun => ({ text, bold: true });
const para = (...runs: (ClauseRun | string)[]): ClauseBlock => ({
  type: "para",
  runs: runs.map((r) => (typeof r === "string" ? t(r) : r)),
});
const bullet = (...runs: (ClauseRun | string)[]): ClauseBlock => ({
  type: "bullet",
  runs: runs.map((r) => (typeof r === "string" ? t(r) : r)),
});

export const DEFAULT_WARRANTY =
  "12 (dvylika) mėnesių nuo galutinio darbų perdavimo dienos.";

// ---------------------------------------------------------------------------
// STAGED / ADVANCE — §4–§12 проектного договора (статичный boilerplate)
// Параметризуем только §8.1 GARANTIJA через `warranty`.
// ---------------------------------------------------------------------------

export function projectBoilerplateClauses(warranty: string): ClauseSection[] {
  return [
    {
      heading: "4. TERMINAI",
      blocks: [
        para(
          "4.1. Darbai pradedami po Sutarties pasirašymo, avansinio mokėjimo gavimo ir visos pradinei projekto eigai reikalingos informacijos iš Užsakovo gavimo.",
        ),
        para(
          "4.2. Preliminarus darbų atlikimo terminas suderinamas Šalių raštu (el. paštu), jeigu Užsakovas laiku pateikia visą reikalingą informaciją, turinį, prieigas, patvirtinimus ir grįžtamąjį ryšį.",
        ),
        para(
          "4.3. Jeigu Užsakovas vėluoja pateikti informaciją, turinį, prisijungimus, patvirtinimus ar grįžtamąjį ryšį, projekto terminai pratęsiami atitinkamam vėlavimo laikotarpiui.",
        ),
        para(
          "4.4. Jeigu Užsakovas laiku nesusisiekia, neatsako į Paslaugų teikėjo užklausas arba kitaip neleidžia tęsti darbų, darbų atlikimo terminas nukeliamas tam laikotarpiui, kurį Užsakovas nebuvo pasiekiamas arba nepateikė reikalingo atsakymo.",
        ),
        para(
          "4.5. Atskirų etapų pradžia, tarpinės peržiūros ir darbų pabaiga derinami Šalių susirašinėjimu el. paštu. Toks suderinimas laikomas tinkama ir Šalims privaloma rašytine forma.",
        ),
      ],
    },
    {
      heading: "5. UŽSAKOVO ĮSIPAREIGOJIMAI",
      blocks: [
        para("Užsakovas įsipareigoja:"),
        bullet(
          "Laiku pateikti Paslaugų teikėjui projekto įgyvendinimui reikalingą faktinę informaciją: tekstus, kontaktus, logotipą, nuotraukas, kainas ir kitus duomenis, reikalingus darbams atlikti.",
        ),
        bullet(
          "Užtikrinti, kad pateikta faktinė informacija, prekės ženklai, logotipai, nuotraukos ir kiti duomenys yra tikslūs, aktualūs ir gali būti teisėtai naudojami.",
        ),
        bullet(
          "Suteikti reikiamas prieigas prie domeno, mokėjimų paslaugų teikėjo, turinio valdymo ar kitų sistemų, jeigu jos reikalingos projekto įgyvendinimui.",
        ),
        bullet(
          "Laiku peržiūrėti pateiktus darbus ir pateikti pastabas arba patvirtinimą.",
        ),
        bullet(
          "Atsiskaityti su Paslaugų teikėju šioje Sutartyje nustatyta tvarka.",
        ),
      ],
    },
    {
      heading: "6. PASLAUGŲ TEIKĖJO ĮSIPAREIGOJIMAI",
      blocks: [
        para("Paslaugų teikėjas įsipareigoja:"),
        bullet(
          "Atlikti darbus profesionaliai, vadovaujantis šioje Sutartyje nustatyta darbų apimtimi ir gerąja praktika.",
        ),
        bullet(
          "Informuoti Užsakovą apie svarbius techninius klausimus, galinčius turėti įtakos projekto eigai, apimčiai ar terminams.",
        ),
        bullet(
          "Įgyvendinti šioje Sutartyje numatytą funkcionalumą pagal suderintą apimtį.",
        ),
        bullet(
          "Paruošti rezultatą greičio ir bazinės SEO optimizacijos požiūriu, kai tai taikoma projektui.",
        ),
        bullet(
          "Pašalinti programavimo klaidas, atsiradusias dėl Paslaugų teikėjo kaltės, garantiniu laikotarpiu pagal šios Sutarties 8 skyrių.",
        ),
      ],
    },
    {
      heading: "7. DARBŲ PERDAVIMAS IR PRIĖMIMAS",
      blocks: [
        para(
          "7.1. Darbai laikomi perduotais, kai Paslaugų teikėjas pateikia Užsakovui veikiančią rezultato versiją pagal šioje Sutartyje nurodytą darbų apimtį.",
        ),
        para(
          "7.2. Užsakovas per 5 (penkias) darbo dienas nuo darbų pateikimo dienos turi pateikti motyvuotas pastabas arba patvirtinti atliktus darbus.",
        ),
        para(
          "7.3. Jeigu per 5 (penkias) darbo dienas Užsakovas nepateikia motyvuotų pastabų, laikoma, kad darbai yra priimti.",
        ),
        para(
          "7.4. Smulkūs pataisymai, kurie nekeičia suderintos darbų apimties, atliekami pagal Šalių suderintą tvarką. Esminiai pakeitimai, papildomos funkcijos ar nauji reikalavimai laikomi papildomais darbais.",
        ),
        para(
          "7.5. Į darbų apimtį įeina pagrįstas pataisymų ir korekcijų skaičius suderintos apimties ribose. Pakartotiniai esminiai krypties ar koncepcijos keitimai, kuriuos Užsakovas inicijuoja patvirtinęs ankstesnį etapą, laikomi papildomais darbais.",
        ),
      ],
    },
    {
      heading: "8. GARANTIJA",
      blocks: [
        para(
          `8.1. Paslaugų teikėjas suteikia sukurtam programiniam kodui garantiją – ${warranty}`,
        ),
        para(
          "8.2. Garantija taikoma programavimo klaidoms, kurios atsirado dėl Paslaugų teikėjo kaltės ir trukdo naudotis pagal Sutartį sukurta funkcionalumo apimtimi.",
        ),
        para(
          "8.3. Garantija netaikoma trečiųjų šalių paslaugų sutrikimams, hostingo ar platformų veikimo pokyčiams, mokėjimų paslaugų teikėjo ar kitų išorinių sistemų sutrikimams, Užsakovo ar trečiųjų asmenų atliktiems pakeitimams, naujų funkcijų kūrimui ar turinio administravimui.",
        ),
        para(
          "8.4. Garantinės klaidos pranešamos Paslaugų teikėjui raštu (el. paštu), nurodant klaidos aplinkybes ir, jei įmanoma, jos atkartojimo veiksmus. Paslaugų teikėjas klaidas šalina per protingą terminą, atsižvelgdamas į jų sudėtingumą ir poveikį sistemos veikimui.",
        ),
      ],
    },
    {
      heading: "9. INTELEKTINĖ NUOSAVYBĖ",
      blocks: [
        para(
          "9.1. Užsakovui visiškai atsiskaičius pagal šią Sutartį, Užsakovui perduodamos teisės naudotis pagal šią Sutartį sukurtu rezultatu ir jo funkcionalumu, išskyrus trečiųjų šalių komponentus ir licencijuojamą programinę įrangą.",
        ),
        para(
          "9.2. Iki visiško atsiskaitymo visi Paslaugų teikėjo sukurti sprendimai, programinis kodas, dizaino sprendimai ir kiti darbo rezultatai lieka Paslaugų teikėjo nuosavybe.",
        ),
        para(
          "9.3. Paslaugų teikėjas turi teisę naudoti projekto pavadinimą, aprašymą ir ekrano vaizdus savo portfolio, interneto svetainėje, socialiniuose tinkluose ar komerciniuose pristatymuose, jeigu Užsakovas raštu nenurodo kitaip.",
        ),
        para(
          "9.4. Trečiųjų šalių komponentams, bibliotekoms, šriftams ir licencijuojamai programinei įrangai taikomos atitinkamų jų teikėjų licencijų sąlygos; tokios teisės Užsakovui neperleidžiamos plačiau, nei numato pati licencija.",
        ),
      ],
    },
    {
      heading: "10. KONFIDENCIALUMAS",
      blocks: [
        para(
          "10.1. Šalys įsipareigoja neatskleisti tretiesiems asmenims konfidencialios informacijos, gautos vykdant šią Sutartį, išskyrus atvejus, kai tai būtina Sutarties vykdymui arba to reikalauja teisės aktai.",
        ),
        para(
          "10.2. Konfidencialumo įsipareigojimai galioja Sutarties vykdymo laikotarpiu ir lieka galioti pasibaigus ar nutraukus Sutartį.",
        ),
        para(
          "10.3. Asmens duomenys, gauti vykdant Sutartį, tvarkomi tik tiek, kiek būtina Sutarčiai įgyvendinti, laikantis taikomų asmens duomenų apsaugos teisės aktų reikalavimų.",
        ),
      ],
    },
    {
      heading: "11. SUTARTIES NUTRAUKIMAS, ATSAKOMYBĖ IR PINIGŲ GRĄŽINIMAS",
      breakable: true,
      blocks: [
        para("11.1. Sutartis gali būti nutraukta Šalių rašytiniu susitarimu."),
        para(
          "11.2. Jeigu Užsakovas vienašališkai nutraukia Sutartį po darbų pradžios, Užsakovas įsipareigoja atsiskaityti už faktiškai atliktus darbus iki Sutarties nutraukimo dienos.",
        ),
        para(
          "11.3. Avansinis mokėjimas nėra grąžinamas, jeigu darbai jau buvo pradėti, išskyrus atvejus, kai Šalys raštu susitaria kitaip.",
        ),
        para(
          "11.4. Paslaugų teikėjas turi teisę sustabdyti arba nutraukti darbus, jeigu Užsakovas vėluoja atlikti mokėjimus, nepateikia reikalingos informacijos arba kitaip trukdo vykdyti Sutartį.",
        ),
        para(
          "11.5. Pinigų grąžinimas galimas tik už neatliktą darbų dalį tais atvejais, kai Sutartyje numatyti darbai neatliekami arba nepagrįstai pradelsiami dėl Paslaugų teikėjo kaltės, o ne dėl Užsakovo vėlavimo, nepateiktos informacijos, nesuteiktų prieigų, nepatvirtintų sprendimų, trečiųjų šalių paslaugų, techninių apribojimų ar kitų nuo Paslaugų teikėjo nepriklausančių aplinkybių.",
        ),
        para(
          "11.6. Prieš reikalaujant nutraukti Sutartį ar grąžinti pinigus, Užsakovas turi raštu informuoti Paslaugų teikėją apie pažeidimą ir suteikti protingą terminą jam pašalinti.",
        ),
        para(
          "11.7. Jeigu per Šalių raštu suderintą arba protingą terminą pažeidimas nėra pašalinamas, Užsakovas turi teisę nutraukti Sutartį ir reikalauti grąžinti už neatliktą darbų dalį sumokėtas sumas, atsižvelgiant į faktiškai atliktų darbų apimtį.",
        ),
        para(
          "11.8. Šalys neatsako už įsipareigojimų neįvykdymą ar pavėluotą įvykdymą, jeigu tai sukėlė nenugalimos jėgos (force majeure) aplinkybės. Apie tokias aplinkybes paveiktoji Šalis nedelsdama informuoja kitą Šalį, o darbų terminai atitinkamai pratęsiami.",
        ),
      ],
    },
    {
      heading: "12. BAIGIAMOSIOS NUOSTATOS",
      blocks: [
        para(
          "12.1. Sutartis įsigalioja nuo jos pasirašymo dienos ir galioja iki visiško Šalių įsipareigojimų įvykdymo.",
        ),
        para(
          "12.2. Visi šios Sutarties pakeitimai ir papildymai galioja tik tuo atveju, jeigu yra suderinti raštu.",
        ),
        para(
          "12.3. Šalių susirašinėjimas el. paštu laikomas tinkama komunikacijos ir rašytinio suderinimo forma.",
        ),
        para(
          "12.4. Ginčai sprendžiami derybų būdu. Nepavykus susitarti, ginčai sprendžiami Lietuvos Respublikos teisės aktų nustatyta tvarka.",
        ),
        para(
          "12.5. Sutartis sudaryta dviem vienodą teisinę galią turinčiais egzemplioriais arba pasirašoma elektroniniu būdu.",
        ),
        para(
          "12.6. Jeigu kuri nors Sutarties nuostata taptų negaliojančia ar neįgyvendinama, tai neturi įtakos kitų nuostatų galiojimui, o Šalys tokią nuostatą pakeičia galiojančia, kuo labiau atitinkančia pradinį Šalių ketinimą.",
        ),
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// MAINTENANCE — §2–§5 договора техподдержки (полустатично: includes/monthly/iban/termsNote)
// ---------------------------------------------------------------------------

export function maintenanceClauses(args: {
  includes: string[];
  monthly: string;
  iban: string;
  termsNote: string | null;
}): ClauseSection[] {
  const { includes, monthly, iban, termsNote } = args;
  return [
    {
      heading: "2. SUTARTIES DALYKAS",
      blocks: [
        para(
          t("2.1. "),
          strong("Paslaugų apimtis:"),
          t(
            " Paslaugų teikėjas įsipareigoja vykdyti nuolatinę techninę Užsakovo svetainės priežiūrą, kuri apima:",
          ),
        ),
        ...includes.map((line) => bullet(line)),
        para(
          t("2.2. "),
          strong("Atsakomybės ribos:"),
          t(
            " Palaikymas neapima naujų didelės apimties modulių kūrimo ar esminio svetainės perdarymo, dėl kurių šalys tariasi atskirai.",
          ),
        ),
      ],
    },
    {
      heading: "3. ATLYGIS IR ATSISKAITYMO TVARKA",
      blocks: [
        para(
          t("3.1. Paslaugų kaina yra "),
          strong(monthly),
          t(" už vieną kalendorinį mėnesį."),
        ),
        para(
          t("3.2. "),
          strong("Mokėjimo tvarka:"),
          t(
            " Užsakovas moka fiksuotą mėnesinį mokestį prieš prasidedant paslaugų teikimo laikotarpiui (išankstinis apmokėjimas).",
          ),
        ),
        para(
          "3.3. Sąskaita išrašoma kiekvieno mėnesio pradžioje, o apmokėjimas turi būti atliktas per 3 (tris) darbo dienas.",
        ),
        para(
          t("3.4. "),
          strong("Svarbu:"),
          t(" Atliekant pavedimą į Wise sąskaitą ("),
          strong(iban),
          t("), mokėjimo nurodyme būtina pasirinkti šalį – "),
          strong("Belgiją"),
          t("."),
        ),
      ],
    },
    {
      heading: "4. TERMINAI IR NUTRAUKIMAS",
      blocks: [
        para("4.1. Sutartis sudaroma neterminuotam laikotarpiui."),
        para(
          "4.2. Kiekviena šalis gali nutraukti sutartį informavusi kitą šalį prieš 30 kalendorinių dienų.",
        ),
      ],
    },
    {
      heading: "5. GARANTIJA IR ATSAKOMYBĖ",
      blocks: [
        para(
          "5.1. Paslaugų teikėjas užtikrina stabilų svetainės veikimą ir techninę priežiūrą pagal suteiktas prieigas.",
        ),
        para(
          "5.2. Teikėjas neatsako už sutrikimus, kilusius dėl trečiųjų šalių (hostingo, domenų) kaltės, jei jie nepatenka į Teikėjo kontrolės sritį.",
        ),
        ...(termsNote ? [para(termsNote)] : []),
      ],
    },
  ];
}
