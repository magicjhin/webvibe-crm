# DECISIONS — Webvibe CRM

ADR-лайт. Запись «почему так, а не иначе». При смене решения — старая запись помечается `Superseded by ...`.

Формат:
- **Status:** Accepted / Superseded / Rejected
- **Context:** что было непонятно
- **Decision:** что выбрали
- **Consequences:** что это значит
- **Alternatives:** что отвергли и почему

---

## ADR-001: Stack — Next.js + Postgres + Prisma + Vercel

- **Status:** Accepted (2026-05-27)
- **Context:** Нужно выбрать стек для personal CRM с PDF, формами, PWA и мобильным UX.
- **Decision:** Next.js 15 App Router + TypeScript strict + Tailwind + shadcn/ui + Prisma + Neon Postgres + Vercel Blob + Vercel deploy.
- **Consequences:** Server Actions упрощают мутации; Vercel Free tier хватает для personal use; ограничения serverless (timeout, payload size) накладывают ограничения на PDF.
- **Alternatives:**
  - SvelteKit — отвергли: меньше опыта, меньше готовых решений.
  - Remix — отвергли: Vercel-experience хуже, чем у Next.
  - Supabase вместо Neon + own auth — отвергли: Auth.js достаточно для single-user, Neon + Prisma чище и дешевле.

---

## ADR-002: Single user, без ролей, без activity log

- **Status:** Accepted (2026-05-27)
- **Context:** Соблазн «на будущее» добавить роли/команду.
- **Decision:** Никогда не добавляем multi-user, roles, permissions, activity log в этом проекте.
- **Consequences:** Простая модель User, простая авторизация (Credentials), нет audit-таблиц, проще схема.
- **Alternatives:**
  - Подготовить схему под roles на будущее — отвергли: YAGNI, удорожает каждую миграцию.

---

## ADR-003: Lead status как воронка, без отдельной таблицы Deals

- **Status:** Accepted (2026-05-27)
- **Context:** Стандартные CRM имеют отдельную сущность Deals/Opportunities.
- **Decision:** На MVP — никакой отдельной Deal таблицы. Воронка = `LeadStatus` enum.
- **Consequences:** Меньше моделей; нельзя иметь несколько одновременных «сделок» на одного лида (не нужно).
- **Alternatives:**
  - Lead + Deal раздельно — отвергли: над-инжиниринг для personal CRM.

---

## ADR-004: Project stages в JSON, не в отдельной таблице

- **Status:** Accepted (2026-05-27)
- **Context:** Этапы проекта: бриф / дизайн / верстка / функционал / тест / передача.
- **Decision:** Stages — массив объектов в `Project.stages` (JSON: `[{ name, done, order, dueAt? }]`).
- **Consequences:** Быстро менять/добавлять; нельзя фильтровать проекты по этапу через SQL; нельзя строить аналитику по этапам.
- **Alternatives:**
  - Отдельная таблица `ProjectStage` — отвергли: мне не нужна аналитика по этапам, текущей задачи не блокирует.

При необходимости — миграция в таблицу.

---

## ADR-005: Documents — виртуальная сущность, не таблица

- **Status:** Accepted (2026-05-27)
- **Context:** Нужна страница «все документы клиента/проекта».
- **Decision:** `Document` — это представление в коде (UNION ALL по Invoice, Contract, Proposal). Отдельной таблицы нет.
- **Consequences:** Каждый документ имеет свои поля; страница `/documents` делает 3 запроса и склеивает.
- **Alternatives:**
  - Общая таблица `Document` с типом — отвергли: жертвуем типизацией ради единства, при этом фактически нужны разные поля.

---

## ADR-006: Templates — TSX в коде, не таблица в БД

- **Status:** Accepted (2026-05-27)
- **Context:** PDF шаблоны, email шаблоны, типовые задачи.
- **Decision:** В MVP — все шаблоны в коде (TSX/TS файлы). Никаких editable templates в БД.
- **Consequences:** Изменение шаблона требует commit + deploy; но шаблоны меняются раз в полгода.
- **Alternatives:**
  - Поле в БД с JSON-структурой шаблона — отвергли: переусложнение для personal CRM.

При необходимости — выделяем в Phase 2.

---

## ADR-007: VAT/PVM не считаем

