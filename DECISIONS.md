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

---

## ADR-015: Use Codex as external review agent after each module

- **Status:** Accepted (2026-05-27)
- **Context:** Claude (Opus) реализует модули и управляет архитектурой проекта, но нужен независимый reviewer для проверки кода, документации, архитектуры, безопасности, TypeScript, Prisma, PWA, PDF и mobile behavior. Без внешнего взгляда есть риск, что Claude пропустит свои же ошибки.
- **Decision:** После каждого модуля Claude создаёт `CODEX-REVIEW-TASK.md` (по шаблону `CODEX-REVIEW-TEMPLATE.md`) и запускает Codex через non-interactive `codex exec`. Codex создаёт `REVIEW-CODEX.md`. Claude читает `REVIEW-CODEX.md`, исправляет Critical issues, Important issues исправляет или переносит в `TASKS.md`. Модуль нельзя закрыть без Codex review.
- **Команда:**
  ```bash
  codex exec --cd . --sandbox workspace-write --output-last-message CODEX-LAST-OUTPUT.md \
    "Прочитай CODEX-REVIEW-TASK.md и выполни независимое ревью. Создай REVIEW-CODEX.md. Не меняй другие файлы проекта."
  ```
- **Consequences:**
  - появляется независимый review layer
  - меньше риск архитектурных ошибок
  - меньше риск багов перед commit/push
  - модуль нельзя закрыть без `REVIEW-CODEX.md`
  - Codex не меняет код сам, если отдельно не разрешено
  - эфемерные review-файлы (`CODEX-REVIEW-TASK.md`, `REVIEW-CODEX.md`, `CODEX-LAST-OUTPUT.md`) в `.gitignore` — они перезаписываются на каждом модуле
- **Alternatives:**
  - ручной review без Codex — отклонено: менее дисциплинированно
  - интерактивный `codex` — отклонено: хуже для автоматизации, требует подтверждений
  - review только силами Claude — отклонено: нет независимой проверки
  - флаг `--ask-for-approval` — отклонено: текущая версия `codex exec` его не поддерживает

---

## ADR-016: Use GitHub checkpoint after every completed module

- **Status:** Accepted (2026-05-27)
- **Context:** Проект строится по модулям. Нужны безопасные точки отката между этапами, чтобы можно было быстро вернуться к стабильной версии, если следующий модуль сломает проект.
- **Decision:** После каждого завершённого модуля выполняется Codex review, исправляются критичные замечания, запускаются доступные проверки, затем делается conventional commit и push в `origin/main`.
- **Consequences:**
  - каждый модуль имеет стабильный GitHub checkpoint
  - можно быстро откатиться к предыдущему рабочему состоянию через `git reset --hard <hash>` или `git revert`
  - нельзя переходить к следующему модулю, пока текущий не прошёл review, commit и push
  - история GitHub остаётся чистой и понятной (conventional commits, один модуль — один или несколько логичных коммитов)
- **Alternatives:**
  - коммитить редко большими блоками — отклонено: сложнее откатываться
  - пушить только в конце дня — отклонено: можно потерять стабильную точку между модулями
  - отдельные ветки на каждый модуль — пока отклонено: single-developer, прямой `main` workflow быстрее. Может быть пересмотрено позже.

---

## ADR-017: `Expense.recurring` / `recurrence` — storage-only поля в MVP

- **Status:** Accepted (2026-05-27)
- **Context:** В `Expense` модель добавлены поля `recurring: Boolean` и `recurrence: String?`. Это формальное нарушение принципа `product-architect`: «не добавляй поля "может пригодиться"». Однако даже в MVP я хочу помечать повторяющиеся расходы (хостинг, домены, AI tools), чтобы не считать их «случайными» при ручном просмотре списка расходов.
- **Decision:** Поля **остаются** в MVP как **storage-only** — без cron'а, без автоматического создания новых записей, без UI-сигналов кроме чекбокса «повторяется» в форме. Это исключение фиксируется как ADR, а не «забытый scope leak».
- **Consequences:**
  - в `Expense` есть индикатор повторяемости без логики обработки
  - не блокирует Phase 2 автоматизацию (cron на повторяющиеся расходы)
  - не нарушает обещание «никаких feature-флагов на будущее» — это поле наблюдения, не флаг
