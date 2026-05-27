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
- Стартовые номера задаются в `Settings` (`invoiceCounter`, `contractCounter`).
- Инкремент — **в одной транзакции** с INSERT документа.
- Никогда не используем `MAX(number) + 1` — только счётчик в Settings под `SELECT ... FOR UPDATE`.

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
- Перед коммитом — type-check проходит, lint проходит.
- Никогда не использовать `--no-verify` без явной просьбы.
- Push — только после моего отдельного «да» на этапе создания GitHub repo.

GitHub repo:
- Owner: `webvibe-work` (organization)
- Name: `webvibe-crm`
- Visibility: `private`

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

При изменении архитектурных решений — обновлять `DECISIONS.md` (ADR-лайт).
