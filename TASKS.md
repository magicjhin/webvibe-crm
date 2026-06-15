# TASKS — Webvibe CRM

> Живой документ. Если читаешь холодным — начни с раздела **«Где мы сейчас»** ниже.
> Полный план итераций — `ROADMAP.md`.

---

## Где мы сейчас

**HEAD:** `d7d27fb fix(mobile,chart): dedupe sheet close + readable chart text/scrollbar` (+ незакоммиченные правки сессии 2026-05-28, см. ниже)
**Branch:** `main → origin/main`
**Repo:** https://github.com/webvibe-work/webvibe-crm

> **Iter 3 полностью закоммичен** (схема + CRUD invoices/payments/expenses + литовский PDF + Dashboard KPI). После него вперёд вытянули кусок **Iter 6 (dashboard + mobile polish)**: страница Documents с табами, dashboard period switcher (месяц/квартал/год) + income/expense bar chart, рабочий бургер-меню + quick-add FAB + скроллящийся график на мобильном.

> **Сессия 2026-05-28 (последнее что делали — НЕ закоммичено):**
> 1. `PeriodSwitcher.tsx` — на мобильном табы Месяц/Квартал/Год растягиваются на всю ширину (`flex-1`), навигация месяца центрируется; на `sm:` прежнее поведение.
> 2. `nav-items.ts` — все пункты меню переведены на русский (Дашборд/Клиенты/Лиды/Проекты/Документы/Платежи/Расходы/Поддержка/Напоминания/Настройки/Ещё).
> 3. `app/more/page.tsx` — заголовок `More` → `Ещё`.
>
> `typecheck` / `lint` — ✓. Эти 3 файла в working tree, ждут commit + push.
>
> **Iter 4 — Contracts + Proposals + Signature — ✅ Done (2026-05-31, `dbe0fbf` код + docs-коммит).** Конвейер агентов (backend → PDF + frontend параллельно), Codex 2 прохода (Pass 1: 2 Critical + 8 Important → все Critical и большинство Important исправлены; Pass 2: Accept, 0 Critical). typecheck/lint/build зелёные. ADR-027: три типа договора (`STAGED`/`ADVANCE`/`MAINTENANCE`), §2 редактируемый, поддержка при подписи создаёт `Maintenance`. Баг нумерации `WVS-000027 → WVS000027` починен. Отложено в backlog: immutable signed-PDF в Blob, Proposal→Project conversion.
>
> **Следующее:** Iter 5 (Leads + Reminders + Maintenance UI + Cron) — отложен по решению владельца как несрочный; затем Iter 7 (polish + a11y + 44px touch targets + README). Перед production — финальные PWA-иконки, `BLOB_READ_WRITE_TOKEN` + `CRON_SECRET` на Vercel.
>
> **Iter 6 (PWA + mobile polish) — ✅ Done (2026-05-31).** Service Worker (prod-only, рукописный `public/sw.js`), offline-оболочка (HTML не кешируется — privacy), install-prompt, bottom-sheets, sticky-save, свёрнутый tablet-sidebar, Web Share PDF, фикс трейсинга PDF-шрифтов. Codex 2 прохода (Pass 1: 1 Critical [sw.js в .gitignore] + 5 Important → исправлены/в backlog; Pass 2: remaining «Critical» = sw.js ещё не закоммичен, закрывается этим коммитом).

### Iterations status

| Iter | Название | Статус | Commit |
|---|---|---|---|
| 0 | Bootstrap | ✅ Done | `3cec00a` |
| 1 | Auth + Settings skeleton | ✅ Done | `ebd4044` |
| 2 | Clients + Projects + Tasks | ✅ Done | `20a2702` |
| 3 | Invoices + Payments + Expenses + Dashboard KPI | ✅ Done | `df8f14e` |
| 4 | Contracts + Proposals + Signature | ✅ Done | `dbe0fbf` |
| 5 | Leads + Reminders + Maintenance + Cron | planned | — |
| 6 | PWA + Mobile polish | ✅ Done | Iter 6 commits 2026-05-31 |
| 7 | Polish + a11y + README (+ CSV export) | planned | — |

### Что работает сейчас (по факту)

