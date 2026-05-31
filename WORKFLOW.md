# WORKFLOW — Webvibe CRM

Пользовательские сценарии. Источник истины для проектирования UI и server actions.

---

## 1. Daily workflow

Утро (5 минут с телефона за кофе):
1. Открыть PWA на телефоне.
2. На dashboard смотрю:
   - Напоминания на сегодня.
   - Лиды с `nextContactAt <= today`.
   - Просроченные счета (сумма + количество).
   - Просроченные задачи.
3. Быстро отвечаю лидам в их каналах → возвращаюсь, меняю статус, ставлю следующий `nextContactAt`.

Днём:
4. По активным проектам — закрываю задачи или ставлю `waiting_client`.
5. Если пришла оплата — открываю счёт → `Mark as Paid` → Payment создаётся → dashboard обновляется.
6. Появился расход — `/expenses/new` за 10 секунд.

Вечер:
7. Quick-add напоминаний на завтра.
8. Беглый взгляд на dashboard — всё ли закрыто.

---

## 2. Lead → завершённый проект (полный цикл)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Появился лид (форма с сайта, мессенджер, рекомендация)    │
│    → /leads/new                                              │
│    → status: new                                             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Связался, обсудил задачу                                  │
│    → status: discussion                                      │
│    → заполнил budget, task, urgency                          │
│    → set nextContactAt                                       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Готовлю КП                                                │
│    → status: awaiting_proposal                               │
│    → создаю Proposal из лида (кнопка "Create proposal")      │
│    → Proposal.status: draft → sent                           │
│    → Lead.status: proposal_sent                              │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Клиент принял                                             │
│    → Proposal.status: accepted                               │
│    → одной кнопкой "Convert to Project":                     │
│       - создаётся/обновляется Client                         │
│       - создаётся Project с ценой/типом из КП                │
│       - Lead.convertedToProjectId = project.id               │
│       - Lead.status: accepted                                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Договор                                                   │
│    → /projects/[id] → "Create contract"                      │
│    → Contract.status: draft → preview → sent                 │
│    → генерирую sign link → отправляю клиенту в мессенджер    │
│    → клиент подписывает на телефоне на /sign/[token]         │
│    → Contract.status: signed, signedAt, signatureUrl         │
│    → финальный PDF с вшитой подписью                         │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. Счёт-аванс                                                │
│    → /projects/[id] → "Create advance invoice"               │
│    → InvoiceItem(s), сумма, dueAt                            │
│    → Invoice.status: draft → sent                            │
│    → скачать PDF / поделиться через Share Sheet              │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. Аванс оплачен                                             │
│    → /invoices/[id] → "Mark as paid"                         │
│    → создаётся Payment(kind=advance)                         │
│    → Project.status: in_progress                             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. Работа над проектом                                       │
│    → Project.stages: чеклист обновляю                        │
│    → Tasks внутри проекта (todo → in_progress → done)        │
│    → "Waiting client" когда жду от клиента                   │
│    → ссылки: Figma, GitHub, Vercel, Drive                    │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 9. Финальный счёт                                            │
│    → "Create final invoice" → status: sent                   │
│    → Mark as paid → Payment(kind=final)                      │
│    → Project.status: paid                                    │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 10. Сдача / архив                                            │
│     → Project.status: archived                               │
│     → (опционально) hasMaintenance = true → создаём          │
│       Maintenance(monthlyAmount, startedAt, nextInvoiceAt)   │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Создание Proposal (КП)

UX:
1. `/proposals/new` или из лида/проекта.
2. Форма:
   - Client (existing или quick-create)
   - Title
   - Total + currency
   - Valid until
   - Scope included (динамический список)
   - Scope excluded (динамический список)
   - Milestones (динамический список с deliverable + due)
   - Payment plan (например `[{ label: "Авансas 50%", amount: 500, dueLabel: "po sutarties" }]`)
   - Warranty (text)
   - Portfolio links
3. Save → status `draft`, инкрементная нумерация WVP-001.
4. Preview PDF.
5. "Mark as sent" → status `sent`.
6. Клиент ответил → `accepted` или `revisions` или `declined`.
7. На `accepted` — кнопка **"Создать проект"** → wizard заполняет Project.

---

## 4. Создание Contract (три типа — `Contract.kind`, ADR-027)