- **Alternatives:**
  - убрать поля до Phase 2 — отклонено: я хочу видеть пометку «повторяется» уже в MVP при ручном анализе расходов
  - вынести в отдельную таблицу `RecurringExpense` — отклонено: над-инжиниринг для двух полей

---

## ADR-018: Limit Codex review loop to two passes per module

- **Status:** Accepted (2026-05-27)
- **Context:** Прошлый модуль "planning layer workflow" прошёл 4 прохода Codex review. Каждый проход обнаруживал новые мелкие нюансы документации. Полировка занимала всё больше времени, при этом ни одного нового Critical issue после Pass 2 не появлялось. Это создаёт риск бесконечного цикла "fix → review → find new minor → fix" вместо движения вперёд. Codex — независимый внешний reviewer, но он не финальный product owner.
- **Decision:** Жёсткий лимит **2 прохода Codex review на модуль/итерацию**:
  - **Pass 1:** полный review (всё — docs, types, security, architecture, edge cases). Claude исправляет все Critical, Important — либо чинит, либо переносит в `TASKS.md`. Nice-to-have не блокируют.
  - **Pass 2:** запускается только при существенных изменениях после Pass 1 (новый код, миграции, security-правки). Фокус: исправлены ли Pass 1 Critical, не появились ли новые Critical, нет ли блокеров. Если Pass 1 правил только Important/Nice-to-have — Pass 2 не запускаем.
  - После Pass 2 — **третий проход не запускаем**. Оставшиеся Important идут в `TASKS.md`.
  - Если после Pass 2 остаются Critical — **стоп**, не коммитим, не пушим, ждём решения владельца.
- **Consequences:**
  - delivery loop ограничен по времени, не растягивается на полировку
  - модуль accepted при 0 Critical, не при 0 Issues
  - часть Important мигрирует в `TASKS.md` вместо «исправь прямо сейчас» — это нормально
  - Codex остаётся ценным независимым reviewer, но не становится бутылочным горлышком
- **Alternatives:**
  - неограниченное число проходов — отклонено: убивает скорость delivery; в planning layer показало 4 прохода без новых Critical после Pass 2
  - 1 проход — отклонено: не даёт проверить, что Critical fixes сами не сломали что-то
  - 3 прохода — отклонено: лишний шаг, который статистически не приносит новых Critical
  - ручной gate на каждом проходе — отклонено: лишние блокировки для single-dev workflow

---

## ADR-019: Prisma 7 — driver adapter & config conventions

- **Status:** Accepted (2026-05-28, during Iter 1)
- **Context:** Prisma 7 ввёл два breaking changes по сравнению с тем, что было заложено в planning слое:
  1. **`url` / `directUrl` дропнуты из schema's `datasource`** — теперь живут только в `prisma.config.ts`.
  2. **Driver adapters стандарт** — `previewFeatures = ["driverAdapters"]` больше не нужен.
  3. **Generated client путь** — `output = "../lib/generated/prisma"`, entry — `client.ts` (не `index.ts`), импорт: `import { PrismaClient } from "@/lib/generated/prisma/client"`.
  Также Neon рекомендует разделять pooled и direct URL для разных операций.
- **Decision:**
  - Используем `@prisma/adapter-pg` + `pg` как единый driver adapter для runtime и migrate. **НЕ** используем `@prisma/adapter-neon` пока (мы на Node runtime, не Edge — преимуществ нет; усложнение без выгоды).
  - **Runtime** (`lib/db.ts`): singleton PrismaClient через `new PrismaPg({ connectionString: process.env.DATABASE_URL })` — pooled URL.
  - **CLI migrate** (`prisma.config.ts`): `datasource.url = process.env.DIRECT_URL` — пулер не выполняет DDL.
  - **Generated client** — `lib/generated/prisma/` в `.gitignore`; импорт `@/lib/generated/prisma/client`.
  - `migrations.seed = "tsx prisma/seed.ts"` в `prisma.config.ts` — `prisma db seed` найдёт скрипт через эту запись.
- **Consequences:**
  - Один adapter — одна точка переключения, если позже захотим Edge.
  - `lib/db.ts` глобал singleton предотвращает множество клиентов в dev (Next.js hot reload).
  - Импорт сгенерированного клиента отличается от привычного `@prisma/client`. Все наши места используют `@/lib/generated/prisma/client`.
  - При смене Neon → Vercel Postgres (или другой провайдер) — поменять только URL'ы в `.env`, код не трогать.
