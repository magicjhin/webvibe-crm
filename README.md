# Webvibe CRM

Личная внутренняя CRM для управления клиентами, лидами, проектами, документами и платежами.
Single-user, PWA-first, Next.js + TypeScript + Tailwind + Prisma + Neon Postgres.

> Это закрытый внутренний проект Webvibe (`webvibe-work/webvibe-crm`).

---

## Стек

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript strict
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **DB:** PostgreSQL @ Neon
- **ORM:** Prisma
- **Auth:** Auth.js v5 (Credentials, single user)
- **Forms:** React Hook Form + Zod
- **PDF:** @react-pdf/renderer
- **Storage:** Vercel Blob (PDF, подписи, файлы)
- **PWA:** ручной manifest + production-only Service Worker
- **Deploy:** Vercel (ручной import через GitHub)

---

> **Статус:** Iteration 1 — Auth + Settings skeleton.
> Auth.js v5 (Credentials), middleware-whitelist, `/settings/profile` форма
> поверх Settings singleton, single-admin user через seed. CRM-модули
> (clients/leads/projects/invoices/contracts/PDF) — Iter 2+.

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 11 (`corepack enable pnpm && corepack prepare pnpm@latest --activate`)
- Neon Postgres-проект (подключение перед Iteration 1)
- Vercel Blob token (нужен начиная с Iteration 4 — PDF / подпись)
- GitHub CLI (`gh`) для пушей в `webvibe-work` organization

---

## Local setup

```bash
# 1. Установить зависимости
pnpm install

# 2. Скопировать env vars и заполнить
cp .env.example .env

# 3. Поля .env:
#    - DATABASE_URL  — Neon pooled connection string (с -pooler. в host)
#    - DIRECT_URL    — Neon direct connection string (без -pooler.)
#    - AUTH_SECRET   — `openssl rand -base64 32`
#    - ADMIN_EMAIL   — твой email для логина
#    - ADMIN_PASSWORD_HASH — bcrypt-хеш пароля:
#                            pnpm tsx scripts/hash-password.ts
#                            (запустит интерактивный prompt без эха)

# 4. Применить миграцию (создаст User + Settings в Neon)
pnpm prisma migrate dev

# 5. Засидить admin user + Settings singleton (id=1)
pnpm tsx prisma/seed.ts

# 6. Запустить dev-сервер
pnpm dev
```

Открыть `http://localhost:3000` — редирект на `/login` (если не залогинен)
или `/dashboard` (если уже сессия). После логина: `/settings/profile`
показывает реальные данные из БД, изменения сохраняются.

### Будущие шаги (Iterations 2+)

CRM-модули (clients / leads / projects / invoices / contracts / PDF /
подпись / maintenance) — следующие итерации, см. `ROADMAP.md` и `TASKS.md`.

---

## Environment variables

См. `.env.example`. Обязательные:

| Переменная | Что это |
|---|---|
| `DATABASE_URL` | Pooled Neon connection string (используется приложением) |
| `DIRECT_URL` | Direct Neon connection (используется Prisma migrate) |
| `AUTH_SECRET` | Случайная строка ≥ 32 символа (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Полный URL приложения (`http://localhost:3000` в dev) |
| `ADMIN_EMAIL` | Email единственного пользователя |
| `ADMIN_PASSWORD_HASH` | bcrypt-хеш пароля (`pnpm tsx scripts/hash-password.ts <password>`) |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob storage |
| `CRON_SECRET` | Случайная строка для защиты cron endpoints |

---

## Команды

```bash
pnpm dev              # dev-сервер
pnpm build            # production build
pnpm start            # production server (после build)
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm prisma studio    # GUI для БД
pnpm prisma migrate dev --name <name>   # новая миграция
```

---

## Структура проекта

```
app/                    # Next.js App Router
  (auth)/login/         # публичная страница login
  (app)/                # protected layout (dashboard, clients, projects, ...)
  sign/[token]/         # публичная страница подписи (без auth)
  api/                  # route handlers (auth, cron, pdf)
components/             # UI (shadcn/ui + проектные компоненты)
lib/                    # бизнес-логика, server actions, validators
prisma/                 # schema.prisma + migrations + seed
public/                 # static assets + PWA manifest и иконки
```

Подробнее — в `ARCHITECTURE.md`.

---

## Документация

| Файл | Зачем |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Жёсткие правила работы Claude в этом проекте |
| [ROADMAP.md](./ROADMAP.md) | MVP / Phase 2 / Future + итерации |
| [TASKS.md](./TASKS.md) | Текущая итерация |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Архитектурные решения |
| [DATABASE.md](./DATABASE.md) | Prisma schema, нумерация, целостность |
| [UI-DESIGN.md](./UI-DESIGN.md) | Design system |
| [WORKFLOW.md](./WORKFLOW.md) | Пользовательские сценарии |
| [DECISIONS.md](./DECISIONS.md) | ADR-лайт: «почему так, а не иначе» |
| [CODEX-REVIEW-TEMPLATE.md](./CODEX-REVIEW-TEMPLATE.md) | Шаблон для Codex review |

---

## Review and delivery workflow

Проект использует обязательный **Codex review loop** после каждого модуля.

Каждый модуль должен пройти:

1. **Implementation.**
2. **`CODEX-REVIEW-TASK.md`** (по шаблону `CODEX-REVIEW-TEMPLATE.md`).
3. **Codex review** через `codex exec`.
4. **`REVIEW-CODEX.md`** создаётся Codex'ом.
5. **Critical fixes** — обязательно.
6. **Available checks** — `typecheck`, `lint`, `build` (те, что уже есть).
7. **Commit** — Conventional Commits, прямо в `main`.
8. **Push** в `origin/main` — это checkpoint для отката.

Команда Codex review:

```bash
codex exec --cd . --sandbox workspace-write --output-last-message CODEX-LAST-OUTPUT.md \
  "Прочитай CODEX-REVIEW-TASK.md и выполни независимое ревью. Создай REVIEW-CODEX.md. Не меняй другие файлы проекта."
```

Подробности — в `CLAUDE.md` (разделы Codex review workflow и GitHub checkpoint workflow)
и в `DECISIONS.md` (ADR-015 и ADR-016).

---

## Deploy на Vercel (вручную)

GitHub repo подключается к Vercel **вручную через Dashboard**:

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. **Import Git Repository** → `webvibe-work/webvibe-crm`
3. Framework Preset: Next.js (определится автоматически)
4. **Environment Variables** — добавить все переменные из `.env.example`
5. Build settings оставить по умолчанию
6. **Deploy**

Дальше:
- Подключить Neon к Vercel project (Storage → Connect)
- Создать Vercel Blob store, скопировать `BLOB_READ_WRITE_TOKEN` в env
- Настроить custom domain (если нужен)

Никаких автоматических deploy команд из репозитория не запускается.

---

## License

Private, all rights reserved. Webvibe.