- Next.js 15 App Router + TS strict + Tailwind v4 + shadcn/ui + Prisma 7 + Neon Postgres + pnpm 11
- Auth.js v5 Credentials (JWT session) — single-admin login на `/login`
- Middleware whitelist regex защищает все пути кроме public (login/sign/api-auth/cron/offline/manifest/icons/favicon)
- Prisma 7 driver adapter `@prisma/adapter-pg`:
  - runtime: `DATABASE_URL` pooled (`lib/db.ts` singleton)
  - migrate: `DIRECT_URL` direct (`prisma.config.ts`)
  - generated client в `lib/generated/prisma/client` (в `.gitignore`)
- Модели: `User` (single admin, ADR-002 invariant в seed + runtime auth), `Settings` (singleton id=1)
- `/settings/profile` — реальная форма (RHF + Zod) с live numbering preview
- AppShell с user-аватаром и SignOut
- PWA manifest + placeholder W-иконки (SW регистрация — Iter 6)
- Реальные страницы: `/clients`, `/projects` (+ tasks), `/invoices` (+ PDF), `/payments`, `/expenses`, `/dashboard` (KPI + period switcher + income/expense chart), `/documents`, `/settings/profile`
- `ComingSoon` остаётся на: `/leads`, `/maintenance`, `/reminders`, `/more` (Ещё) — реальные фичи в Iter 4–6
- Меню (бургер + нижние табы + sidebar) полностью на русском (`nav-items.ts`)

### Окружение для запуска

`.env` локальный (не в git) должен содержать:
- `DATABASE_URL` — Neon pooled (`-pooler.` в host)
- `DIRECT_URL` — Neon direct (без `-pooler.`)
- `AUTH_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` локально
- `ADMIN_EMAIL` — твой email
- `ADMIN_PASSWORD_HASH` — bcrypt-хеш, генерируется через `pnpm tsx scripts/hash-password.ts` (interactive prompt, без эха)
- `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET` — пока пустые (нужны с Iter 4 и Iter 5)

Команды для cold-start локально:
```bash
pnpm install
pnpm prisma migrate dev          # применяет существующие миграции
pnpm tsx prisma/seed.ts          # idempotent
pnpm dev
```

---

## Следующая: Iteration 2 — Clients + Projects + Tasks

Цель: создать три CRM-сущности первого уровня. Никаких документов/платежей/PDF в Iter 2 — это Iter 3+.

### Scope

- Prisma модели: `Client`, `Lead` (только определение для FK; полный UI Leads — Iter 5), `Project`, `Task` + соответствующие enums (`ClientKind`, `ClientStatus`, `LeadUrgency`, `LeadStatus`, `ProjectType`, `ProjectStatus`, `TaskStatus`, `TaskPriority`) — см. `DATABASE.md`
- Миграция `add-clients-projects-tasks` к Neon
- CRUD страницы для Clients и Projects:
  - `/clients` — список (TanStack Table, фильтры по status/kind)
  - `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`
  - карточка клиента с вкладками (Детали / Проекты / Documents-stub / Payments-stub) — Documents и Payments tabs пустые до Iter 3
  - `/projects` — список (фильтры по status/type)
  - `/projects/new`, `/projects/[id]`, `/projects/[id]/edit`
  - карточка проекта: ссылки (Figma/GitHub/Vercel/Drive — JSON), stages-чеклист (JSON), inline tasks
- Tasks — inline в карточке проекта, отдельной страницы нет
- Server actions: `clients.ts`, `projects.ts`, `tasks.ts` с `auth()` guard + Zod + Result pattern
- Zod schemas: `lib/validators/{client,lead,project,task}.ts` — пока Lead схема минимальна (полная UI Leads — Iter 5)
- Обновить `<DataTable>` wrapper (если ещё нет) над TanStack Table — общий для всех списков
- Replace `app/clients/page.tsx` и `app/projects/page.tsx` ComingSoon на реальные страницы
- `app/leads/page.tsx` остаётся ComingSoon (полная фича — Iter 5; модель появляется сейчас только для FK на `Project.convertedFromLeadId`)

### НЕ входит в Iter 2

- Invoices, Contracts, Proposals, Payments, Expenses, Maintenance, Reminders, Documents page, Dashboard real KPI, PDF, Signature, PWA SW, Email, Vercel deploy, реальный Leads UI

### Open questions (решить до старта Iter 2)

