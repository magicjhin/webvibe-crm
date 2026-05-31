# DATABASE — Webvibe CRM

PostgreSQL @ Neon (region: AWS eu-central-1, Frankfurt), ORM — Prisma 7
с driver adapter `@prisma/adapter-pg` (см. ADR-019).

- **Runtime** (`lib/db.ts`): pooled `DATABASE_URL`
- **CLI migrate** (`prisma.config.ts`): direct `DIRECT_URL`
- **Generated client:** `lib/generated/prisma/` (gitignored), импорт `@/lib/generated/prisma/client`

Без activity log, без user roles (ADR-002).

## Implementation status

| Model | Iter | Migration | Note |
|---|---|---|---|
| `User` | 1 ✅ | `20260528134455_init_user_settings` | Single admin, runtime invariant в auth (ADR-021) |
| `Settings` | 1 ✅ | `20260528134455_init_user_settings` | Singleton id=1, seed создаёт |
| `Client`, `Lead`, `Project`, `Task` | 2 ✅ | `20260528144353_add_clients_projects_tasks` | Back-relations на Invoice/Contract/Proposal/Payment/Maintenance/Reminder появятся вместе с этими моделями в Iter 3+ |
| `Invoice`, `InvoiceItem`, `Payment`, `Expense` | 3 ✅ | `20260528164725_iter3_invoices_payments_expenses` | + Settings (`personalCode`, `bankNote`, `defaultPaymentDays`) и Client (`representative`, `technicalContactName`) расширения; Invoice/Payment back-relations добавлены на Client и Project |
| `Contract`, `Proposal`, `Maintenance` | 4 ✅ | `20260531000000_iter4_contracts_proposals_maintenance` | + `ContractKind`/`ContractStatus`/`ProposalStatus`/`MaintenanceStatus` enums; back-relations `contracts`/`proposals`/`maintenance` на Client и Project; на Invoice добавлены `maintenanceId` + `@@unique([maintenanceId, periodKey])` + index. `Maintenance` promoted из Iter 5 (ADR-027) |
| `Reminder`, `FileAsset` | 5 | — | |

---

## Соглашения

- `id` — `String @id @default(cuid())`
- timestamps — `createdAt`, `updatedAt` везде
- деньги — `Decimal @db.Decimal(12, 2)`
- даты — `DateTime` (UTC)
- enums — Prisma enums (читаемее, проще менять, чем строки)
- soft delete — **не используем** в MVP (только hard delete)
- индексы — на FK + поля, по которым фильтруем (`status`, `dueAt`)

---

## Модели

### `User` — единственный пользователь

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

> Только одна строка. Создаётся через `prisma/seed.ts` из `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`.

---

### `Settings` — настройки бренда и нумерация

```prisma
model Settings {
  id              Int      @id @default(1)
  // Бренд
  companyName     String
  ownerName       String
  personalCode    String?       // Asmens kodas (для §1 ŠALYS договора в Iter 4)
  vatId           String?       // PVM mokėtojo kodas (опционально, я без PVM)
  regNumber       String?       // Individualios veiklos pažymos Nr.
  address         String
  iban            String
  swift           String?
  bankNote        String?       // Свободный текст про банк (например про Wise / Belgija)
  email           String
  phone           String?
  website         String?
  logoUrl         String?
  signatureUrl    String?       // моя подпись для документов

  // Нумерация
  invoicePrefix     String   @default("WV")
  invoiceCounter    Int      @default(0)
  invoicePadding    Int      @default(3)        // WV-001 → 3
  contractPrefix    String   @default("WVS")
  contractCounter   Int      @default(0)
  contractPadding   Int      @default(6)        // WVS000001 → 6
  proposalPrefix    String   @default("WVP")
  proposalCounter   Int      @default(0)
  proposalPadding   Int      @default(3)

  // Валюта и язык
  defaultCurrency   String   @default("EUR")
  documentLanguage  String   @default("lt")     // язык PDF

  // PDF
  pdfFooterNote      String?
  defaultPaymentDays Int      @default(1)       // Apmokėti iki = issuedAt + N дней (ADR-025)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

> `id = 1` фиксировано — это singleton. Создаётся в seed.
> Iter 3 расширения (`personalCode`, `bankNote`, `defaultPaymentDays`) опциональны — миграция добавила колонки nullable / с default'ом и не требует backfill.

---

### `Client`

```prisma
model Client {
  id        String      @id @default(cuid())
  kind      ClientKind  @default(individual)
  name      String                            // имя физлица или название компании
  email     String?
  phone     String?
  website   String?

  // Реквизиты (для PDF)
  vatId               String?
  regNumber           String?
  address             String?
  representative      String?   // Atstovas — для §1 ŠALYS договора (Iter 4)
  technicalContactName String?  // тех. контакт по проекту (опц.)

  language  String     @default("lt")        // язык для документов клиента
  status    ClientStatus @default(active)
  source    String?
  notes     String?

  leads     Lead[]
  projects  Project[]
  invoices  Invoice[]
  contracts Contract[]
  proposals Proposal[]
  payments  Payment[]
  reminders Reminder[]
  maintenance Maintenance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
  @@index([kind])
}

