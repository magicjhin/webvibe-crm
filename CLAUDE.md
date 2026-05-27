# CLAUDE.md — Webvibe CRM

Проектные инструкции для Claude Code. Имеют приоритет над общими привычками.
Глобальные правила (язык общения, мой стек, кто я) уже есть в `~/.claude/CLAUDE.md` —
здесь не дублируем, описываем только то, что специфично для этого проекта.

---

## Что это за проект

Личная внутренняя CRM на Next.js + TypeScript + Tailwind + Prisma + Neon Postgres.
PWA-first. Один пользователь — я. Без team, без ролей, без permissions,
без multi-tenant, без публичного SaaS, без activity log.

Главная цель — узкий рабочий конвейер
`Лид → КП → Договор → Счёт → Проект → Платёж → Поддержка`
с хорошим dashboard, генерацией PDF и ручной подписью пальцем на телефоне.

---

## Жёсткие правила

### Что НЕ делаем никогда
- multi-user, роли, permissions
- activity log
- автоматический Vercel deploy (production trogger делаю только я вручную)
- Smart-ID, qualified e-signature (Future, не сейчас)
- email отправка из приложения (Phase 2 — Resend; в MVP только download/share PDF)
- календарь как сетка (на MVP — список напоминаний с датами)
- редактируемые шаблоны как сущности БД (на MVP — TSX-шаблоны в коде)
- расчёт VAT/PVM в документах (я работаю по индивидуальной деятельности без PVM —
  в счетах/КП НЕ считаем PVM; при необходимости пишем "Suma be PVM")
- предлагать Elementor / шаблонный WordPress как альтернативу
- multi-currency на одном документе (currency берём из Settings, по умолчанию EUR)
- мокать БД в тестах (используем реальную dev БД)

### Что делаем всегда
- TypeScript strict
- Zod-валидация на клиенте И на сервере
- деньги — только `Prisma.Decimal`, никогда `number`
- даты — UTC в БД, форматируем через `date-fns` на отображении
- Server Components по умолчанию, Client Components — только когда нужна интерактивность
- `runtime = 'nodejs'` для всего, что ходит в Prisma
- tabular-nums для всех денежных значений в UI
- Russian для общения со мной; UI на русском; **документы (PDF) на литовском**

---

## Стек (зафиксирован)

| Слой | Решение |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript strict |
| Styling | Tailwind CSS v4 |
| UI kit | shadcn/ui (копируем в `components/ui/`) |
| Icons | lucide-react |
| DB | Postgres @ Neon |
| ORM | Prisma |
| Auth | Auth.js v5 (NextAuth) Credentials provider, single user |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Dates | date-fns |
| PDF | @react-pdf/renderer (server-side) |
| Signature | react-signature-canvas |
| Storage | Vercel Blob |
| Animations | Framer Motion (точечно) |
| Money | Prisma.Decimal + Intl.NumberFormat |
| PWA | ручной manifest + production-only SW |

Альтернативные стеки не предлагать.

---

## Финансовая модель

- Я не плательщик PVM. Все документы — **без PVM**.
- В строках счёта только: title, description, qty, unitPrice, total.
- На MVP — одна валюта (EUR), берётся из `Settings`.

---

## Нумерация документов

- Счета: `WV-001`, `WV-002`, ...
- Договоры: `WVS000001`, `WVS000002`, ...
- КП: `WVP-001`, `WVP-002`, ...
- Стартовые номера задаются в `Settings` (`invoiceCounter`, `contractCounter`, `proposalCounter`).
- Инкремент — **в одной транзакции** с INSERT документа через атомарный
  `tx.settings.update({ where: { id: 1 }, data: { invoiceCounter: { increment: 1 } } })`.
  Postgres гарантирует атомарность row-update, явные locks не нужны.
- Никогда не используем `MAX(number) + 1`.

---

## Подпись документов

