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