enum ClientKind {
  individual
  company
}

enum ClientStatus {
  active
  archived
}
```

---

### `Lead`

```prisma
model Lead {
  id          String     @id @default(cuid())
  name        String                              // имя или название
  company     String?
  contact     String                              // email/phone/messenger
  task        String                              // что хочет
  budget      Decimal?   @db.Decimal(12, 2)
  urgency     LeadUrgency @default(normal)
  source      String?
  status      LeadStatus @default(new)
  nextContactAt DateTime?
  notes       String?

  // Если уже знаем клиента (повторный лид)
  clientId    String?
  client      Client?    @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Куда лид сконвертирован
  convertedToProjectId String?
  convertedToProject   Project?  @relation("LeadConvertedProject", fields: [convertedToProjectId], references: [id], onDelete: SetNull)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
  @@index([nextContactAt])
  @@index([clientId])
  @@index([convertedToProjectId])
}

enum LeadUrgency {
  low
  normal
  high
}

enum LeadStatus {
  new                  // Новый
  to_contact           // Связаться
  discussion           // Обсуждение
  awaiting_proposal    // Ждёт предложения
  proposal_sent        // КП отправлено
  thinking             // Думает
  accepted             // Принял
  declined             // Отказался
  postponed            // Отложено
}
```

> **Deals как отдельная сущность не делаем.** Воронка — это `LeadStatus`.

---

### `Project`

```prisma
model Project {
  id           String        @id @default(cuid())
  title        String
  clientId     String
  client       Client        @relation(fields: [clientId], references: [id], onDelete: Restrict)
  type         ProjectType
  stack        String?
  status       ProjectStatus @default(idea)

  // Деньги
  price        Decimal       @db.Decimal(12, 2) @default(0)
  advance      Decimal       @db.Decimal(12, 2) @default(0)  // сколько заявлено как аванс
  currency     String        @default("EUR")

  // Сроки
  startedAt    DateTime?
  deadlineAt   DateTime?
  completedAt  DateTime?

  // Ссылки (хранятся как JSON для гибкости)
  links        Json?         // { github, vercel, figma, drive, site, wpAdmin, prodAdmin, ... }

  // Этапы как чеклист (массив объектов в JSON, не отдельная таблица)
  stages       Json?         // [{ name, done, order, dueAt? }]

  hasMaintenance Boolean    @default(false)
  notes        String?

  tasks        Task[]
  invoices     Invoice[]
  contracts    Contract[]
  proposals    Proposal[]
  payments     Payment[]
  reminders    Reminder[]
  maintenance  Maintenance[]
  leadsConverted Lead[]     @relation("LeadConvertedProject")

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([status])
  @@index([clientId])
  @@index([deadlineAt])
}

enum ProjectType {
  landing
  website
  corporate
  wordpress
  headless_wp
  nextjs
  crm_dashboard
  booking
  quiz_funnel
  maintenance
  other
}