- На MVP — только ручная подпись пальцем/стилусом на телефоне.
- Публичная страница `/sign/[token]`, без авторизации.
- Токен: ≥ 32 байта random, в БД храним hash (не plain).
- TTL (например 7 дней), one-time use.
- Сохраняем: `signedAt`, `signerName`, `signerIp`, `signerUserAgent`, `signatureUrl`.
- Подпись (PNG) вшивается в финальный PDF договора.
- Smart-ID — Future, в MVP не блокируем workflow из-за неё.

---

## Workflow коммитов

- Conventional Commits: `feat(...)`, `fix(...)`, `chore(...)`, `refactor(...)`, `docs(...)`.
- Прямо в `main`, без feature-веток (single dev).
- Коммитим **после каждой законченной осмысленной части**, не каждые 5 минут и не «всё одним коммитом».
- Перед коммитом — `typecheck` и `lint` проходят (если эти команды уже существуют в проекте).
- Никогда не использовать `--no-verify` без явной просьбы.
- **Push после каждого модуля — обязателен** (см. GitHub checkpoint workflow ниже и ADR-016).

GitHub repo:
- Owner: `webvibe-work` (organization)
- Name: `webvibe-crm`
- Visibility: `private`
- Remote: `origin → git@github.com:webvibe-work/webvibe-crm.git`

Vercel:
- Я подключаю проект к Vercel **вручную** через Dashboard → Import Git Repository.
- Claude никогда не делает `vercel`, `vercel link`, `vercel deploy`.

---

## Использование project agents

В `.claude/agents/` живут семь специализированных агентов. Использовать их при делегировании:

| Когда | Какой агент |
|---|---|
| продуктовая декомпозиция, scope-решения | `product-architect` |
| дизайн, layout, состояния, mobile UX | `ux-ui-designer` |
| Next.js страницы, формы, навигация | `frontend-architect` |
| Prisma schema, server actions, миграции | `backend-data-architect` |
| счета, договоры, КП, PDF, подпись | `documents-pdf-specialist` |
| code review перед закрытием задачи | `qa-reviewer` |
| последовательность задач, GitHub, deploy-готовность | `delivery-manager` |

Не делегировать тривиальные правки — это удорожает контекст.

---

## Документация проекта

| Файл | Когда читать |
|---|---|
| `ROADMAP.md` | планируем итерацию, оцениваем «MVP vs Phase 2» |
| `TASKS.md` | текущая итерация, что делаем прямо сейчас |
| `ARCHITECTURE.md` | вопросы про слои, runtime, server/client, PWA |
| `DATABASE.md` | вопросы про модели, поля, миграции |
| `UI-DESIGN.md` | вопросы про цвета, шрифты, компоненты, состояния |
| `WORKFLOW.md` | вопросы про пользовательские сценарии |
| `DECISIONS.md` | "почему так, а не иначе" |
| `README.md` | как запустить проект, env vars |
| `CODEX-REVIEW-TEMPLATE.md` | шаблон для CODEX-REVIEW-TASK.md перед каждым review |

При изменении архитектурных решений — обновлять `DECISIONS.md` (ADR-лайт).

---

## Codex review workflow

После каждого завершённого модуля или крупной итерации Claude **обязан** выполнить
Codex review loop. Модуль нельзя считать завершённым без Codex review.

### Полный workflow

1. **Реализовать модуль.**
2. **Обновить связанные project docs**, если изменилась логика, архитектура, БД, workflow или UI-подход.
3. **Создать `CODEX-REVIEW-TASK.md`** для конкретного модуля по `CODEX-REVIEW-TEMPLATE.md`.
4. В `CODEX-REVIEW-TASK.md` указать:
   - название модуля
   - что было реализовано
   - список изменённых файлов
   - связанные пункты `TASKS.md`
   - какие project docs нужно сравнить
   - expected behavior
   - что именно Codex должен проверить
   - явную инструкцию: Codex может создавать / изменять только `REVIEW-CODEX.md` и `CODEX-LAST-OUTPUT.md` (последний пишется самим CLI), другие файлы проекта не трогать