Три шаблона, референс-текст LT — `CONTRACTS-LT-SOURCE.md`:
- **STAGED** — поэтапный (как DSK): произвольный список платежей.
- **ADVANCE** — тот же договор, оплата = аванс 70% + остаток 30% (автозаполняется, переопределяемо).
- **MAINTENANCE** — поддержка (как Carenta): ежемесячный платёж, короткий бойлерплейт.

UX:
1. Из проекта → "Создать договор" → **выбор kind**.
2. Форма (поля подстраиваются под kind):
   - Client — read-only из проекта (или quick-pick), реквизиты тянутся в §1.
   - `amount` = `Project.price` по умолчанию.
   - **Subject (§2, что делаем) — редактируемое всегда**, дефолт из `Project.type`/`title`.
   - **Scope (§3, STAGED/ADVANCE)** — динамический список `[{ title, description? }]`, нумеруется 3.1.x; автокопируется из связанного Proposal при наличии.
   - **Payment (§4)**:
     - STAGED — список `[{ label, amount, dueLabel }]` (фикс-суммы, НЕ проценты; сумма == `amount`).
     - ADVANCE — авто `[{label:"Avansas 70%", amount}, {label:"Likutis 30%", amount}]`, редактируемо.
     - MAINTENANCE — `monthlyAmount` (= `amount`), `includes[]` (дефолт-буллеты §2).
   - Warranty (§9, дефолт «12 mėnesių»), effective date.
3. Save → status `draft`, нумерация **WVS000001** (без дефиса).
4. Preview PDF (литовский).
5. "Сгенерировать ссылку для подписи" → raw token ≥32 байта, в БД sha256-хеш, TTL 7 дней, status `sent`.
6. Я отправляю ссылку клиенту (мессенджер).
7. После подписи → `signed`. **Если kind=MAINTENANCE** — в той же транзакции создаётся `Maintenance` (monthlyAmount, startedAt=signedAt, nextInvoiceAt=+1мес, status active). Рекуррентный биллинг — Iter 5.

---

## 5. Создание Invoice

UX:
1. Из проекта → "Создать счёт" → выбор kind:
   - **Advance** (аванс) — предзаполнено `Project.advance` или 50% от price
   - **Final** (остаток) — `price - sum(payments)`
   - **Full** — `price`
2. Форма:
   - Client (read-only из проекта)
   - Project (read-only)
   - Items — таблица строк (title, qty, unitPrice, total auto)
   - Subtotal = sum(items.total)
   - Total = subtotal (НЕТ PVM)
   - Issued at (today по умолчанию)
   - Due at (today + 7 по умолчанию, настраивается в Settings)
   - Notes (опционально)
3. Save → status `draft`, нумерация WV-001.
4. Preview PDF.
5. "Mark as sent" → status `sent`.
6. Скачать PDF / Share PDF.
7. Клиент оплатил → "Mark as paid":
   - Создаётся `Payment(kind = advance | final | full, amount = invoice.total)`
   - `Invoice.status = paid`
   - Dashboard обновляется.

Просрочка: cron (или просто фильтр на dashboard) показывает `sent + dueAt < today` как `overdue`.

---

## 6. Workflow подписи на телефоне

### Со стороны меня (генерация ссылки):

1. `/contracts/[id]` → кнопка **"Получить ссылку для подписи"**.
2. Server action:
   - Генерирует raw token (32 байта random).
   - Сохраняет `signTokenHash = sha256(raw)`, `signTokenExpiresAt = now + 7 days`.
   - Возвращает URL `https://crm.webvibe.lt/sign/{raw}`.
3. UI показывает URL + кнопка copy + кнопка `navigator.share({ url })`.
4. Я отправляю клиенту в мессенджер.

### Со стороны клиента (открытие на телефоне):

1. Открывает URL — **БЕЗ авторизации**.
2. Сервер:
   - Хеширует token, ищет `Contract` по `signTokenHash`.
   - Проверяет `signTokenExpiresAt > now`.
   - Проверяет `status !== 'signed'`.
   - 404 если что-то не так.