- **Backlog / non-blocking items** ниже — фиксить в Iter 2 или оставить?
- **Подсчёт totals** на проекте (`price`, `advance`) — Decimal через Prisma. UI отображение через `Intl.NumberFormat('lt-LT', { currency: 'EUR' })` — создать `<MoneyDisplay>` компонент.
- **DataTable** — копируем shadcn data-table рецепт или строим тонкую обёртку?
- **Project stages** — захардкоженный template или сразу свободный JSON через UI?

### Done criteria для Iter 2

- [ ] Миграция applied, schema validates
- [ ] CRUD `/clients` работает (create / read / update / delete)
- [ ] CRUD `/projects` работает
- [ ] Tasks inline create/update/delete внутри карточки проекта
- [ ] Все формы — RHF + Zod, server actions с `auth()` + Result<T>
- [ ] Все списки — TanStack Table с empty/loading/error states
- [ ] `pnpm typecheck` / `lint` / `build` / `prisma format` — ✓
- [ ] Codex review Pass 1 (+ Pass 2 если существенные изменения) — 0 Critical
- [ ] Commit + push, working tree clean
- [ ] Manual smoke test от владельца: создать клиента → создать проект для него → добавить задачу → отметить done → удалить задачу

---

## Backlog (non-blocking polish)

Из Codex review предыдущих итераций, не блокируют дальнейшую работу:

- **`normalizeCallbackUrl` — ужесточить** в `lib/actions/auth.ts`: `^\/login(\/.*)?$/` не ловит `/login?x=1` и `/login#x`. Middleware всё равно редиректит залогиненных с `/login`, поэтому лоопа нет.
- **`Field` fragment edge case** в `components/forms/Field.tsx`: `isValidElement()` true для фрагментов — кастомные сложные children словят cloneElement вместо fallback. Текущие usages передают один input, ОК.
- **`Field` не пробрасывает aria в `Controller`-обёртки** (Pass 1 nice-to-have): когда `<Field>` оборачивает `<Controller render={...}>`, aria-invalid не доходит до реального `SelectTrigger`. Косметика a11y, не блокирует.
- **`MoneyDisplay` принимает `number`** (Pass 1 nice-to-have): сужать API до `Decimal | string` или явно задокументировать derived-only сценарии.
- **Tablet collapsed sidebar (640–1024px)** — сейчас sidebar показывается с `md:` (≥768px) во всю ширину. По `UI-DESIGN.md` на tablet должен быть свёрнут в 60px иконки. → **Iter 6 (mobile polish)**.
- **Sticky save button на mobile в формах** (Pass 1 nice-to-have): сейчас sticky только с `md:`. → **Iter 6**.
- **`createTask` order race** (Pass 1 nice-to-have): `aggregate` + `create` без транзакции; для single-user риск низкий, но при параллельных add теоретически возможен дубль `order`. Использовать `$transaction` или unique constraint при необходимости.
- **`@prisma/adapter-neon`** — оптимизация для Vercel Edge runtime. Не нужна пока (мы используем Node runtime). Если станет нужно — заменить в `lib/db.ts` + `prisma.config.ts`.
- **Финальные PWA иконки** из webvibe-логотипа (сейчас placeholder W). → **перед production deploy**.

**Из Codex review Iter 4 (Important, перенесены — не блокеры):**
- **Immutable signed PDF в Blob** — сейчас PDF договора рендерится on-demand из текущего кода/Settings; для подписанного договора это значит, что правка Settings/шаблона изменит вид уже подписанного документа. Решение: при `signContract` рендерить финальный PDF (с вшитой подписью) и сохранять в Vercel Blob → `Contract.pdfUrl`; для signed отдавать сохранённый PDF, для draft/sent — render-on-demand. (Подпись-PNG уже immutable через `signatureUrl`.)
- **Proposal → Project conversion** — кнопка на accepted-КП ведёт на `/projects/new?proposalId=`, но `ProjectForm` пока читает только `clientId`; не предзаполняет проект из КП и не проставляет `Proposal.projectId`. Доделать предзаполнение (title/scope/price из КП) и связывание.
- **SignaturePad bitmap/DPR** (nice-to-have) — canvas размер задан CSS, без синхронизации bitmap с devicePixelRatio → на мобильных подпись может быть размытой. Синхронизировать ширину/высоту canvas с контейнером × DPR.
- **`signContractSchema.signaturePng`** принимает любой URL — при прямом server-action вызове можно записать не-Blob URL. Валидировать Blob-host/prefix или принимать data URL только в route.
- **`/documents` единый data-layer** (nice-to-have) — сейчас invoices через прямой Prisma, contracts/proposals через server actions. Свести к одному server-side слою для virtual `Document`.

