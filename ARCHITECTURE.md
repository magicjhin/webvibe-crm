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
  offline/
    page.tsx                      ← PWA offline shell
  api/
    auth/[...nextauth]/route.ts
    invoices/[id]/pdf/route.ts
    contracts/[id]/pdf/route.ts
    proposals/[id]/pdf/route.ts
    sign/[token]/route.ts         ← POST подпись
    cron/maintenance-invoices/route.ts
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
    MaintenanceForm.tsx
    ReminderForm.tsx
    SettingsForm.tsx
    SignatureForm.tsx             ← на публичной /sign/[token]
    -- список расширяется по мере появления модулей --
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
    maintenance.ts
    reminder.ts
    settings.ts
    sign.ts                       ← schema POST /api/sign/[token]
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
  manifest.webmanifest                 ← статический PWA manifest (один источник истины)
  sw.js                                ← Service Worker (generated, в .gitignore)
  workbox-*.js                         ← (generated, в .gitignore)
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
- Один user, читаем из БД (`User` table). Runtime ADR-002 invariant: `findMany({ take: 2 })` всей таблицы, требуем `length === 1` и точное совпадение email перед `bcrypt.compare` (ADR-021).
- Password verification: `bcryptjs` compare (cost 12).
- Session: JWT strategy (ADR-008) — быстрее, не требует таблицы sessions, Edge-compatible для middleware.
- **Split config (ADR-020):** middleware запускается на Edge runtime, который несовместим с Prisma/bcrypt. Два файла:
  - **`lib/auth.config.ts`** — Edge-safe (только session/pages/trustHost/callbacks), пустой `providers: []`. Импорт: middleware.
  - **`lib/auth.ts`** — Node-only, расширяет `authConfig`, добавляет Credentials + Prisma + bcrypt. Экспорт: `handlers`, `signIn`, `signOut`, `auth`. Импорт: server actions, route handlers, RSC.
- **Route groups в Next.js (`(app)`, `(auth)`) НЕ попадают в URL** — нельзя защитить
  через `path.startsWith('/(app)')`. Защита делается через **whitelist публичных путей**
  в `middleware.ts`:

  ```ts
  // middleware.ts
  import { auth } from '@/lib/auth';

  const PUBLIC = [
    /^\/login(\/.*)?$/,
    /^\/sign\/.+/,           // публичная страница подписи (GET HTML)
    /^\/api\/sign\/.+/,      // POST подписи; защищён собственным sign-token check
    /^\/api\/auth\/.+/,      // NextAuth handlers
    /^\/api\/cron\/.+/,      // защищены своим CRON_SECRET
    /^\/offline$/,           // PWA offline shell
    /^\/manifest\.webmanifest$/,
    /^\/icons?\/.+/,
    /^\/favicon\.ico$/,
  ];

  export default auth((req) => {
    const { pathname } = req.nextUrl;
    if (PUBLIC.some((re) => re.test(pathname))) {
      // already-authed user landing on /login → bounce to /dashboard
      if (req.auth && /^\/login(\/.*)?$/.test(pathname)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return;
    }
    if (!req.auth) {
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', pathname + search);
      return NextResponse.redirect(url);
    }
  });

  export const config = {
    // не трогаем статику Next.js и публичные файлы
    matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
  };
  ```

  > Note: фактическая реализация в `middleware.ts` импортирует `NextAuth` напрямую
  > с `authConfig`, **НЕ** `auth` из `lib/auth.ts` (см. ADR-020).

- `/sign/[token]` — публичный, защищён собственным механизмом токенов (sha256 hash + TTL + one-time).
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
- Парсинг входов от пользователя — `date-fns` + `date-fns-tz` (`fromZonedTime`,
  `toZonedTime`) с фиксированной TZ `Europe/Vilnius`.
- Отображение — через `<DateDisplay>` компонент, локаль `lt`.

---

## PWA strategy

### Manifest

`public/manifest.webmanifest` — статический файл (один источник истины).
В `app/layout.tsx` — `<link rel="manifest" href="/manifest.webmanifest" />`.
Поля: `name`, `short_name`, `start_url`, `scope`, `display: standalone`,
`background_color`, `theme_color`, `icons` (192, 512, maskable), `lang: "ru"`.

### Service Worker

- **Только в production** (`if (process.env.NODE_ENV === 'production') register()`).
- В dev — `unregister()` при загрузке (избегаем конфликта с HMR).
- Файлы `public/sw.js` и `public/workbox-*.js` **генерируются на build** —
  в `.gitignore`, не коммитятся.
- Стратегия:
  - HTML / pages: `NetworkFirst` (online — свежо, offline — последний кеш)
  - static assets (`/_next/static/`): `CacheFirst`
  - API / mutations: `NetworkOnly` (не кешируем POST)
- Offline shell: `app/offline/page.tsx` precache'ится. При полной потере сети
  `NetworkFirst` fallback'ит на `/offline`.

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

При **GET** `/sign/[token]` (просмотр страницы):
- хешируем токен, ищем по hash
- проверяем `signTokenExpiresAt > now`
- проверяем `status !== 'signed'`

При **POST** `/api/sign/[token]` (сама подпись) — **atomic consume** через `updateMany`:

```ts
// гарантирует one-time use даже при двойном submit
const result = await prisma.contract.updateMany({
  where: {
    signTokenHash: hash,
    signTokenExpiresAt: { gt: new Date() },
    status: 'sent',                              // подписываем только отправленные документы
  },
  data: {
    status: 'signed',
    signedAt: new Date(),
    signerName, signerIp, signerUserAgent,
    signatureUrl,
    signTokenHash: null,                          // обнуляем токен
    signTokenExpiresAt: null,
  },
});

if (result.count === 0) {
  // токен невалиден, истёк, уже использован, или статус не позволяет
  return Response.json({ ok: false, error: 'Invalid or expired token' }, { status: 410 });
}
```

`updateMany` с условиями в `where` — атомарная операция Postgres. Второй параллельный
POST не пройдёт условие (`status` уже `signed`), вернётся `count: 0`. PDF регенерируем
после успешного `updateMany` с count = 1.

**Безопасность загрузки подписи (PNG):** клиент НЕ должен иметь доступ к
`BLOB_READ_WRITE_TOKEN`. Подпись загружается через server action / route handler,
который сначала валидирует токен (то же условие, что в `updateMany`), затем
из server-side загружает PNG в Blob, затем выполняет `updateMany`.

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