5. **Запустить Codex** через non-interactive команду:
   ```bash
   codex exec --cd . --sandbox workspace-write --output-last-message CODEX-LAST-OUTPUT.md \
     "Прочитай CODEX-REVIEW-TASK.md и выполни независимое ревью. Создай REVIEW-CODEX.md. Не меняй другие файлы проекта."
   ```
6. **Дождаться** появления `REVIEW-CODEX.md`.
7. **Прочитать** `REVIEW-CODEX.md`.
8. **Разделить замечания** на:
   - **Critical** — блокеры
   - **Important** — важно, но не блокер
   - **Nice-to-have** — улучшения
9. **Исправить все Critical issues.**
10. **Important issues** либо исправить, либо добавить в `TASKS.md` как отдельные задачи.
11. **Nice-to-have** не блокируют закрытие модуля, но могут попасть в `TASKS.md`.
12. Если после исправлений были существенные изменения — **повторить Codex review.**
13. Только после успешного Codex review можно переходить к GitHub checkpoint.

### Правила вызова Codex

- Использовать **только** `codex exec` (non-interactive).
- **Не** использовать `--ask-for-approval` — текущая версия `codex exec` его не поддерживает.
- **Не** запускать интерактивный `codex`.
- Codex может создавать / изменять только `REVIEW-CODEX.md` и `CODEX-LAST-OUTPUT.md` (последний пишется самим CLI через `--output-last-message`).
- Если команда упала или `REVIEW-CODEX.md` не создан — review считается неуспешным,
  модуль закрывать нельзя, commit и push делать нельзя.

---

## GitHub checkpoint workflow

После каждого успешно завершённого модуля или крупной итерации Claude **обязан** сделать GitHub checkpoint.

**Главное правило:** модуль не считается завершённым, пока изменения не прошли
Codex review, не были закоммичены и не были запушены в GitHub.

- **GitHub remote:** `origin → git@github.com:webvibe-work/webvibe-crm.git`
- **Repository:** https://github.com/webvibe-work/webvibe-crm

### Полный delivery loop после модуля

1. Codex review выполнен.
2. Critical issues исправлены.
3. Important issues исправлены или перенесены в `TASKS.md`.
4. Запущены доступные проверки проекта:
   - `typecheck`, если команда уже есть
   - `lint`, если команда уже есть
   - `build`, если уместно для текущего этапа
   - другие проверки из `package.json`
5. Проверен `git status`.
6. Создан осмысленный commit.
7. Выполнен `push` в `origin/main`.
8. Проверен clean `git status` после push.
9. `TASKS.md` обновлён.
10. Только после этого задача/модуль может быть отмечен как **Done**.

### Commit style — Conventional Commits

Примеры:
- `chore: add codex review workflow`
- `chore: bootstrap next.js project`
- `feat(auth): add single-user credentials login`
- `feat(clients): add clients crud`
- `feat(projects): add projects and tasks`
- `feat(invoices): add invoice generation`
- `feat(contracts): add contracts and manual signature`
- `feat(pwa): add installable pwa shell`
- `fix(invoices): handle invoice numbering transaction`
- `docs: update architecture after clients module`

### Правила

- **Не** делать commit, если есть unresolved Critical issues из Codex review.
- **Не** делать push, если `typecheck`/`lint`/`build` падают — кроме случаев, когда текущий этап ещё не имеет этих команд (тогда явно об этом сказать).
- **Не** делать один огромный commit на несколько несвязанных модулей.
- Один завершённый модуль = отдельный commit или несколько логичных commits.
- После успешного push показать:
  - commit hash
  - `git status`
  - branch tracking status
  - краткое summary изменений
  - ссылку на GitHub repository

### Rollback reason

Push после каждого модуля нужен для безопасных rollback points.
Если следующий модуль сломает проект, должна быть возможность вернуться
к последнему стабильному commit на GitHub.

### Эфемерные файлы (НЕ коммитим)

- `CODEX-REVIEW-TASK.md`
- `REVIEW-CODEX.md`
- `CODEX-LAST-OUTPUT.md`
- `CODEX-TEST.md`

Все они в `.gitignore`. Шаблон `CODEX-REVIEW-TEMPLATE.md` — **коммитится**.
