# ROADMAP — Webvibe CRM

Что строим и в каком порядке. Источник истины по scope.

---

## Принцип

> Если фича не используется лично мной каждую неделю в первые 30 дней —
> она не MVP.

MVP — это узкий рабочий конвейер, не клон HubSpot.

---

## MVP scope

Финальный список модулей в первой работающей версии:

1. **Auth** — single-user Credentials login
2. **Dashboard** — KPI + работа + сигналы
3. **Clients** — CRUD + карточка
4. **Leads** — CRUD + статусная воронка + convert to Client/Project
5. **Projects** — CRUD + этапы как чеклист (JSON) + ссылки + связи
6. **Tasks** — CRUD внутри проектов
7. **Invoices** + **InvoiceItems** — CRUD + PDF + статусы + нумерация `WV-001`
8. **Contracts** — CRUD + PDF + ручная подпись (`/sign/[token]`) + нумерация `WVS000001`
9. **Proposals** (КП) — CRUD + PDF + convert to Project
10. **Payments** — CRUD + auto-create из «Mark as Paid»
11. **Expenses** — простой CRUD
12. **Maintenance** — CRUD + дневной cron на создание счетов
13. **Reminders** — простой список + dashboard surface
14. **Documents** — агрегированное представление (UNION) Invoice/Contract/Proposal
15. **Settings** — реквизиты, нумерация, валюта, логотип, подпись
16. **PWA** — manifest + иконки + Service Worker + offline shell + mobile UX

---

## Out of MVP (Phase 2)

- Email-отправка PDF (Resend)
- Calendar view (сетка с событиями)
- Templates как редактируемая сущность БД
- Импорт/экспорт CSV (клиенты, счета, расходы — отложено из Iter 3 → Iter 7)
- AI-парсинг чеков/счетов (Claude/GPT API — отложено из Iter 3 по cost reasons)
- «Mark as Paid» → автосоздание Payment (в MVP — explicit добавление)
- Полнотекстовый поиск (Postgres tsvector)
- Англоязычные шаблоны документов (LT/EN bilingual PDF)
- Аналитика глубже базовых сумм (графики по месяцам, среднему чеку)
- Backup-экспорт `pg_dump` в Blob по расписанию
- Sentry / observability
- Client Portal (read-only доступ клиенту к его документам)

---

## Future (не проектируем сейчас)

- Client portal (клиент видит свои документы и статус)
- Smart-ID / qualified e-signature через провайдера
- AI-помощник (генерация описаний, ответы лидам)
- Email automation
- Multi-currency на одном документе
- Multi-language UI

---

## Итерации MVP

> Каждая итерация (и каждый завершённый модуль) заканчивается
> Codex review → commit → push в `origin/main` (см. ADR-015, ADR-016).
> Push после каждого модуля — обязательный safe rollback point.

### Итерация 0 — Bootstrap ✅ Done (`3cec00a`)

Next.js 15 + TS strict + Tailwind v4 + shadcn/ui + Prisma 7 init + pnpm 11. Dark-first Webvibe theme. AppShell skeleton (sidebar 240/topbar 50-60/bottom nav 64/FAB). 11 placeholder routes через ComingSoon. PWA manifest + placeholder W-иконки. `app/globals.css` с CSS-vars (HSL palette, accent gradient, status colors, shadows, radii). Inter + Geist Mono через `next/font`. shadcn initial subset.

### Итерация 1 — Auth + Settings skeleton ✅ Done (`ebd4044`)

Auth.js v5 split config (Edge-safe `lib/auth.config.ts` + Node-only `lib/auth.ts`). Credentials + bcrypt + JWT session. Middleware с whitelist regex + `callbackUrl`. Login page с RHF+Zod+toast+ARIA. SignOut server action. `User` + `Settings(id=1)` модели + первая миграция + idempotent seed с ADR-002 guard. Settings page с реальной формой (live numbering preview). AppShell async, Topbar с user-аватаром.

Runtime ADR-002 invariant (ADR-021): `findMany({ take: 2 })` всей User таблицы + exact email match перед `bcrypt.compare`.

### Итерация 2 — Clients + Projects + Tasks

- [ ] Prisma модели Client, Project, Task
- [ ] CRUD страницы, формы (RHF+Zod)
- [ ] Карточка клиента с вкладками (детали / проекты / документы / платежи)
- [ ] Карточка проекта с stages-чеклистом и ссылками
- [ ] Inline tasks внутри проекта
- **Commit:** `feat(clients): CRUD + card`, `feat(projects): CRUD + stages`, `feat(tasks): inline tasks`