- **Alternatives:**
  - `@prisma/adapter-neon` — отклонено: оптимизация без выгоды при Node runtime; добавляет зависимость от `@neondatabase/serverless`. Может быть пересмотрено перед Vercel Edge migration (если когда-то будет).
  - Хранить `url`/`directUrl` в schema — невозможно (Prisma 7 убрал).
  - Один URL для всего (только pooled) — невозможно: Neon pooler не выполняет DDL → migrate сломается.

---

## ADR-020: Auth.js v5 — split config for Edge-safe middleware

- **Status:** Accepted (2026-05-28, during Iter 1)
- **Context:** Next.js middleware по умолчанию запускается на Edge runtime. Edge **не имеет** Node modules (`node:path`, `node:os`, `node:fs`) и не может запустить Prisma engine или bcrypt. Если middleware импортирует `lib/auth.ts` напрямую (которая тянет Prisma через `lib/db.ts`), build падает с `UnhandledSchemeError: node:path is not handled`. Это известная проблема NextAuth v5 + Prisma.
- **Decision:** **Split config** — два файла:
  - **`lib/auth.config.ts`** — Edge-safe. Только `session`, `pages`, `trustHost`, `callbacks`. Пустой `providers: []`. Импортируется middleware'ом.
  - **`lib/auth.ts`** — Node-only. Расширяет `authConfig` через spread + добавляет Credentials provider (Prisma + bcrypt). Экспортирует `handlers`, `signIn`, `signOut`, `auth`. Импортируется server actions, route handlers, RSC.
  - Middleware: `import NextAuth from "next-auth"; import { authConfig } from "@/lib/auth.config"; const { auth } = NextAuth(authConfig);`
- **Consequences:**
  - JWT-сессия в middleware проверяется корректно (JWT — чистый JS, Edge-compatible).
  - Middleware **не делает DB-вызовов** (это и так было целью JWT strategy — ADR-008).
  - Любая логика, которая хочет читать из БД, — в `lib/auth.ts` callbacks или в server actions через `auth()`.
  - При добавлении новых providers (OAuth и т.п.) — добавлять в `lib/auth.ts`, не в `auth.config.ts`.
- **Alternatives:**
  - `runtime = "nodejs"` для middleware — отклонено: Next.js не поддерживает Node runtime для middleware на момент Iter 1.
  - Отказаться от middleware, защищать каждую страницу через `auth()` в RSC — отклонено: server actions без middleware теряют consistent gate, легче забыть.
  - Database session strategy — отклонено: ADR-008 фиксирует JWT.

---

## ADR-021: Single-user runtime invariant — full-table scan in authorize

- **Status:** Accepted (2026-05-28, during Iter 1, Codex Pass 2 fix)
- **Context:** ADR-002 фиксирует single-user. Изначально в `authorize` я делал `findUnique({ where: { email } })` — но это не защищает invariant: если в БД появится второй `User` с другим email (через ручное редактирование, плохую миграцию, или будущий код), оба могут залогиниться. Email-unique constraint и seed-guard защищают только write path. Codex Pass 2 нашёл это как Critical.
- **Decision:** В `lib/auth.ts` `authorize`:
  1. `findMany({ take: 2 })` — без `where`, читаем все user'ы (max 2 для дешевизны).
  2. Если `users.length !== 1` → `return null` (нет auth).
  3. Если single row's email НЕ совпадает с submitted (normalized: trim + lowercase) → `return null`.
  4. Только после этого `bcrypt.compare`.
- **Consequences:**
  - Defense-in-depth: даже если случайно создадим второго `User` через ручную миграцию или баг seed, никто не сможет залогиниться, пока ситуация не разрешена через `prisma.user.deleteMany()`.
  - Cost: один `findMany` запрос вместо `findUnique`. Для single-row таблицы — пренебрежимо.
  - При планируемом расширении на multi-user (если когда-нибудь — Phase 2 client portal, например) — этот guard надо снять явно и заменить на role check.
- **Alternatives:**
  - Полагаться на email-unique + seed-guard — отклонено: Codex Pass 2 показал, что runtime path остаётся незакрытым.
  - `count()` + `findUnique` — отклонено: две поездки в БД вместо одной.
  - DB constraint `CHECK (id_in_subset_of_singleton)` — отклонено: Postgres не любит row-count constraints, и в любом случае мы решаем это на app-уровне.
