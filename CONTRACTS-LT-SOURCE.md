# CONTRACTS-LT-SOURCE.md — исходный литовский текст договоров

Источник истины по **boilerplate-тексту** трёх типов договоров. Текст хардкодим в TSX-шаблонах
(`ADR-026`), а этот файл — эталон, откуда брать формулировки и куда смотреть при правках.

Размётка плейсхолдеров:
- `{{settings.*}}` — реквизиты исполнителя из `Settings` (singleton).
- `{{client.*}}` — реквизиты заказчика из `Client`.
- `{{contract.*}}` — поля документа (`number`, `issuedAt`, `amount`, `currency`).
- `{{terms.*}}` — редактируемые данные из `Contract.terms` (JSON).
- **жирным курсивом** помечены полностью динамические блоки.

Три типа = `Contract.kind`:
| kind | Заголовок (LT) | Чем отличается |
|---|---|---|
| `STAGED` | PASLAUGŲ TEIKIMO SUTARTIS | поэтапная оплата (произвольный список платежей) |
| `ADVANCE` | PASLAUGŲ TEIKIMO SUTARTIS | оплата = аванс 70% + остаток 30% |
| `MAINTENANCE` | INTERNETO SVETAINĖS TECHNINĖS PRIEŽIŪROS SUTARTIS | ежемесячный платёж, короткий бойлерплейт |

`STAGED` и `ADVANCE` — **один и тот же текст**, различается только блок §4 (KAINA IR ATSISKAITYMO TVARKA).

---

## Общая шапка (для всех типов)

```
{{contract.title по типу}}
Nr. {{contract.number}}
{{contract.issuedAt | yyyy-MM-dd}}, Vilnius
```

Колонтитул (footer на каждой странице): `webvibe.lt | info@webvibe.lt` слева/по центру,
название договора + клиент + `Puslapis N` — справа/снизу (как в исходных PDF).

### §1 ŠALYS (одинаково для всех типов)

Две колонки.

**PASLAUGŲ TEIKĖJAS** (из `Settings`):
```
{{settings.ownerName}}              // Aleksandr Kuc
Asmens kodas: {{settings.personalCode}}
Individualios veiklos pažymos Nr. {{settings.regNumber}}
El. paštas: {{settings.email}}
Tel.: {{settings.phone}}
Svetainė: {{settings.website}}
```

**UŽSAKOVAS** (из `Client`):
```
{{client.name}}
Įmonės kodas: {{client.regNumber}}            // показывать строку только если поле заполнено
PVM mokėtojo kodas: {{client.vatId}}          // только если заполнено
Registracijos adresas / Adresas: {{client.address}}
Atstovaujama {{client.representative}}        // только если заполнено
Techninis kontaktas: {{client.technicalContactName}}   // только если заполнено
Tel.: {{client.phone}}
El. paštas: {{client.email}}
```

Под боксами:
> Šios Šalys, toliau kartu vadinamos Šalimis, o kiekviena atskirai – Šalimi, sudaro šią paslaugų teikimo sutartį (toliau – Sutartis).

(для MAINTENANCE: `...sudarė šią interneto svetainės techninės priežiūros sutartį (toliau – Sutartis).`)

---

## ТИП STAGED / ADVANCE — PASLAUGŲ TEIKIMO SUTARTIS

### §2 SUTARTIES DALYKAS

> 2.1. Paslaugų teikėjas įsipareigoja suteikti Užsakovui ***{{terms.subject}}*** paslaugas, o Užsakovas įsipareigoja priimti suteiktas paslaugas ir už jas atsiskaityti šioje Sutartyje nustatyta tvarka.

**`terms.subject`** — РЕДАКТИРУЕМОЕ поле (то, что владелец вписывает руками: «что именно делается»).
Дефолт-пример из DSK: `individualios darbų saugos platformos projektavimo, techninės specifikacijos parengimo, UX/UI dizaino, programavimo, testavimo ir paleidimo`.

Дальше — boilerplate (можно оставить как есть, опционально вынести 2.2 в `terms.subjectExtra`):

> 2.2. Projektas vykdomas etapais. Bendra projekto kaina apima šioje Sutartyje nurodytą Užsakovo pateiktą funkcijų sąrašą. Funkcijos, kurios nėra nurodytos šioje Sutartyje, arba keičia suderintą projekto logiką ir apimtį, laikomos papildomais darbais.
>
> 2.3. Pilna techninė specifikacija rengiama po Sutarties pasirašymo, remiantis Užsakovo pateiktu funkcijų sąrašu. Jeigu techninės specifikacijos rengimo metu paaiškėja poreikis funkcijoms, kurios nėra nurodytos šios Sutarties darbų apimtyje, tokios funkcijos laikomos papildomais darbais ir derinamos atskirai raštu.