### Итерация 3 — Invoices + Payments + Expenses + Dashboard KPI ✅ code ready

- [x] Prisma модели Invoice, InvoiceItem, Payment, Expense (+ Settings/Client расширения)
- [x] Транзакционная нумерация счетов (WV-001) через `tx.settings.update({ data: { invoiceCounter: { increment: 1 } } })`
- [x] Invoice editor с line items (RHF `useFieldArray`)
- [x] PDF-шаблон счёта (литовский, без PVM, Inter + latin-ext fonts для ąčęėįšųūž)
- [x] Manual status transitions (draft → sent → paid / cancelled) с derived overdue (status=sent && dueAt<now)
- [x] Payments CRUD с привязкой к счёту, автозаполнение суммы остатка
- [x] Expenses простой CRUD + Vercel Blob upload (PDF/JPG/PNG/WebP/HEIC, 8MB, friendly degradation если нет BLOB_READ_WRITE_TOKEN)
- [x] Dashboard KPI: доход/расход за месяц (Europe/Vilnius bounds), неоплаченные счета с overdue badge, активные проекты, top-категории расходов
- [ ] «Mark as Paid» → автосоздание Payment — отложено на Phase 2 (в MVP — explicit добавление платежа)
- **Commits (planned):** `feat(db): iter 3 invoices + payments + expenses`, `feat(invoices): CRUD + transactional numbering + PDF`, `feat(payments): CRUD with invoice linkage`, `feat(expenses): CRUD + Vercel Blob upload`, `feat(dashboard): KPI cards + overdue + top categories`

### Итерация 4 — Contracts + Proposals + Signature ✅ (done 2026-05-31)

- [x] Prisma модели Contract (+kind STAGED/ADVANCE/MAINTENANCE), Proposal, Maintenance (ADR-027)
- [x] PDF-шаблоны договора (3 типа) и КП (литовский)
- [x] Транзакционная нумерация договоров (`WVS000001`, баг с дефисом починен)
- [x] Публичная страница `/sign/[token]` + token-scoped публичный PDF-preview
- [x] react-signature-canvas, сохранение PNG → Vercel Blob (2 MB cap, server-side)
- [x] Вшивание подписи в PDF (render-on-demand; immutable signed PDF в Blob → backlog)
- [x] TTL (7 дней) и one-time atomic consume токенов подписи
- [x] MAINTENANCE-договор при подписании создаёт запись Maintenance
- [ ] Convert Proposal → Project — перенесено в backlog (TASKS.md), не блокер MVP
- **Commits:** `feat(contracts): CRUD + PDF + signing`, `feat(proposals): CRUD + PDF`, `docs: ADR-027 + Iter 4 sync`

### Итерация 5 — Leads + Reminders + Maintenance + Cron

- [ ] Prisma модели Lead, Reminder, Maintenance
- [ ] Leads list + статусная воронка (Kanban-лайт)
- [ ] Convert Lead → Client + Project
- [ ] Reminders простой список
- [ ] Vercel cron `/api/cron/maintenance-invoices`
- [ ] Dashboard: лиды требуют ответа, напоминания, maintenance к выставлению
- **Commits:** `feat(leads): ...`, `feat(maintenance): cron`, `feat(reminders): ...`

### Итерация 6 — PWA + Mobile polish

- [ ] Service Worker (production-only)
- [ ] Offline shell, кеш dashboard read-only
- [ ] Bottom nav на мобиле
- [ ] FAB quick-add (Client / Lead / Task / Reminder / Expense)
- [ ] Bottom sheets вместо modals на mobile
- [ ] Web Share API для PDF
- [ ] Install prompt
- **Commits:** `feat(pwa): manifest + sw + offline shell`, `feat(mobile): bottom nav + sheets`

### Итерация 7 — Polish

- [ ] Empty / loading / error states на каждой странице
- [ ] A11y базовый проход (focus, aria, keyboard nav)
- [ ] README обновление
- [ ] Финальная проверка перед "первым реальным использованием"
- **Commit:** `chore: polish + a11y`

---

## Критерии готовности MVP

CRM считается MVP-готовой, когда я могу:

- [ ] войти с телефона как PWA
- [ ] создать лида с телефона за < 30 секунд
- [ ] превратить лида в клиент + проект одной кнопкой
- [ ] выставить счёт с телефона, скачать PDF, поделиться через share sheet
- [ ] сгенерировать договор, отправить ссылку клиенту, получить подпись пальцем
- [ ] отметить оплату → увидеть это на dashboard сразу
- [ ] увидеть на dashboard «что от меня ждут сегодня»

Если что-то из этого ломается на телефоне — это не MVP-готово.
