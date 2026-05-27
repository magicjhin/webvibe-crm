# Codex Review Task — [Module Name]

> Шаблон для `CODEX-REVIEW-TASK.md`. Скопировать содержимое, заполнить плейсхолдеры,
> сохранить как `CODEX-REVIEW-TASK.md` в корне проекта, запустить `codex exec`.

---

## Context

Кратко: какой модуль реализован и зачем.

## Implemented scope

Что было сделано в этом модуле (bullets).

## Files to review

Список файлов, которые Codex обязан проверить. Указывать относительные пути.

- `path/to/file1.ts`
- `path/to/file2.tsx`
- ...

## Project docs to compare against

- `CLAUDE.md`
- `TASKS.md`
- `ROADMAP.md`
- `ARCHITECTURE.md`
- `DATABASE.md`
- `UI-DESIGN.md`
- `WORKFLOW.md`
- `DECISIONS.md`
- `README.md`

(Удалить те, что нерелевантны для конкретного review.)

## Related TASKS.md items

Ссылки на пункты из текущей итерации `TASKS.md`, которые этот модуль закрывает.

## Expected behavior

Как должен вести себя модуль с точки зрения пользователя или системы.

## Review focus

Codex должен проверить (оставить релевантные пункты, удалить нерелевантные):

- соответствие `TASKS.md`
- соответствие `ROADMAP.md`
- соответствие `ARCHITECTURE.md`
- соответствие `DATABASE.md`
- соответствие `UI-DESIGN.md`
- соответствие `WORKFLOW.md`
- TypeScript safety (`strict`, `any`-free, `Decimal` для денег)
- server vs client component boundaries
- Prisma / database correctness, индексы, cascade
- server actions / API logic, `Result<T>` pattern
- Zod validation на клиенте и на сервере
- auth / security (auth() check, cron secret, sign token hash + TTL + one-time use)
- responsive / mobile behavior (touch targets, bottom sheets, FAB)
- PWA impact (manifest, SW production-only, offline shell), если применимо
- PDF / signature logic (литовский, без PVM, runtime nodejs, maxDuration), если применимо
- GitHub checkpoint workflow (если затронут), commit hygiene
- edge cases
- unnecessary complexity / over-engineering
- bugs or incomplete implementation
- противоречия между документами

## Output required

Codex должен создать `REVIEW-CODEX.md` со следующей структурой:

```markdown
# Codex Review — [Module Name]

## Verdict
Can this module be accepted? Yes / No / With fixes.

## Critical issues
Блокеры. Список конкретных проблем с файлами и строками.

## Important issues
Важные правки, не блокеры, но желательно исправить до закрытия модуля.

## Nice-to-have
Необязательные улучшения.

## File-by-file review
Проверка каждого изменённого файла из "Files to review".

## Architecture consistency
Соответствие архитектуре и project docs.

## Security / validation review
Безопасность, валидация, токены, auth.

## UI / mobile review
Если применимо.

## PWA review
Если применимо.

## PDF / documents review
Если применимо.

## GitHub checkpoint review
Если применимо (commit hygiene, push readiness).

## Final checklist
Что нужно исправить перед закрытием задачи. Чек-лист.
```

## Constraints

- Codex **может создавать / изменять только** `REVIEW-CODEX.md` и `CODEX-LAST-OUTPUT.md`.
  Любые другие файлы проекта Codex не должен трогать. (`CODEX-LAST-OUTPUT.md` пишется
  самим CLI через `--output-last-message`.)
- Codex **не должен** запускать `pnpm install`, `prisma migrate`, `git`, `gh`, или любые команды,
  изменяющие состояние проекта или внешних систем.
- Codex **может** читать любые файлы проекта для контекста.
- Codex **не должен** предлагать решения, противоречащие `DECISIONS.md` (особенно ADR-002 single-user, ADR-007 без PVM, ADR-014 язык документов, ADR-016 push после каждого модуля).