3. Страница `/sign/[token]`:
   - Шапка: «Sutarties pasirašymas» (Подпись договора).
   - Имя моего бренда, мой логотип.
   - Краткие данные: номер договора, дата, сумма, стороны.
   - Кнопка «Peržiūrėti dokumentą» (Просмотр PDF) → новая вкладка.
   - Поле «Vardas, pavardė» (имя подписанта).
   - Чекбокс «Susipažinau su sutarties sąlygomis ir sutinku».
   - **SignaturePad** (canvas, full width на мобиле).
   - Кнопки: «Išvalyti» (очистить) и «Pasirašyti» (подписать).
4. По «Подписать»:
   - Canvas → PNG.
   - Server action `signContract` принимает PNG (base64 или multipart):
     - предварительная проверка токена (status=sent, не истёк, hash совпадает) — отказ 410 если что-то не так.
     - загружает PNG в Vercel Blob, получает `signatureUrl`.
     - **atomic consume** через `prisma.contract.updateMany({ where: { signTokenHash, signTokenExpiresAt: { gt: now }, status: 'sent' }, data: { status: 'signed', signedAt, signerName, signerIp, signerUserAgent, signatureUrl, signTokenHash: null, signTokenExpiresAt: null } })`.
     - если `count === 0` — токен уже использован параллельно: **удаляем orphan PNG из Blob** и возвращаем 410.
     - если `count === 1` — регенерируем PDF с вшитой подписью, сохраняем `pdfUrl`.
5. Клиент видит «Pasirašyta sėkmingai» + кнопка скачать подписанный PDF.

> **`BLOB_READ_WRITE_TOKEN` остаётся на сервере.** Клиент шлёт PNG в server action,
> server action кладёт в Blob.

### Со стороны меня (подписать свой документ):

То же самое, но я подписываю прямо в `/contracts/[id]` без token (auth есть).
Используется тот же `SignaturePad`. Подпись сохраняется в `Settings.signatureUrl` (с возможностью переподписать) и автоматически вшивается во все PDF.

---

## 7. Maintenance / Support workflow

### Установка:

1. Project завершён → отметить `hasMaintenance = true`.
2. `/maintenance/new` или автомат → wizard:
   - Client (из проекта)
   - Project (read-only)
   - Monthly amount
   - Includes (что входит — text)
   - Started at
   - Next invoice at (например через 1 месяц)
3. Save → `status: active`.

### Дневной cron `/api/cron/maintenance-invoices` (Vercel cron, 09:00):

Идемпотентность строится на `@@unique([maintenanceId, periodKey])` в `Invoice`.
**Важно:** в Postgres failed insert переводит транзакцию в aborted state, поэтому
ловить `P2002` внутри той же транзакции нельзя — следующие запросы не выполнятся.
Используем pre-check вне транзакции + транзакция только для атомарной пары
(create invoice + create reminder + advance nextInvoiceAt). При гонке между cron-запусками
вторая попытка получит `P2002` снаружи и просто перейдёт к следующему `Maintenance`.

```ts
for each Maintenance where status='active' AND nextInvoiceAt <= today:
  const periodKey = format(maintenance.nextInvoiceAt, 'yyyy-MM');

  // 1) Pre-check ВНЕ транзакции: invoice для этого периода уже есть?
  const existing = await prisma.invoice.findUnique({
    where: { maintenanceId_periodKey: { maintenanceId: maintenance.id, periodKey } },
    select: { id: true },
  });

  if (existing) {
    // дубля не создаём; просто сдвигаем nextInvoiceAt вперёд
    await prisma.maintenance.update({
      where: { id: maintenance.id },
      data: { nextInvoiceAt: addMonths(maintenance.nextInvoiceAt, 1) },
    });
    continue;
  }

  // 2) Атомарно: invoice + reminder + advance nextInvoiceAt
  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          number: await issueInvoiceNumber(tx),
          kind: 'maintenance',
          clientId, projectId,
          maintenanceId: maintenance.id,
          periodKey,
          status: 'draft',
          subtotal: monthlyAmount,
          total: monthlyAmount,
          items: { create: [{ title: `Saito priežiūra ${periodKey}`, qty: 1, unitPrice: monthlyAmount, total: monthlyAmount }] },
          ...
        },
      });
      await tx.reminder.create({
        data: { title: `Выставить maintenance ${invoice.number}`, dueAt: today, kind: 'maintenance', ... },
      });
      await tx.maintenance.update({
        where: { id: maintenance.id },
        data: { nextInvoiceAt: addMonths(maintenance.nextInvoiceAt, 1) },
      });
    });
  } catch (e) {
    // P2002 = другой запуск cron'а опередил нас. Игнорируем — следующий проход подхватит.
    if (e.code === 'P2002') continue;
    throw e;
  }
```