### §3 DARBŲ APIMTIS

> 3.1. Į projekto darbų apimtį įeina toliau nurodytos funkcijos ir moduliai:

Затем — ***нумерованный список `terms.scope[]`***, каждый пункт `3.1.N`:
```
3.1.{{i}}. {{scope[i].title}}
   • {{scope[i].description}}        // description опционально, может быть многострочным
```
(в DSK таких пунктов 21: Multi-tenant architektūra, Naudotojų rolės, … Naudojimosi instrukcijos.)

Boilerplate после списка:

> 3.2. Jeigu projekto vykdymo metu Užsakovas pageidauja papildomų funkcijų, integracijų, dizaino pakeitimų, papildomų ekranų ar kitų darbų, kurie nėra aiškiai nurodyti 3.1 punkte, tokie darbai laikomi papildomais darbais. Papildomi darbai atliekami tik Šalims raštu suderinus jų apimtį, terminus ir kainą.
>
> 3.3. Trečiųjų šalių paslaugų mokesčiai (serverio nuoma, domenas, SMS tiekėjai, el. pašto siuntimas, failų saugykla, mokami API, licencijos ir kt.) nėra įtraukti į Sutarties kainą ir apmokami Užsakovo atskirai, jeigu Šalys raštu nesusitaria kitaip.

> Опционально `terms.excluded[]` (что НЕ входит) — если задан, выводим отдельным под-списком.

### §4 KAINA IR ATSISKAITYMO TVARKA — **РАЗНЫЙ для STAGED и ADVANCE**

Общая строка (оба типа):
> 4.1. Bendra Sutarties kaina už šioje Sutartyje nurodytus darbus yra **{{contract.amount}} {{contract.currency}}**.

**STAGED:**
> 4.2. Atsiskaitymas vykdomas etapais:

Затем ***список `terms.paymentTerms[]`*** (буллетами):
```
• {{paymentTerms[i].amount}} {{currency}} {{paymentTerms[i].label}} — {{paymentTerms[i].dueLabel}}
```
Пример DSK:
```
• 1000,00 EUR avansinis mokėjimas mokamas po Sutarties pasirašymo ir prieš pradedant darbus.
• 500,00 EUR mokama po pirmo etapo užbaigimo ir perdavimo Užsakovui.
• 750,00 EUR mokama prieš pradedant antro etapo darbus.
• 750,00 EUR mokama po antro etapo užbaigimo ir galutinio perdavimo Užsakovui.
```

