# ARCHITECTURE — Webvibe CRM

Архитектурные решения. Если решение меняется — обновлять и фиксировать в `DECISIONS.md`.

---

## High-level

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js 15                            │
│                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│   │  Server      │   │  Server      │   │  Route       │   │
│   │  Components  │──▶│  Actions     │──▶│  Handlers    │   │
│   │  (RSC)       │   │  (mutations) │   │  (PDF, cron) │   │
│   └──────────────┘   └──────────────┘   └──────────────┘   │
│           │                  │                  │            │
│           └──────────────────┴──────────────────┘            │
│                              │                                │
│                       ┌──────▼───────┐                       │
│                       │   Prisma     │                       │
│                       └──────┬───────┘                       │
└──────────────────────────────┼───────────────────────────────┘
                               │
                  ┌────────────┴───────────┐
                  │                        │
            ┌─────▼──────┐         ┌───────▼─────┐
            │   Neon     │         │  Vercel     │
            │ Postgres   │         │   Blob      │
            └────────────┘         └─────────────┘
```

- **Runtime: только Node.js** (нигде не используем Edge — Prisma несовместим).
- **Один проект, один деплой, один пользователь.**
- **Никаких внешних API в MVP** кроме Neon (БД) и Vercel Blob (хранилище).

---

## Структура каталогов

```
app/
  (auth)/
    login/page.tsx
  (app)/                          ← protected layout (auth middleware)
    layout.tsx                    ← AppShell
    dashboard/page.tsx
    clients/
      page.tsx
      new/page.tsx
      [id]/
        page.tsx
        edit/page.tsx
    leads/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    projects/
      page.tsx
      new/page.tsx
      [id]/
        page.tsx
        edit/page.tsx
        tasks/page.tsx
    invoices/
      page.tsx
      new/page.tsx
      [id]/
        page.tsx
        edit/page.tsx
    contracts/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    proposals/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    payments/
      page.tsx
      new/page.tsx
    expenses/
      page.tsx
      new/page.tsx
    maintenance/
      page.tsx
      [id]/page.tsx
    reminders/
      page.tsx
    documents/page.tsx            ← агрегированное представление
    settings/
      profile/page.tsx
      branding/page.tsx
      numbering/page.tsx
  sign/
    [token]/page.tsx              ← публичная страница подписи (NO auth)
  api/
    auth/[...nextauth]/route.ts
    invoices/[id]/pdf/route.ts
    contracts/[id]/pdf/route.ts
    proposals/[id]/pdf/route.ts
    sign/[token]/route.ts         ← POST подпись
    cron/maintenance-invoices/route.ts
  manifest.webmanifest
  icon.png
  apple-icon.png
  layout.tsx
  globals.css

components/
  ui/                             ← shadcn/ui примитивы
  layout/
    AppShell.tsx
    Sidebar.tsx
    Topbar.tsx
    MobileNav.tsx                 ← bottom tab bar
    PageHeader.tsx
    QuickAddFab.tsx
  data/
    DataTable.tsx                 ← обёртка TanStack Table
    EmptyState.tsx
    StatusBadge.tsx
    MoneyDisplay.tsx
    DateDisplay.tsx
    LoadingSkeleton.tsx
    ErrorBoundary.tsx
  forms/                          ← все формы + Zod schemas
    ClientForm.tsx
    LeadForm.tsx
    ProjectForm.tsx
    TaskForm.tsx
    InvoiceForm.tsx
    ContractForm.tsx
    ProposalForm.tsx
    PaymentForm.tsx
    ExpenseForm.tsx
  dashboard/
    KpiCard.tsx
    RevenueCard.tsx
    OverdueInvoices.tsx
    ActiveProjects.tsx
    UpcomingDeadlines.tsx
    OverdueTasks.tsx
    WaitingClient.tsx
    LeadsNeedingResponse.tsx
    TodayReminders.tsx
    MaintenanceDue.tsx
  pdf/
    InvoicePdf.tsx                ← @react-pdf/renderer template
    ContractPdf.tsx
    ProposalPdf.tsx
    SignatureBlock.tsx
    pdfStyles.ts
  signature/
    SignaturePad.tsx              ← client component
    SigningScreen.tsx
  pwa/
    InstallPrompt.tsx
    OfflineBanner.tsx
    ServiceWorkerRegister.tsx