enum ProjectStatus {
  idea
  estimating
  awaiting_advance
  in_progress
  waiting_client
  review
  revisions
  ready
  paid
  archived
}
```

> Stages в JSON — осознанное решение. Этапы редко меняются после установки шаблона,
> сортировать/фильтровать по ним не нужно. Если позже понадобится — выделяем в таблицу.

---

### `Task`

```prisma
model Task {
  id          String        @id @default(cuid())
  title       String
  projectId   String
  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  status      TaskStatus    @default(todo)
  priority    TaskPriority  @default(normal)
  dueAt       DateTime?
  description String?
  checklist   Json?         // [{ text, done }]
  order       Int           @default(0)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([projectId])
  @@index([status])
  @@index([dueAt])
}

enum TaskStatus {
  todo
  in_progress
  waiting_client
  review
  done
}

enum TaskPriority {
  low
  normal
  high
  urgent
}
```

---

### `Invoice` + `InvoiceItem`

```prisma
model Invoice {
  id         String        @id @default(cuid())
  number     String        @unique                    // WV-001
  kind       InvoiceKind   @default(advance)
  clientId   String
  client     Client        @relation(fields: [clientId], references: [id], onDelete: Restrict)
  projectId  String?
  project    Project?      @relation(fields: [projectId], references: [id], onDelete: Restrict)
  maintenance   Maintenance? @relation(fields: [maintenanceId], references: [id], onDelete: SetNull)

  issuedAt   DateTime
  dueAt      DateTime?
  status     InvoiceStatus @default(draft)

  currency   String        @default("EUR")
  subtotal   Decimal       @db.Decimal(12, 2)
  total      Decimal       @db.Decimal(12, 2)        // = subtotal (нет PVM)

  // Idempotency для maintenance cron: 'YYYY-MM' для kind=maintenance, null для остальных.
  // maintenanceId + @@unique([maintenanceId, periodKey]) добавлены в Iter 4 (ADR-027),
  // когда появилась модель Maintenance. Сам cron-биллинг — Iter 5.
  maintenanceId String?
  periodKey     String?

  notes      String?
  pdfUrl     String?                                  // кеш PDF в Blob

  items      InvoiceItem[]
  payments   Payment[]

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([clientId])
  @@index([projectId])
  @@index([status])
  @@index([dueAt])
}

model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  title       String
  description String?
  qty         Decimal  @db.Decimal(12, 2) @default(1)
  unitPrice   Decimal  @db.Decimal(12, 2)
  total       Decimal  @db.Decimal(12, 2)            // = qty * unitPrice
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([invoiceId])
}

enum InvoiceKind {
  advance       // аванс
  final         // остаток
  full          // полный платёж
  maintenance   // поддержка
}

enum InvoiceStatus {
  draft
  sent
  paid
  cancelled
}

// NB: `overdue` — это НЕ статус, а derived состояние:
//     status='sent' AND dueAt < now()
// Никогда не переводим Invoice в `overdue` персистентно (его нет в enum).
// Dashboard и фильтры считают overdue на лету.
```

> Никакого `vatRate`, `vatAmount`, `tax` — я не плательщик PVM.
> Шаблон PDF может вывести строку `"Suma be PVM"` под итогом.

---

### `Contract`

```prisma
model Contract {
  id          String         @id @default(cuid())
  number      String         @unique                  // WVS000001 (без дефиса!)
  kind        ContractKind   @default(STAGED)         // STAGED | ADVANCE | MAINTENANCE (ADR-027)
  clientId    String
  client      Client         @relation(fields: [clientId], references: [id], onDelete: Restrict)
  projectId   String?
  project     Project?       @relation(fields: [projectId], references: [id], onDelete: Restrict)

  issuedAt    DateTime
  status      ContractStatus @default(draft)

  // Структурированные данные шаблона. Форма зависит от kind — формализована
  // в Zod (lib/validators/contract.ts, discriminated union):
  //   STAGED|ADVANCE: { subject, scope[], paymentTerms[], warranty?, termsNote?, excluded? }
  //   MAINTENANCE:    { subject, monthlyAmount, includes?[], warranty?, termsNote?, excluded? }
  // Суммы внутри terms — decimal-строки; канонический total — amount (Decimal).
  terms       Json
  amount      Decimal        @db.Decimal(12, 2)
  currency    String         @default("EUR")

  // Подпись (sha256 raw token, TTL 7 дней, one-time consume)
  signTokenHash      String?  @unique                 // sha256(raw token)
  signTokenExpiresAt DateTime?
  signedAt           DateTime?
  signerName         String?
  signerIp           String?
  signerUserAgent    String?
  signatureUrl       String?                          // PNG в Vercel Blob

  pdfUrl      String?

  // MAINTENANCE-договор порождает запись Maintenance при подписании.
  maintenance Maintenance?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([clientId])
  @@index([projectId])
  @@index([status])
}