**ADVANCE** (вместо списка этапов — фикс 70/30, суммы из `terms.paymentTerms`, автозаполняются backend'ом):
> 4.2. Atsiskaitymas vykdomas dviem dalimis:
> • {{avansas.amount}} {{currency}} (70%) avansinis mokėjimas mokamas po Sutarties pasirašymo ir prieš pradedant darbus.
> • {{likutis.amount}} {{currency}} (30%) mokama po darbų užbaigimo ir galutinio darbų perdavimo Užsakovui.

Общий boilerplate §4 (оба типа):
> 4.3. Paslaugų teikėjas pradeda darbus tik gavęs avansinį mokėjimą.
> 4.4. Sąskaitos apmokamos per {{settings.defaultPaymentDays}} kalendorinę dieną nuo jų pateikimo, jeigu Šalys raštu nesusitaria kitaip.
> 4.5. Mokėjimai atliekami į Paslaugų teikėjo Wise sąskaitą: **{{settings.iban}}**. Atliekant mokėjimą į Wise sąskaitą, mokėjimo šalyje būtina pasirinkti Belgiją. Mokėjimo paskirtyje rekomenduojama nurodyti Sutarties arba sąskaitos numerį.   // текст про Wise/Belgija берём из settings.bankNote
> 4.6. Jeigu Užsakovas vėluoja atlikti mokėjimą, Paslaugų teikėjas turi teisę sustabdyti darbus iki mokėjimo gavimo. Tokiu atveju projekto terminai atitinkamai pratęsiami.

### §5–§13 — фиксированный boilerplate (из DSK PDF, переносим как есть)

5. DARBŲ TERMINAI · 6. UŽSAKOVO ĮSIPAREIGOJIMAI · 7. PASLAUGŲ TEIKĖJO ĮSIPAREIGOJIMAI ·
8. DARBŲ PERDAVIMAS IR PRIĖMIMAS · 9. GARANTIJA (`{{terms.warranty}}` или дефолт «12 mėnesių») ·
10. INTELEKTINĖ NUOSAVYBĖ · 11. KONFIDENCIALUMAS · 12. SUTARTIES NUTRAUKIMAS · 13. BAIGIAMOSIOS NUOSTATOS.

> Полный текст этих секций — в исходном PDF `Paslaugu_teikimo_sutartis_UAB_DSK_Sauga_WVS000027.pdf` (стр. 3–5). Перенести дословно. Только §9 garantija параметризуем через `terms.warranty` (дефолт: «12 (dvylika) mėnesių nuo galutinio darbų perdavimo dienos»).

### §14 ŠALIŲ REKVIZITAI IR PARAŠAI

Две колонки реквизитов (как §1) + строки подписи:
```
Parašas: ____________________   // если contract.signatureUrl есть — вставляем PNG-подпись исполнителя из settings.signatureUrl, заказчика — из signatureUrl
```
Если `contract.status === 'signed'` и есть `signatureUrl` — вшиваем PNG подписи заказчика над линией + `signerName`, дату `signedAt`.

---

## ТИП MAINTENANCE — INTERNETO SVETAINĖS TECHNINĖS PRIEŽIŪROS SUTARTIS

Короткий договор (2 страницы). Бойлерплейт почти весь фиксированный, меняется только сумма и реквизиты.

### §2 SUTARTIES DALYKAS

> 2.1. **Paslaugų apimtis:** Paslaugų teikėjas įsipareigoja vykdyti nuolatinę techninę Užsakovo svetainės priežiūrą, kuri apima:

Список `terms.includes[]` (дефолт — захардкоженные 4 буллета, переопределяемо):
```
• Sistemos stabilumo stebėjimą ir klaidų (bugs) šalinimą.
• Kritinių saugumo atnaujinimų diegimą.
• Smulkių dizaino ar turinio korekcijų atlikimą (iki 2 valandų per mėnesį).
• Konsultacijas svetainės veikimo klausimais.
```

> 2.2. **Atsakomybės ribos:** Palaikymas neapima naujų didelės apimties modulių kūrimo ar esminio svetainės perdarymo, dėl kurių šalys tariasi atskirai.

### §3 ATLYGIS IR ATSISKAITYMO TVARKA

> 3.1. Paslaugų kaina yra **{{contract.amount}} {{contract.currency}}** už vieną kalendorinį mėnesį.
> 3.2. **Mokėjimo tvarka:** Užsakovas moka fiksuotą mėnesinį mokestį prieš prasidedant paslaugų teikimo laikotarpiui (išankstinis apmokėjimas).
> 3.3. Sąskaita išrašoma kiekvieno mėnesio pradžioje, o apmokėjimas turi būti atliktas per 3 (tris) darbo dienas.
> 3.4. **Svarbu:** Atliekant pavedimą į Wise sąskaitą (**{{settings.iban}}**), mokėjimo nurodyme būtina pasirinkti šalį – **Belgiją**.

### §4 TERMINAI IR NUTRAUKIMAS

> 4.1. Sutartis sudaroma neterminuotam laikotarpiui.
> 4.2. Kiekviena šalis gali nutraukti sutartį informavusi kitą šalį prieš 30 kalendorinių dienų.

### §5 GARANTIJA IR ATSAKOMYBĖ

> 5.1. Paslaugų teikėjas užtikrina stabilų svetainės veikimą ir techninę priežiūrą pagal suteiktas prieigas.
> 5.2. Teikėjas neatsako už sutrikimus, kilusius dėl trečiųjų šalių (hostingo, domenų) kaltės, jei jie nepatenka į Teikėjo kontrolės sritį.

### Подписи

```
Paslaugų teikėjas                 Užsakovas
[signatureUrl PNG / settings.signatureUrl]
________________________          ________________________
(parašas, vardas, pavardė)        (parašas, vardas, pavardė)
```

---

## Замечания для PDF-агента

- Язык документов — **литовский** (ADR-014), общение в коде/комментах — по проекту.
- Деньги форматируем `Intl.NumberFormat('lt-LT', { style:'currency', currency })` → `1 000,00 €` (запятая-десятичный).
- `terms.subject` и `terms.scope` приходят строками/массивами — НЕ хардкодить DSK-данные, это лишь примеры дефолтов.
- Подпись заказчика (PNG из Vercel Blob, `contract.signatureUrl`) вшивается в финальный PDF только при `status='signed'`.
- Для STAGED и ADVANCE используем ОДИН TSX-компонент с условным §4 по `kind`, а не два дублирующих файла.