lib/
  auth.ts                         ← NextAuth config + auth() helper
  db.ts                           ← Prisma client singleton
  validators/                     ← Zod schemas (один источник истины для типов)
    client.ts
    lead.ts
    project.ts
    task.ts
    invoice.ts
    contract.ts
    proposal.ts
    payment.ts
    expense.ts
  actions/                        ← server actions по доменам
    clients.ts
    leads.ts
    projects.ts
    tasks.ts
    invoices.ts
    contracts.ts
    proposals.ts
    payments.ts
    expenses.ts
    maintenance.ts
    reminders.ts
    sign.ts
  pdf/
    renderInvoice.ts
    renderContract.ts
    renderProposal.ts
    embedSignature.ts
  numbering/
    issueNumber.ts                ← транзакционная нумерация
  money/
    format.ts
    decimal.ts
  dates/
    format.ts
  storage/
    blob.ts                       ← Vercel Blob wrapper
  signTokens/
    create.ts
    verify.ts
  cron/
    maintenance-invoices.ts
  permissions.ts                  ← простая проверка auth (single user)

prisma/
  schema.prisma
  migrations/
  seed.ts

public/
  icons/
    icon-192.png
    icon-512.png
    icon-maskable.png
    apple-touch-icon.png
  manifest.webmanifest
  logo.svg

scripts/
  hash-password.ts                ← bcrypt CLI хелпер

styles/
  globals.css                     ← @tailwind, токены, dark theme