- **Status:** Accepted (2026-05-27)
- **Context:** Я работаю по индивидуальной деятельности в Литве и не плательщик PVM.
- **Decision:** В схеме нет полей `vatRate`, `vatAmount`. `total = subtotal`. В PDF под суммой пишем `"Suma be PVM"` или эквивалент.
- **Consequences:** Если когда-то стану плательщиком — нужно будет миграция (добавление полей + пересмотр шаблонов).
- **Alternatives:**
  - Подготовить поля с дефолтом 0 — отвергли: лишний шум в схеме и UI.

---

## ADR-008: Auth — Auth.js v5 Credentials, JWT session

- **Status:** Accepted (2026-05-27)
- **Context:** Нужна авторизация для single user.
- **Decision:** Auth.js v5 (NextAuth) Credentials provider, JWT session strategy.
- **Consequences:** Нет таблицы Session; быстрее; ротация секрета = разлогин.
- **Alternatives:**
  - Better Auth — отвергли: для single-user не выигрывает; меньше документации.
  - Lucia — устаревает.
  - Свой cookie-based auth — отвергли: каждый раз велосипед.

---

## ADR-009: Manual signature, не Smart-ID в MVP

- **Status:** Accepted (2026-05-27)
- **Context:** Smart-ID — стандарт квалифицированной подписи в Литве, но интеграция дорогая.
- **Decision:** В MVP — только ручная подпись пальцем/стилусом через canvas. Smart-ID — Future.
- **Consequences:** Юридическая сила подписи слабее квалифицированной, но достаточна для моих контрактов с малым бизнесом.
- **Alternatives:**
  - DocuSign — отвергли: vendor lock-in + платно + лишнее звено.

---

## ADR-010: Storage — Vercel Blob

- **Status:** Accepted (2026-05-27)
- **Context:** Нужно хранить PDF, подписи (PNG), логотипы, файлы клиентов.
- **Decision:** Vercel Blob.
- **Consequences:** Платно после free tier; intgrated с Vercel deploy.
- **Alternatives:**
  - Supabase Storage — отвергли: раз выбрали Neon, не тянем Supabase ради одного storage.
  - R2 / S3 — отвергли: больше конфигурации; vendor-neutral можем сделать через абстракцию `lib/storage/blob.ts`.

---

## ADR-011: Numbering — Settings counter в транзакции

- **Status:** Accepted (2026-05-27)
- **Context:** Дублирование номеров недопустимо.
- **Decision:** `Settings.invoiceCounter` / `contractCounter` / `proposalCounter`. Инкремент через `update({ data: { invoiceCounter: { increment: 1 } } })` в одной `$transaction` с INSERT документа.
- **Consequences:** Атомарность гарантирована Postgres; не нужно явных locks.
- **Alternatives:**
  - Postgres SEQUENCE — отвергли: меньше гибкости (нельзя задать стартовый номер из UI).
  - `MAX(number) + 1` — отвергли: race condition + плохие индексы при сортировке.

---

## ADR-012: PWA — ручной manifest + production-only SW

- **Status:** Accepted (2026-05-27)
- **Context:** Нужен PWA. `next-pwa` иногда конфликтует с App Router.
- **Decision:** Свой `manifest.webmanifest` + `public/sw.js` (или сгенерированный). Регистрируем SW только в production.
- **Consequences:** Полный контроль; нет автоматических workbox-плюшек, всё пишем сами.
- **Alternatives:**
  - `next-pwa` — отвергли: версии для App Router нестабильны; легче управлять руками.
  - Serwist — рассмотреть позже как middle ground.

---

## ADR-013: Только git `main`, прямые коммиты

- **Status:** Accepted (2026-05-27)
- **Context:** Single dev, нет review.
- **Decision:** Conventional commits прямо в `main`. Без feature-веток и PR.
- **Consequences:** Быстро; нет PR overhead; история линейная.
- **Alternatives:**
  - Feature branches — отвергли: лишний шаг для single dev.

Если позже понадобится staging — заведём `develop` или будем работать через PR.

---

## ADR-014: Документы — на литовском, UI — на русском

- **Status:** Accepted (2026-05-27)
- **Context:** Клиенты — литовские; я веду CRM сам.
- **Decision:** UI CRM на русском. PDF документов на литовском (по полю `Settings.documentLanguage`, на MVP = `lt`).
- **Consequences:** Два набора текстов в коде: i18n не нужен для UI (один язык); PDF шаблоны статичны на литовском.
- **Alternatives:**
  - Полный i18n с lt/en/ru — отвергли: YAGNI.

В Phase 2 — добавить `en` шаблон для англоязычных клиентов.