**Из Codex review Iter 6 (Important/nice-to-have, перенесены — не блокеры):**
- **Touch targets 44px на мобиле** — основные действия (sticky-save submit, header PDF/Share/Edit) используют дефолтный `Button h-8` (32px), ниже UI-DESIGN-правила ≥44px. Сделать на мобиле крупнее (responsive size). → Iter 7 (a11y/polish pass).
- **Группировка header-экшенов на мобиле** — после Share PDF действий стало больше; сейчас `flex-wrap` (overflow закрыт), но лучше icon-only / dropdown-группировка на узких экранах. → Iter 7.
- **Install-prompt: устойчивый dismiss** — сейчас `DISMISS_KEY` пишется при X/appinstalled, но не при `userChoice.outcome==='dismissed'`. Добавить запись dismiss.
- **SW + offline read-only dashboard** — намеренно НЕ кешируем авторизованный HTML (privacy). Если позже захотим offline-доступ к dashboard — кешировать только явно безопасные read-only данные с очисткой при logout.
- **SharePdfButton revoke objectURL** — отложить через microtask/таймаут для кросс-браузерной совместимости (nice-to-have).

**Из Codex review Word (.docx) export (Important/nice-to-have, перенесены — не блокеры):**
- **`CONTRACTS-LT-SOURCE.md` рассинхрон со STAGED/ADVANCE шаблоном** — source-документ описывает старую нумерацию (`§2 SUTARTIES DALYKAS`, `§3 DARBŲ APIMTIS`, `§4 KAINA`), а фактические PDF/Word-шаблоны используют `§2 SUTARTIES DALYKAS IR DARBŲ APIMTIS`, `§3 APMOKĖJIMAS`, boilerplate с `4. TERMINAI`. Обновить source под текущую структуру (объявлен эталоном литовского текста).
- **`buildContractData` read-path guard** — `lib/pdf/renderContract.tsx` берёт тело по `terms.kind`, а `kind` в результат кладёт из `contract.kind`. Create/update инвариант валидируют, но общий builder лучше явно падать при `contract.kind !== terms.kind` (защита от ручных/импортных неконсистентных записей).
- **docx API: не отдавать сырой `err.message` на 500** (nice-to-have) — в `app/api/{contracts,invoices}/[id]/docx/route.ts` отдавать generic-текст, детали в `console.error`.
- **`Content-Disposition` filename sanitization** (nice-to-have) — имя файла собирается из номера документа без экранирования; для импортных номеров со спецсимволами добавить sanitization.

---

## Done iterations (compact)

### Iter 0 — Bootstrap (`3cec00a`)

Next.js 15 + TS strict + Tailwind v4 + shadcn/ui + Prisma 7 + pnpm 11. Dark-first Webvibe theme (HSL palette, accent gradient, status colors, shadows). AppShell skeleton (sidebar 240/topbar 50-60/bottom nav 64/FAB). 11 placeholder routes через ComingSoon. PWA manifest + placeholder W-иконки. Prisma пустая schema. `app/globals.css` с CSS-vars. Inter + Geist Mono через `next/font`. shadcn initial subset: button, input, label, dialog, sheet, table, select, textarea, badge, card, dropdown-menu, sonner.

**Codex:** Pass 1 — 1 Critical (Next 16→15) + 6 Important + 4 Nice — все обработаны. Pass 2 — 0 Critical.

### Iter 1 — Auth + Settings skeleton (`ebd4044`)

Auth.js v5 split config (Edge-safe `lib/auth.config.ts` для middleware + Node-only `lib/auth.ts` с Credentials + bcrypt + Prisma). JWT session. Middleware с whitelist regex + `callbackUrl` сохранение + редирект `/login → /dashboard` для залогиненных. Login page `(auth)/login` с RHF + Zod + toast + ARIA + `useTransition`. SignOut server action. `User` + `Settings(id=1)` модели + первая миграция + seed (idempotent с ADR-002 guard). Settings page с реальной формой (3 Card секции, live numbering preview через `useWatch`). Custom `Field` helper (shadcn `form` отсутствует в v4). AppShell async теперь, Topbar показывает user-аватар + email + SignOut.

