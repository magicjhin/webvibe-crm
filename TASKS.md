# TASKS — Текущая итерация

Живой список задач прямо сейчас. После завершения итерации — обновлять.
Полный план итераций — в `ROADMAP.md`.

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
- [ ] `git init` + первый коммит `chore: add project planning docs`
- [ ] Проверить `gh auth status`, доступ к `webvibe-work`
- [ ] Создать private repo `webvibe-work/webvibe-crm` через `gh repo create`
- [ ] Push в GitHub

---

## Следующая: Итерация 0 — Bootstrap (ждёт подтверждения)

> Запускается **только после подтверждения**. Сейчас ничего не устанавливаем.

- [ ] `pnpm create next-app .` — TS, Tailwind, App Router, ESLint, src/ — нет, pnpm — да
- [ ] Установить core deps:
      `pnpm add @prisma/client zod react-hook-form @hookform/resolvers
       next-auth@beta @auth/prisma-adapter bcryptjs date-fns
       @tanstack/react-table @react-pdf/renderer react-signature-canvas
       @vercel/blob lucide-react decimal.js clsx tailwind-merge
       class-variance-authority`
- [ ] Установить dev deps:
      `pnpm add -D prisma tsx @types/bcryptjs`
- [ ] `pnpm dlx shadcn@latest init` — neutral, slate, CSS variables
- [ ] Добавить базовые shadcn компоненты: `button input label dialog sheet table form select textarea badge card dropdown-menu`
- [ ] Tailwind tokens — цвета, шрифты, радиусы из `UI-DESIGN.md`
- [ ] `app/layout.tsx` + `app/globals.css` + dark theme базовая
- [ ] `components/layout/AppShell.tsx` (визуальный скелет, без auth)
- [ ] `prisma/schema.prisma` — пустая с datasource + generator
- [ ] `public/manifest.webmanifest` + базовые иконки 192/512/maskable (плейсхолдеры)
- [ ] Commit: `chore: bootstrap project`

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
