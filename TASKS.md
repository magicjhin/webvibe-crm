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

**Лимит Codex review:** максимум **2 прохода** на модуль (ADR-018).
- Pass 1 — полный review, исправляем все Critical.
- Pass 2 — фокус только на Critical (запускается только при существенных изменениях после Pass 1).
- Если после Pass 2 есть Critical → стоп, не коммитим, ждём решения владельца.
- Если только Important/Nice-to-have → в `TASKS.md` и закрываем модуль.

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
  - [x] Commit `chore: add codex review and github checkpoint workflow` (`81c3c4b`)
  - [x] Push в `origin/main` (выполнен после `81c3c4b`)
  - [x] Проверка git status clean (подтверждено `git status` после push)
- [x] **Add 2-pass Codex review limit (ADR-018)** — модуль закрыт
  - [x] CLAUDE.md + TASKS.md + DECISIONS.md (ADR-018) + qa-reviewer.md + delivery-manager.md
  - [x] Codex Pass 1 — verdict `Yes`, 0 Critical, 0 Important, 3 Nice-to-have (косметика)
  - [x] Pass 2 не запускался (Pass 1 — только docs touch-ups, по правилу ADR-018)
  - [x] Commit `chore: limit codex review loop passes` (`1c492e9`)
  - [x] Push в `origin/main` (HEAD → origin/main up to date)

---

## Итерация 0 — Bootstrap (✅ Done — commit `3cec00a`)

- [x] `pnpm create next-app .` — TS, Tailwind, App Router, ESLint, без src/, pnpm. **Note:** CLI отказался работать в непустой папке → backup planning docs в `/tmp/webvibe-planning-backup/` → run CLI → restore.
- [x] Активирован pnpm 11.4.0 через `corepack enable pnpm` + `corepack prepare pnpm@latest --activate`.
- [x] Установлены core deps: `@prisma/client zod react-hook-form @hookform/resolvers next-auth@beta @auth/prisma-adapter bcryptjs date-fns date-fns-tz @tanstack/react-table @react-pdf/renderer react-signature-canvas @vercel/blob lucide-react decimal.js clsx tailwind-merge class-variance-authority sonner`.
- [x] Установлены dev deps: `prisma tsx`. **Note:** `@types/bcryptjs` опущен (deprecated — bcryptjs v3 имеет встроенные TS types). `sharp` добавлен как devDep для генерации placeholder PWA-иконок.
- [x] `pnpm dlx shadcn@latest init --defaults --base radix` — initial config + button + globals.css. Завершилось с `--force` после approval `msw` в `pnpm-workspace.yaml`.
- [x] Добавлены initial subset shadcn компонентов: `input label dialog sheet table select textarea badge card dropdown-menu sonner` (`form` отсутствует в shadcn 4 — используем RHF + Label/Input напрямую при создании первой формы).
- [x] `app/globals.css` переписан под Webvibe tokens из `UI-DESIGN.md` (dark-first, HSL palette, accent gradient, status colors, radii scale, `.bg-accent-gradient` / `.text-accent-gradient` utility classes).
- [x] `app/layout.tsx` — Inter + Geist Mono через `next/font/google`, `<html class="dark" lang="ru">`, manifest link, viewport themeColor, apple-web-app meta, Toaster.
- [x] `components/layout/AppShell.tsx` — visual skeleton (sidebar 240px desktop / topbar 60px / bottom nav 64px mobile / FAB), placeholder links к 10 будущим разделам.
- [x] `app/page.tsx` — заглушка в AppShell с приветствием и 6 placeholder cards.
- [x] `app/offline/page.tsx` — offline shell (статичная страница, SW pending Iter 6).
- [x] `prisma/schema.prisma` + `prisma.config.ts` — Prisma 7 init с output `lib/generated/prisma`. **Breaking change в Prisma 7:** `url`/`directUrl` теперь только в `prisma.config.ts`, не в schema.
- [x] `.env` синхронизирован с `.env.example` (DATABASE_URL, DIRECT_URL, AUTH_SECRET, NEXTAUTH_URL, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, BLOB_READ_WRITE_TOKEN, CRON_SECRET — все placeholders).
- [x] `public/manifest.webmanifest` (валидный, ru, dark theme_color) + placeholder PWA-иконки (192/512/maskable/apple-touch — буква W на тёмном фоне с cyan→violet градиентом, сгенерированы через sharp).
- [x] `scripts/hash-password.ts` — bcrypt CLI helper для будущего seed admin user.
- [x] Удалены дефолтные Next.js placeholder SVG из `public/` (file.svg, globe.svg, next.svg, vercel.svg, window.svg).
- [x] `.gitignore` сохранён + расширен (`lib/generated/`).
- [x] `pnpm-workspace.yaml` — `onlyBuiltDependencies` + `allowBuilds` для native postinstall (prisma, sharp, esbuild, unrs-resolver, @tailwindcss/oxide).
- [x] Available checks пройдены: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm prisma format` — все ✓.
- [x] Создан `CODEX-REVIEW-TASK.md` для Bootstrap module
- [x] Codex Pass 1: verdict `With fixes`, 1 Critical (Next 16→15) + 6 Important + 4 Nice-to-have — все обработаны
- [x] Все Critical и Important исправлены, кроме tablet breakpoint (перенесён в Iter 6)
- [x] Codex Pass 2 (focused): verdict `Yes`, 0 Critical / 0 Important / 0 Nice в новом scope
- [x] По ADR-018: третий проход не запускается, модуль accepted
- [x] Commit: `chore: bootstrap next.js project` (`3cec00a`)
- [x] Push в `origin/main` (выполнен; `git ls-remote origin main` = `3cec00a...`, working tree clean)

### Открытые вопросы / TODO для Iteration 1

- **Реальный Neon URL** — подключить `DATABASE_URL` (pooled) и `DIRECT_URL` (direct) до миграций.
- **Prisma 7 migrate с Neon direct connection** — `directUrl` дропнут из `defineConfig().datasource`. Перед первой миграцией подключить driver adapter (`@prisma/adapter-pg` или аналог) либо использовать другой механизм для direct connection. На Bootstrap миграций нет → не блокер.
- **shadcn `form` компонент** отсутствует в новом регистре v4 — RHF + Label/Input/Button напрямую при создании первой формы.
- **PWA Service Worker** — не регистрируется на Bootstrap (Iter 6 scope).

### Перенесено в Iter 6 (mobile polish)

- **Tablet breakpoint (640–1024px) collapsed sidebar 60px** — на Bootstrap sidebar показывается уже с `md` (≥768px) во весь width 240px. Это компромисс. По `UI-DESIGN.md` на tablet должен быть свёрнут в 60px иконки. Перенесено в Iteration 6 (mobile/responsive polish) — приоритет ниже, потому что dev в основном на desktop+mobile.

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