**Critical fix Pass 2:** `lib/auth.ts` authorize теперь проверяет `findMany({ take: 2 })` всей таблицы User, требует exactly 1 row + exact email match перед `bcrypt.compare` — runtime ADR-002 invariant.

**Codex:** Pass 1 — 0 Critical, 4 Important, 5 Nice. Pass 2 — 1 Critical (auth invariant) → исправлен. Manual smoke test passed.

### Iter 3 — Invoices + Payments + Expenses + Dashboard KPI (code ready)

**Schema:** миграция `20260528164725_iter3_invoices_payments_expenses` добавляет 4 модели (`Invoice`, `InvoiceItem`, `Payment`, `Expense`) + 4 enum'а (`InvoiceKind`, `InvoiceStatus`, `PaymentKind`, `ExpenseCategory`). Settings расширен `personalCode`, `bankNote`, `defaultPaymentDays`. Client расширен `representative`, `technicalContactName`. Back-relations `invoices` / `payments` добавлены на Client и Project. `Invoice.maintenanceId` + `@@unique([maintenanceId, periodKey])` отложены до Iter 5 (поле `periodKey` уже есть, индекс появится с Maintenance моделью).

**Validators** (`lib/validators/{invoice,payment,expense}.ts`): money — `string` с regex (`MONEY_STRING_RE`), Decimal через `decimal.js` в server actions, не в browser bundle. RHF-friendly без `.default()` на required. `recurrence` — чистый `z.enum().nullable()` без литерала `""` (RHF + `zodResolver` не дружит с output≠input типами на literal unions; для текстовых полей `optionalText` с `""→null` работает, но для enum'а — нет).

**Numbering** (`lib/numbering/issueNumber.ts`): три explicit функции (`issueInvoiceNumber`, `issueContractNumber`, `issueProposalNumber`). Каждая делает атомарный `tx.settings.update({ data: { invoiceCounter: { increment: 1 } } })` внутри `prisma.$transaction` с INSERT документа. Никогда не `MAX(number)+1`. Известный мелкий артефакт: `WVS` prefix даёт `WVS-000027` вместо целевого `WVS000027` (см. backlog, фиксится в Iter 4 вместе с Contracts).

**PDF** (`lib/pdf/renderInvoice.tsx` + `components/pdf/`): `@react-pdf/renderer` в Node runtime. Inter font c subset `latin + latin-ext` — обязательно для литовских диакритик (ąčęėįšųūž), без него рендерятся `.notdef` боксы. Layout — точная реплика WV-022: title, meta, две PartyBox (Pardavėjas/Pirkėjas), items table, totals (Tarpinė / PVM 0,00 / Iš viso apmokėti), Pastabos, watermark, footer с page numbers. Route `/api/invoices/[id]/pdf` — `runtime = "nodejs"`, `maxDuration = 30`. `pdfUrl` сбрасывается при edit'е счёта (cache invalidation).

**Server actions** (`lib/actions/{invoices,payments,expenses}.ts`): `auth()` guard, Zod safeParse, Result<T>. `updateInvoice` блокирует edit для paid/cancelled, заменяет items wholesale (deleteMany + create). `deleteInvoice` — только drafts (P2003 защищает от удаления при наличии платежей). `uploadExpenseFile` — Vercel Blob `put()` с `addRandomSuffix`, валидирует MIME (PDF/JPEG/PNG/WebP/HEIC) + 8MB max, friendly degradation если нет `BLOB_READ_WRITE_TOKEN`. `deleteExpense` — best-effort `del()` (warn, не error).

**UI**: 
- Invoices: `/invoices` (фильтры status+kind, derived overdue badge), `/invoices/new` (поддерживает `?clientId`, `?projectId`; EmptyState если нет клиентов; default dueAt = today + `defaultPaymentDays`), `/invoices/[id]` (PDF iframe preview, sum/paid/timing cards, items, payments с кнопкой «Добавить платёж» при остатке > 0), `/invoices/[id]/edit` (drafts only — редирект если не draft).
- Payments: `/payments` (фильтры kind, поиск), `/payments/new` (поддерживает `?clientId`, `?projectId`, `?invoiceId`; автозаполнение суммы как остатка по счёту; cascade client → projects → invoices).
- Expenses: `/expenses` (фильтр category, paperclip-индикатор файла), `/expenses/new`, `/expenses/[id]/edit`. ExpenseForm с inline file upload (uploadExpenseFile → fileUrl → submit).
- Dashboard: 4 KPI-карточки (доход/расход за месяц в Vilnius TZ, неоплаченные с overdue counter, активные проекты) + 3 секции (просроченные счета, свежие 5 платежей, top-категории расходов с progress bars).

**TZ bounds для dashboard**: `monthBounds()` использует `formatInTimeZone(now, 'Europe/Vilnius', 'yyyy')` + `parseDateOnly()` → UTC Dates, чтобы границы месяца не сдвигались при смене runtime TZ Vercel'а.

### Iter 2 — Clients + Projects + Tasks (`20a2702`)

Schema: `Client`, `Lead`, `Project`, `Task` + 8 enums (`ClientKind/Status`, `LeadUrgency/Status`, `ProjectType/Status`, `TaskStatus/Priority`). Back-relations на Invoice/Contract/Proposal/Payment/Maintenance/Reminder намеренно опущены — добавим в Iter 3+. Миграция `20260528144353_add_clients_projects_tasks` (Restrict Client→Project, Cascade Project→Task, SetNull Lead.clientId/convertedToProjectId).

Validators (`lib/validators/{client,lead,project,task}.ts`): RHF-friendly без `.default()` на required-полях; money — `string` с regex + `nonNegativeMoneyString` для project price/advance; `links` — `record` со значениями-union (`"" | URL`) и transform который дропает пустые; `lib/money/parseDecimal.ts` использует `decimal.js` напрямую (не Prisma) чтобы не тащить runtime в client bundle.

Dates: `lib/dates/parse.ts` — `parseDateOnly`/`formatDateOnly` через `Europe/Vilnius` (date-fns-tz). `DateDisplay` теперь форматирует через `formatInTimeZone` — runtime TZ деплоя не сдвигает день.

Server actions (`lib/actions/{clients,projects,tasks}.ts`): `auth()` guard, Zod safeParse, Result<T>; обработка P2003/P2014/P2025; Json-поля через `Prisma.JsonNull`. `updateProject` ловит P2003 (несуществующий clientId). `createTask` назначает `order = max + 1` (см. backlog про race).

UI primitives: `components/data/{DataTable,EmptyState,StatusBadge,DateDisplay,MoneyDisplay,DeleteConfirm}.tsx`, `components/layout/PageHeader.tsx`. DataTable — тонкая обёртка над TanStack (`overflow-x-auto` для mobile). Добавлены shadcn `tabs` + `checkbox`.

Clients: `/clients` (фильтры status/kind + поиск), `/clients/new`, `/clients/[id]` (табы Детали/Проекты/Документы-stub/Платежи-stub), `/clients/[id]/edit`. Удаление блокируется по проектам.

Projects: `/projects` (фильтры status/type + поиск), `/projects/new` (поддерживает `?clientId=...`), `/projects/[id]` (header + KPI cards + links chips + stages + tasks + notes), `/projects/[id]/edit`. Удаление — каскад tasks. Stages — JSON чеклист с optimistic+rollback. Tasks inline — add/toggle/dropdown edit/delete с optimistic+rollback и edit-dialog с remount по `key={task.id}`. Links: 6 typed-полей (site/github/vercel/figma/drive/wpAdmin), пустые не сохраняются, отображаются как chips.

Action items на mobile видны по умолчанию (`opacity-70 md:opacity-0 md:group-hover:opacity-100`) — Codex Pass 1 fix.

**Codex:** Pass 1 — 0 Critical, 7 Important (все исправлены), 5 Nice-to-have (перенесены в Backlog или Iter 6). Pass 2 focused — 2 Critical (linksRecord URL до transform + DateDisplay runtime TZ) → оба исправлены. Третий проход не запускался по ADR-018. Manual smoke test от владельца — pending.

### Servicing iterations

- `00dbea0` planning docs
- `81c3c4b` Codex review + GitHub checkpoint workflow + 17 docs/agents
- `1c492e9` 2-pass Codex review limit (ADR-018)
- `e6c4513`, `66e96f1`, `fef6f39` — TASKS.md sync commits