enum ContractKind {
  STAGED        // поэтапная оплата (произвольный список платежей)
  ADVANCE       // аванс 70% + остаток 30%
  MAINTENANCE   // ежемесячная поддержка
}

enum ContractStatus {
  draft
  sent
  signed
  cancelled
}
```

---

### `Proposal` (КП)

```prisma
model Proposal {
  id            String         @id @default(cuid())
  number        String         @unique                // WVP-001
  clientId      String
  client        Client         @relation(fields: [clientId], references: [id], onDelete: Restrict)
  projectId     String?                                // если КП по существующему проекту
  project       Project?       @relation(fields: [projectId], references: [id], onDelete: Restrict)

  title         String
  status        ProposalStatus @default(draft)

  total         Decimal        @db.Decimal(12, 2)
  currency      String         @default("EUR")
  validUntil    DateTime?

  // Структура КП (JSON, чтобы быстро менять)
  scopeIncluded Json                                   // [{ title, description }]
  scopeExcluded Json?                                  // [{ title, description }]
  milestones    Json?                                  // [{ name, deliverable, dueAt? }]
  paymentPlan   Json?                                  // [{ label, amount, dueLabel }]
  warranty      String?
  portfolioLinks Json?

  pdfUrl        String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([clientId])
  @@index([projectId])
  @@index([status])
}

enum ProposalStatus {
  draft
  sent
  accepted
  declined
  revisions
}
```

---

### `Payment`

```prisma
model Payment {
  id         String      @id @default(cuid())
  clientId   String
  client     Client      @relation(fields: [clientId], references: [id], onDelete: Restrict)
  projectId  String?
  project    Project?    @relation(fields: [projectId], references: [id], onDelete: SetNull)
  invoiceId  String?
  invoice    Invoice?    @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  kind       PaymentKind
  amount     Decimal     @db.Decimal(12, 2)
  currency   String      @default("EUR")
  paidAt     DateTime
  note       String?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  @@index([clientId])
  @@index([projectId])
  @@index([invoiceId])
  @@index([paidAt])
}

enum PaymentKind {
  advance
  final
  full
  maintenance
  other
}
```

---

### `Expense`

```prisma
model Expense {
  id          String         @id @default(cuid())
  category    ExpenseCategory
  vendor      String?                          // Anthropic, OpenAI, Vercel, ...
  amount      Decimal        @db.Decimal(12, 2)
  currency    String         @default("EUR")
  occurredAt  DateTime
  description String
  fileUrl     String?                          // Vercel Blob public URL
  fileName    String?                          // оригинальное имя при загрузке
  // recurring/recurrence — storage-only поля (ADR-017).
  // В MVP — индикатор повторяемости для ручного анализа.
  // Автоматизация повторов (cron + auto-create) — Phase 2.
  recurring   Boolean        @default(false)
  recurrence  String?        // 'monthly' | 'yearly' | null
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([occurredAt])
  @@index([category])
}