Я вижу:
- На dashboard блок «Maintenance к выставлению».
- Захожу в счёт → проверяю → "Mark as sent" → отправляю клиенту.

---

## 8. PWA / Mobile workflows

### Установка PWA

1. Открыть `crm.webvibe.lt` в Safari/Chrome.
2. Браузер предлагает «Add to Home Screen».
3. Иконка на домашнем экране → запуск в standalone режиме.

### Mobile quick-add

FAB справа над bottom nav. Тап открывает sheet с выбором:
- Новый клиент
- Новый лид
- Новая задача
- Новое напоминание
- Новый расход

Каждая форма — full-screen на mobile, с большими полями.

### Mobile PDF flow

1. Создал счёт.
2. Кнопка «Скачать PDF» → файл сохраняется.
3. Кнопка «Поделиться» → `navigator.share({ files: [pdfFile] })` → выбор мессенджера → отправил клиенту.

### Offline

- Read-only режим: последний кеш dashboard виден.
- Mutations: показываем баннер «Нет соединения. Действие будет потеряно».
- Background sync — Phase 2.

---

## 9. Convert flows (важные)

### Lead → Client + Project

1. На лиде кнопка «Convert».
2. Wizard:
   - Step 1: Client — выбрать существующего или создать (предзаполнено из лида).
   - Step 2: Project — title, type, price, deadline (предзаполнено из лида).
   - Step 3 (опционально): создать Proposal/Contract сразу.
3. Save → Lead.status = `accepted`, Lead.convertedToProjectId = project.id.

### Proposal → Project

1. На КП status = `accepted` → кнопка «Создать проект».
2. Wizard:
   - Client (из proposal)
   - Title, price, type (из proposal)
   - Опционально: создать договор и счёт-аванс
3. Save → Proposal связана с Project через `projectId`.

### Invoice → Payment

1. На счёте кнопка «Mark as paid».
2. Sheet с предзаполненными полями:
   - amount = invoice.total (в MVP **заблокировано** = invoice.total, частичные оплаты не поддерживаются)
   - paidAt = today
   - kind = invoice.kind
3. Save → атомарно: создать `Payment` и перевести `Invoice.status` из `sent|overdue` в `paid`.

**Race-safety:** используем `updateMany` с условием статуса, чтобы двойной клик
не создал двух платежей:

```ts
await prisma.$transaction(async (tx) => {
  const updated = await tx.invoice.updateMany({
    where: { id: invoice.id, status: 'sent' },        // overdue — это sent + dueAt<today, отдельного статуса нет
    data: { status: 'paid' },
  });
  if (updated.count === 0) {
    throw new Error('Invoice already paid or not sendable');
  }
  await tx.payment.create({
    data: { invoiceId: invoice.id, clientId, projectId, kind, amount: invoice.total, paidAt },
  });
});
```

**Partial payments — Phase 2.** Когда добавим: вводим статус `partially_paid`,
поле `amountPaid` на Invoice, и `Invoice.status = paid` только когда `amountPaid >= total`.

---

## 10. Dashboard data flow

Dashboard загружается на странице `/dashboard`.

Серверные компоненты делают параллельные запросы (`Promise.all` или просто
несколько `await` рядом):

- `revenueThisMonth()` — sum(payments.paidAt in current month)
- `expensesThisMonth()` — sum(expenses.occurredAt in current month)
- `expectedIncome()` — sum(invoices.total where status='sent')
- `overdueInvoices()` — invoices where status='sent' AND dueAt < today (overdue — derived, не статус)
- `activeProjects()` — projects where status in [in_progress, review, revisions]
- `upcomingDeadlines()` — projects where deadlineAt within 7 days
- `overdueTasks()` — tasks where dueAt < today AND status != done
- `waitingClient()` — tasks where status = waiting_client
- `leadsNeedingResponse()` — leads where nextContactAt <= today AND status not in [accepted, declined]
- `todayReminders()` — reminders where dueAt = today AND status = open
- `maintenanceDue()` — maintenance where nextInvoiceAt <= today + 3 days

Каждый блок — отдельный server component с `<Suspense fallback={<Skeleton />}>`.
