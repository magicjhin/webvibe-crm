# DATABASE — Webvibe CRM

PostgreSQL @ Neon, ORM — Prisma. Без activity log, без user roles.

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
  vatId           String?
  regNumber       String?
  address         String
  iban            String
  swift           String?
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
  pdfFooterNote     String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

> `id = 1` фиксировано — это singleton. Создаётся в seed.

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
  vatId     String?
  regNumber String?
  address   String?

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
  project    Project?      @relation(fields: [projectId], references: [id], onDelete: SetNull)
  maintenanceId String?
  maintenance Maintenance? @relation(fields: [maintenanceId], references: [id], onDelete: SetNull)

  issuedAt   DateTime
  dueAt      DateTime?
  status     InvoiceStatus @default(draft)

  currency   String        @default("EUR")
  subtotal   Decimal       @db.Decimal(12, 2)
  total      Decimal       @db.Decimal(12, 2)        // = subtotal (нет PVM)

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
  overdue
  cancelled
}
```

> Никакого `vatRate`, `vatAmount`, `tax` — я не плательщик PVM.
> Шаблон PDF может вывести строку `"Suma be PVM"` под итогом.

---

### `Contract`

```prisma
model Contract {
  id          String         @id @default(cuid())
  number      String         @unique                  // WVS000001
  clientId    String
  client      Client         @relation(fields: [clientId], references: [id], onDelete: Restrict)
  projectId   String?
  project     Project?       @relation(fields: [projectId], references: [id], onDelete: SetNull)

  issuedAt    DateTime
  status      ContractStatus @default(draft)

  // Структурированные поля договора (Json для гибкости шаблона)
  terms       Json                                    // { subject, scope, milestones, paymentTerms, warranty, ... }
  amount      Decimal        @db.Decimal(12, 2)
  currency    String         @default("EUR")

  // Подпись
  signTokenHash      String?  @unique                 // sha256(raw token)
  signTokenExpiresAt DateTime?
  signedAt           DateTime?
  signerName         String?
  signerIp           String?
  signerUserAgent    String?
  signatureUrl       String?                          // PNG в Blob

  pdfUrl      String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([clientId])
  @@index([projectId])
  @@index([status])
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
  project       Project?       @relation(fields: [projectId], references: [id], onDelete: SetNull)

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
  amount      Decimal        @db.Decimal(12, 2)
  currency    String         @default("EUR")
  occurredAt  DateTime
  description String
  fileUrl     String?
  recurring   Boolean        @default(false)
  recurrence  String?        // 'monthly' | 'yearly' | null
  createdAt   DateTime       @default(now())

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
model Maintenance {
  id              String             @id @default(cuid())
  clientId        String
  client          Client             @relation(fields: [clientId], references: [id], onDelete: Restrict)
  projectId       String
  project         Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
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

- **Удаление Client** — `Restrict`, если есть связанные документы. Сначала архивировать.
- **Удаление Project** — `Restrict` для invoices/contracts/proposals, `Cascade` для tasks.
- **Удаление Invoice** — payments остаются, ссылка → `SetNull`. Удалять только черновики.
- **Уникальность номеров** — на уровне БД (`@unique`).

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