```

---

## Server vs Client Components

**По умолчанию — Server.** Client добавляем только когда нужно одно из:
- состояние (`useState`)
- effects (`useEffect`)
- браузерные API (canvas, navigator, window)
- библиотеки, требующие client (RHF, signature-canvas, charts)
- интерактивные обработчики (`onClick`, `onChange`)

Маркер `'use client'` ставим **только** в листовых компонентах. Layouts и pages — Server.

Формы — Client component (RHF), но валидация и Zod-схема импортируется в server action.

---

## Server Actions vs Route Handlers

**Server Actions** — для всех мутаций данных (create/update/delete клиентов, проектов, ...).
- Импортируются прямо в form компоненты.
- Возвращают `{ ok: true, ...data }` или `{ ok: false, error }`.
- Валидация Zod внутри action.
- На каждой — `auth()` check, кроме `sign` (там отдельная защита токеном).

**Route Handlers** (`app/api/...`) — для:
- NextAuth (`/api/auth/[...nextauth]`)
- генерации PDF (возвращает `Response` со `Content-Type: application/pdf`)
- cron jobs (защита через `CRON_SECRET` header)
- POST на `/api/sign/[token]` (если нужно вне server action из-за file upload)

---

## Auth strategy

- **Auth.js v5** (NextAuth) Credentials provider.
- Один user, читаем из БД (`User` table).
- Password verification: `bcryptjs` compare.
- Session: JWT strategy (быстрее, не требует таблицы sessions).
- Middleware (`middleware.ts`) защищает `(app)` group:
  ```
  if (!session && path.startsWith('/(app)')) redirect('/login')
  ```
- `/sign/[token]` — публичный, защищён собственным механизмом токенов.
- `/api/cron/*` — защищены `Authorization: Bearer ${CRON_SECRET}`.

---

## Money & Decimal

- В БД — `Decimal(12, 2)`.
- В коде — `Prisma.Decimal` или `decimal.js`, никогда `number`.
- На границе с UI — `.toFixed(2)` + `Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' })`.
- Валюта берётся из `Settings.defaultCurrency` (для MVP — всегда EUR).

---

## Dates

- В БД — UTC (`DateTime` в Prisma).
- Парсинг входов от пользователя — `date-fns` с указанием timezone `Europe/Vilnius`.
- Отображение — через `<DateDisplay>` компонент, локаль `lt`.

---

## PWA strategy

### Manifest

`/manifest.webmanifest` со всеми обязательными полями + maskable иконка.

### Service Worker

- **Только в production** (`if (process.env.NODE_ENV === 'production') register()`).
- В dev — `unregister()` при загрузке (избегаем конфликта с HMR).
- Стратегия:
  - HTML / pages: `NetworkFirst` (online — свежо, offline — последний кеш)
  - static assets (`/_next/static/`): `CacheFirst`
  - API / mutations: `NetworkOnly` (не кешируем POST)
- Offline shell: `/offline` страница в кеше precache.

### Что НЕ делаем

- Offline mutations (background sync) — Phase 2.
- Push notifications — Future.

---

## PDF rendering pipeline

```
[Server Action / Route Handler]
       │
       ├── prisma.invoice.findUnique({ include: { items, client } })
       │
       ├── <InvoicePdf data={...} /> (React tree, @react-pdf/renderer)
       │
       ├── renderToStream() → PDF buffer
       │
       ├── (опционально) upload to Vercel Blob, save pdfUrl
       │
       └── return Response(stream, { headers: { 'Content-Type': 'application/pdf' } })
```

- Шаблоны — на **литовском**.
- Без PVM. Если нужна нота — пишем `"Suma be PVM"` мелким шрифтом под суммой.
- `runtime = 'nodejs'`, `maxDuration = 30` для PDF endpoints.

---

## Numbering pipeline (критично)

Транзакционно, чтобы не было дубликатов:

```ts
// lib/numbering/issueNumber.ts
export async function issueInvoiceNumber(tx: Prisma.TransactionClient) {
  const settings = await tx.settings.update({
    where: { id: 1 },
    data: { invoiceCounter: { increment: 1 } },
    select: { invoicePrefix: true, invoiceCounter: true, invoicePadding: true },
  });
  return `${settings.invoicePrefix}-${String(settings.invoiceCounter).padStart(settings.invoicePadding, '0')}`;
}
```

Использование:

```ts
await prisma.$transaction(async (tx) => {
  const number = await issueInvoiceNumber(tx);
  await tx.invoice.create({ data: { number, ... } });
});
```

Это атомарно — счётчик и инвойс инкрементируются вместе. Постоянная защита от race без явных locks.

Стартовые значения `invoiceCounter` / `contractCounter` задаются в Settings (можно ввести существующий последний номер, дальше — автоинкремент).

---

## Sign tokens

```ts
// lib/signTokens/create.ts
const raw = randomBytes(32).toString('base64url');
const hash = sha256(raw);
await prisma.contract.update({
  where: { id },
  data: {
    signTokenHash: hash,
    signTokenExpiresAt: addDays(new Date(), 7),
  },
});
return raw; // отдаём только в URL, в БД хранится только hash
```

При входе на `/sign/[token]`:
- хешируем токен, ищем по hash
- проверяем `signTokenExpiresAt > now`
- проверяем `status !== 'signed'`
- после успешной подписи — `signTokenHash = null`, `status = 'signed'`

---

## Error handling

- Server actions возвращают `{ ok, error?, data? }`, никогда не бросают наружу.
- На клиенте — toast (sonner) + поля с ошибками из Zod.
- В route handlers — `try/catch` + `Response.json({ error }, { status })`.
- Глобальный `ErrorBoundary` для UI.

---

## Type safety

- TypeScript `strict: true`.
- `noUncheckedIndexedAccess: true`.
- Zod schemas — единственный источник истины для типов форм. `z.infer<typeof schema>` экспортируется как DTO.
- Prisma-генерированные типы используются для БД-слоя; для UI — Zod-типы или явные `Pick<...>`.

---

## Logging & observability

- В MVP — `console.log` достаточно.
- Phase 2 — Sentry (DSN в env).
- Vercel автоматически собирает логи.