enum ExpenseCategory {
  ai_tools
  hosting
  domains
  software
  hardware
  ads
  transport
  other
}
```

---

### `Maintenance`

```prisma
// Promoted из Iter 5 в Iter 4 (ADR-027): MAINTENANCE-договор при подписании
// создаёт запись Maintenance. Рекуррентный биллинг/cron — по-прежнему Iter 5.
model Maintenance {
  id              String             @id @default(cuid())
  clientId        String
  client          Client             @relation(fields: [clientId], references: [id], onDelete: Restrict)
  projectId       String?                                // опционален — поддержка может быть без проекта
  project         Project?           @relation(fields: [projectId], references: [id], onDelete: SetNull)
  contractId      String?            @unique              // один Maintenance на подписанный MAINTENANCE-договор
  contract        Contract?          @relation(fields: [contractId], references: [id], onDelete: SetNull)
  monthlyAmount   Decimal            @db.Decimal(12, 2)
  currency        String             @default("EUR")
  includes        String?
  startedAt       DateTime
  nextInvoiceAt   DateTime
  status          MaintenanceStatus  @default(active)
  notes           String?

  invoices        Invoice[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([status])
  @@index([nextInvoiceAt])
  @@index([clientId])
  @@index([projectId])
}

enum MaintenanceStatus {
  active
  paused
  cancelled
  overdue_payment
}
```

---

### `Reminder`

```prisma
model Reminder {
  id         String         @id @default(cuid())
  title      String
  dueAt      DateTime
  kind       ReminderKind   @default(other)
  status     ReminderStatus @default(open)
  clientId   String?
  client     Client?        @relation(fields: [clientId], references: [id], onDelete: SetNull)
  projectId  String?
  project    Project?       @relation(fields: [projectId], references: [id], onDelete: SetNull)
  notes      String?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@index([dueAt])
  @@index([status])
  @@index([clientId])
  @@index([projectId])
}

enum ReminderKind {
  call
  deadline
  send_proposal
  await_payment
  handover
  follow_up
  maintenance
  other
}

enum ReminderStatus {
  open
  done
  snoozed
}
```

---

### `FileAsset` — произвольные файлы и ссылки

```prisma
model FileAsset {
  id         String   @id @default(cuid())
  ownerType  String                       // 'client' | 'project' | 'other'
  ownerId    String?
  kind       String                       // 'file' | 'link'
  name       String
  url        String                       // Blob URL или внешняя ссылка
  sizeBytes  Int?
  mimeType   String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([ownerType, ownerId])
}
```

---

## Documents (виртуальная сущность)

`Document` — это **не таблица**, а агрегированное представление в коде:

```ts
type DocumentRow = {
  kind: 'invoice' | 'contract' | 'proposal';
  id: string;
  number: string;
  clientName: string;
  projectTitle?: string;
  status: string;
  total?: Decimal;
  issuedAt: Date;
};
```

Страница `/documents` делает три параллельных запроса (Invoice / Contract / Proposal),
склеивает, сортирует, фильтрует на сервере. Отдельная таблица не нужна.

---

## Целостность данных

- **Удаление Client** — `Restrict`, если есть связанные projects/invoices/contracts/proposals/payments/maintenance. Лиды это **не блокируют** (Lead.clientId — `SetNull`), потому что лиды эфемерные и могут быть удалены вместе со старыми контактами. Перед удалением клиента — сначала архивировать документы или дождаться, пока все обязательства закроются.
- **Удаление Project** — `Restrict` для invoices/contracts/proposals (документы важны для аудита; сначала удалить документы или оставить Project в архиве); `Cascade` для tasks; `SetNull` для maintenance (ADR-027: `Maintenance.projectId` опционален, поддержка может жить без проекта).
- **Удаление Invoice** — payments остаются с `SetNull` на `invoiceId`. Удалять только черновики (status=draft).
- **Удаление Lead** — `convertedToProjectId` уже `SetNull`. Лиды можно удалять свободно.
- **Уникальность номеров** — на уровне БД (`@unique` на `Invoice.number`, `Contract.number`, `Proposal.number`).
- **Maintenance idempotency** — `@@unique([maintenanceId, periodKey])` на `Invoice` гарантирует, что cron не создаст дубль счёта на тот же период даже при retry.

---

## Миграции

- В dev: `pnpm prisma migrate dev --name <kebab-case>`.
- В prod (Vercel): миграции применяются вручную из локали:
  ```
  DATABASE_URL=<prod-direct-url> pnpm prisma migrate deploy
  ```
- Не делать `prisma db push` в проде.

---

## Seed

`prisma/seed.ts`:
- создаёт одного `User` из ENV
- создаёт `Settings` (singleton с `id = 1`) с дефолтами
- стартовые counters берутся из существующих документов (можно ввести вручную в Settings UI)
