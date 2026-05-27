# TASKS — Текущая итерация

Живой список задач прямо сейчас. После завершения итерации — обновлять.
Полный план итераций — в `ROADMAP.md`.

---

## Definition of Done для крупного модуля

Каждый крупный модуль закрывается только когда выполнено всё:

- [ ] module implemented according to `TASKS.md`
- [ ] related docs updated if needed
- [ ] `CODEX-REVIEW-TASK.md` created (по `CODEX-REVIEW-TEMPLATE.md`)
- [ ] Codex review executed through `codex exec`
- [ ] `REVIEW-CODEX.md` created
- [ ] Codex review processed (findings classified Critical / Important / Nice-to-have)
- [ ] Critical issues fixed
- [ ] Important issues fixed or moved to `TASKS.md`
- [ ] available checks passed (`typecheck`, `lint`, `build` — те, что уже существуют)
- [ ] commit created (Conventional Commits)
- [ ] pushed to `origin/main`
- [ ] `git status` clean after push
- [ ] rollback checkpoint available on GitHub

**Правило:** нельзя переходить к следующему модулю, пока текущий модуль не прошёл
Codex review, Critical fixes, available checks, commit и push.

---

## Сейчас: Итерация -1 — Planning docs (in progress)

- [x] Утвердить Ultraplan
- [x] Создать `CLAUDE.md`
- [x] Создать `README.md`
- [x] Создать `.env.example`
- [x] Создать `.gitignore`
- [x] Создать `ROADMAP.md`
- [x] Создать `TASKS.md`
- [x] Создать `ARCHITECTURE.md`
- [x] Создать `DATABASE.md`
- [x] Создать `UI-DESIGN.md`
- [x] Создать `WORKFLOW.md`
- [x] Создать `DECISIONS.md`
- [x] Создать 7 project agents в `.claude/agents/`
- [x] `git init` + первый коммит `chore: add project planning docs`
- [x] Проверить `gh auth status`, доступ к `webvibe-work`
- [x] Создать private repo `webvibe-work/webvibe-crm` через `gh repo create`
- [x] Push в GitHub
- [ ] Add Codex review and GitHub checkpoint workflow
  - [x] Обновить `CLAUDE.md` (Codex + GitHub checkpoint sections)
  - [x] Обновить `TASKS.md` (Definition of Done + новая задача)
  - [x] Обновить `DECISIONS.md` (два новых ADR)
  - [x] Обновить `README.md` (раздел про review/delivery)
  - [x] Обновить `.claude/agents/qa-reviewer.md`
  - [x] Обновить `.claude/agents/delivery-manager.md`
  - [x] Создать `CODEX-REVIEW-TEMPLATE.md`
  - [x] Обновить `.gitignore` (эфемерные codex-файлы)
  - [x] Создать `CODEX-REVIEW-TASK.md` для проверки планировочного слоя
  - [x] Запустить `codex exec` и дождаться `REVIEW-CODEX.md` (4 прохода)
  - [x] Обработать findings:
        Pass 1: 3 Critical (push policy, auth middleware, onDelete) + 10 Important + 4 Nice-to-have — все исправлены
        Pass 2: 0 Critical + 6 Important (delivery-manager checklist, cron pattern, sign atomic consume, allowed files, InvoiceItem timestamps, backend-data timezone) — все исправлены
        Pass 3: 0 Critical + 6 Important (sign API whitelist, agent atomic consume, Mark as paid race, Lead.client policy, Expense scope, forms list) — все исправлены
        Pass 4: 0 Critical + 5 Important (overdue derived, Contract status, Expense ADR-017, FK indexes, sign workflow wording) — все исправлены
  - [ ] Commit `chore: add codex review and github checkpoint workflow`
  - [ ] Push в `origin/main`
  - [ ] Проверка git status clean

---

## Следующая: Итерация 0 — Bootstrap (ждёт подтверждения владельца на старт)

> Запускается после явного "да, начинаем Bootstrap" от владельца.
> После Bootstrap — Codex review → commit → push (ADR-016).

- [ ] `pnpm create next-app .` — TS, Tailwind, App Router, ESLint, src/ — нет, pnpm — да
- [ ] Установить core deps:
      `pnpm add @prisma/client zod react-hook-form @hookform/resolvers
       next-auth@beta @auth/prisma-adapter bcryptjs date-fns date-fns-tz
       @tanstack/react-table @react-pdf/renderer react-signature-canvas
       @vercel/blob lucide-react decimal.js clsx tailwind-merge
       class-variance-authority sonner`
- [ ] Установить dev deps:
      `pnpm add -D prisma tsx @types/bcryptjs`
- [ ] `pnpm dlx shadcn@latest init` — neutral, slate, CSS variables
- [ ] Добавить начальный (initial subset) shadcn компонентов: `button input label dialog sheet table form select textarea badge card dropdown-menu sonner`. Полный набор по `UI-DESIGN.md` доустанавливается на соответствующих итерациях.
- [ ] Tailwind tokens — цвета, шрифты, радиусы из `UI-DESIGN.md`
- [ ] `app/layout.tsx` + `app/globals.css` + dark theme базовая
- [ ] `components/layout/AppShell.tsx` (визуальный скелет, без auth)
- [ ] `prisma/schema.prisma` — пустая с datasource + generator
- [ ] `public/manifest.webmanifest` + базовые иконки 192/512/maskable (плейсхолдеры)
- [ ] `app/offline/page.tsx` — заглушка для offline shell
- [ ] Commit: `chore: bootstrap project`
- [ ] Codex review → push в `origin/main` (по ADR-016)

---

## Дальше

См. `ROADMAP.md`, итерации 1–7.

---

## Открытые вопросы / TODO позже

- Сгенерировать финальный набор PWA-иконок из webvibe-логотипа
- Решить, использовать ли `next-pwa` или ручной SW (предварительно: ручной)
- Подобрать шрифты: Inter + Geist Mono (через `next/font/google`)
- Подготовить логотип и подпись (PNG/SVG) для встраивания в PDF
- Определить точные тексты юридических разделов договора (LT)
