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
- Импорт/экспорт CSV (клиенты, счета, расходы)
- Полнотекстовый поиск (Postgres tsvector)
- Англоязычные шаблоны документов (LT/EN bilingual PDF)
- Аналитика глубже базовых сумм (графики по месяцам, среднему чеку)
- Backup-экспорт `pg_dump` в Blob по расписанию
- Sentry / observability

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

> Каждая итерация заканчивается рабочим состоянием и git commit'ом.
> GitHub push — только после моего отдельного подтверждения (после Итерации 0–1).

### Итерация 0 — Bootstrap (планирование завершено, код впереди)

- [ ] `pnpm create next-app` с TS + Tailwind + App Router + ESLint
- [ ] Установить shadcn/ui, инициализировать
- [ ] Установить Prisma, Auth.js v5, lucide, react-hook-form, zod, date-fns, tanstack-table, decimal.js
- [ ] Tailwind tokens — цвета, радиусы, шрифты из `UI-DESIGN.md`
- [ ] `AppShell` (sidebar + topbar + mobile bottom nav, без логики)
- [ ] Базовая dark theme + переключатель
- [ ] Prisma init, подключение к Neon
- [ ] `manifest.webmanifest` + базовые иконки
- **Commit:** `chore: bootstrap project`
- **GitHub push:** после Итерации 0–1 (после явного "да")

### Итерация 1 — Auth + Settings skeleton

- [ ] Auth.js v5 Credentials provider, login page
- [ ] Middleware для `(app)` group
- [ ] Логaut
- [ ] `User` модель, seed скрипт для одного admin
- [ ] `Settings` модель + страница (реквизиты, нумерация, валюта)
- [ ] Dashboard placeholder
- **Commit:** `feat(auth): single-user credentials login`

### Итерация 2 — Clients + Projects + Tasks

- [ ] Prisma модели Client, Project, Task
- [ ] CRUD страницы, формы (RHF+Zod)
- [ ] Карточка клиента с вкладками (детали / проекты / документы / платежи)
- [ ] Карточка проекта с stages-чеклистом и ссылками
- [ ] Inline tasks внутри проекта
- **Commit:** `feat(clients): CRUD + card`, `feat(projects): CRUD + stages`, `feat(tasks): inline tasks`

### Итерация 3 — Invoices + Payments + Expenses + Dashboard KPI

- [ ] Prisma модели Invoice, InvoiceItem, Payment, Expense
- [ ] Транзакционная нумерация счетов
- [ ] Invoice editor с line items
- [ ] PDF-шаблон счёта (литовский, без PVM)
- [ ] Mark as Paid → автосоздание Payment
- [ ] Expenses простой CRUD
- [ ] Dashboard KPI: доход, ожидается, расходы, неоплаченные
- **Commits:** `feat(invoices): CRUD + numbering`, `feat(pdf): invoice template`, `feat(payments): ...`

### Итерация 4 — Contracts + Proposals + Signature

- [ ] Prisma модели Contract, Proposal
- [ ] PDF-шаблон договора и КП (литовский)
- [ ] Транзакционная нумерация договоров
- [ ] Публичная страница `/sign/[token]`
- [ ] react-signature-canvas, сохранение PNG → Blob
- [ ] Вшивание подписи в финальный PDF
- [ ] TTL и one-time use токенов подписи
- [ ] Convert Proposal → Project
- **Commits:** `feat(contracts): CRUD + PDF`, `feat(signature): canvas signing`, `feat(proposals): CRUD + PDF`

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
