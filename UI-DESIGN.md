# UI-DESIGN — Webvibe CRM

Design system. Эстетика: премиальный SaaS dashboard (Linear / Vercel / Raycast),
с авторскими акцентами Webvibe.

---

## Принципы

1. **Dark-first.** Light тема — приятный бонус, не приоритет.
2. **Функциональные анимации.** Никаких декоративных движений.
3. **Числа важнее слов.** Цифры — tabular, читаемые, выделенные.
4. **Mobile-first для критичных flows.** Создать клиента, выставить счёт, подписать — всё это должно быть удобно с телефона.
5. **Пустота — это состояние.** Empty / loading / error — отдельные дизайны, не «No data».
6. **Тишина по умолчанию.** Никаких хвалебных тостов «Успешно сохранено!». Только важные.
7. **Один акцент.** Один accent gradient, не радуга.

---

## Цвета (CSS variables в `globals.css`)

```css
:root {
  /* Surfaces */
  --background: 240 10% 4%;         /* #0A0A0B */
  --background-elevated: 240 8% 7%; /* #111114 */
  --background-overlay: 240 6% 10%; /* #18181D */

  /* Borders */
  --border: 240 6% 14%;             /* #222226 */
  --border-strong: 240 6% 22%;      /* #35353B */

  /* Foreground */
  --foreground: 0 0% 98%;
  --foreground-muted: 240 5% 65%;
  --foreground-subtle: 240 5% 45%;

  /* Accent (Webvibe gradient) */
  --accent-from: 192 95% 60%;       /* cyan */
  --accent-to: 270 90% 65%;         /* violet */
  --accent-solid: 220 90% 60%;      /* fallback solid */
  --accent-ring: 220 90% 60% / 0.4;

  /* Semantic */
  --success: 142 70% 45%;
  --warning: 38 92% 55%;
  --danger: 0 72% 55%;
  --info: 210 90% 60%;

  /* Status badges (muted versions) */
  --status-draft: 240 5% 50%;
  --status-active: 142 50% 50%;
  --status-pending: 38 80% 55%;
  --status-paid: 142 70% 45%;
  --status-overdue: 0 72% 55%;
  --status-cancelled: 240 5% 40%;

  /* Radii */
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
}

[data-theme="light"] {
  --background: 0 0% 100%;
  --background-elevated: 240 20% 98%;
  --background-overlay: 240 15% 96%;
  --border: 240 10% 90%;
  --border-strong: 240 10% 80%;
  --foreground: 240 10% 8%;
  --foreground-muted: 240 5% 40%;
  --foreground-subtle: 240 5% 60%;
}
```

**Gradient accent** (для KPI и primary CTA):
```css
background: linear-gradient(135deg,
  hsl(var(--accent-from)) 0%,
  hsl(var(--accent-to)) 100%);
```

Использовать **точечно**: primary button hover, KPI большие цифры, focus ring на важных полях, иконка активного nav item.
**Не** заливать им большие площади.

---

## Типографика

- **UI:** Inter (через `next/font/google`), weights 400, 500, 600, 700.
- **Mono:** Geist Mono — для чисел, IDs, сумм.
- **Numbers:** всегда `font-variant-numeric: tabular-nums`.
- **Display (KPI):** Inter 600, font-size 32–48, letter-spacing -0.02em.

Шкала размеров (Tailwind):
- `text-xs` 12 — лейблы таблиц, мета
- `text-sm` 14 — основной текст UI
- `text-base` 16 — формы
- `text-lg` 18 — заголовки секций
- `text-2xl` 24 — заголовки страниц
- `text-4xl` 36 — KPI display

---

## Spacing

- Base 4px.
- Стандартные значения: 4, 8, 12, 16, 24, 32, 48.
- Card padding: 24 (16 на mobile).
- Page padding: 24 (16 на mobile).
- Form gap: 16 между полями, 8 между label и input.

---

## Радиусы

- Buttons / inputs: `--radius` (10px)
- Cards / panels: `--radius-lg` (14px)
- Dialogs / sheets: `--radius-xl` (18px)
- Badges: `--radius-sm` (6px)

---

## Тени

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
--shadow-md: 0 4px 12px rgba(0,0,0,0.4);
--shadow-lg: 0 12px 32px rgba(0,0,0,0.45);
--shadow-glow-accent: 0 0 0 1px hsl(var(--accent-solid) / 0.3),
                      0 8px 24px hsl(var(--accent-solid) / 0.15);
```

`shadow-glow-accent` — только на primary CTA и активных focus ring.

---

## Компоненты

### shadcn/ui — обязательный baseline

Копируем в `components/ui/`:
`button input label select textarea checkbox radio-group switch
dialog sheet drawer popover tooltip toast (sonner)
form table dropdown-menu command badge card tabs separator
skeleton scroll-area`

### Проектные компоненты (поверх shadcn)

| Компонент | Назначение |
|---|---|
| `<MoneyDisplay value={...} currency="EUR" />` | tabular-nums, format `1 234,56 €` (lt-LT) — **Iter 3** |
| `<DateDisplay date={...} format="short\|long\|relative" />` | формат через date-fns, локаль lt — **Iter 2** |
| `<StatusBadge kind="invoice\|project\|task\|..." value="..." />` | приглушённый pill с цветной точкой — **Iter 2+** |
| `<EmptyState icon title description action />` | для пустых списков — **Iter 2** |
| `<DataTable />` | TanStack + фильтры + сортировка + пагинация — **Iter 2** |
| `<PageHeader title actions />` | breadcrumbs + actions row — **Iter 2** |
| `<KpiCard label value delta />` | KPI карточка dashboard — **Iter 3** |
| `<QuickAddFab />` | FAB на mobile (skeleton уже в AppShell, логика — Iter 6) |
| `<Field id label hint? error? required? />` ✅ | shadcn `form` отсутствует в v4 → собственный wrapper Label+control+error с `aria-invalid` + `aria-describedby` через `cloneElement`. Реализован в Iter 1 |
| `<UserBadge name email />` ✅ | W-инициал на accent gradient + email на ≥sm. Iter 1 |
| `<SignOutButton />` ✅ | Server-action form. Iter 1 |
| `<LoginForm />` ✅ | RHF+Zod+server action+toast. Iter 1 |
| `<SettingsForm initial />` ✅ | RHF+Zod, live numbering preview через `useWatch`. Iter 1 |
| `<ComingSoon name iteration />` ✅ | Placeholder в AppShell для будущих routes. Iter 0 |

---

## Status badges

Не «светофор», а приглушённые pills с цветной точкой:

```
●  Draft        (gray)
●  Sent         (blue)
●  Paid         (green)
●  Overdue      (red)
●  Cancelled    (muted gray)
●  In progress  (yellow)
```

Реализация:
```
<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md
             text-xs font-medium bg-background-elevated border border-border">
  <span class="size-1.5 rounded-full bg-{status-color}" />
  Draft
</span>
```

---

## Empty / loading / error states

**Каждый список** должен иметь все три состояния.

### Empty
- Иконка lucide (subtle, 32px)
- Title (text-base font-semibold)
- Description (text-sm muted)
- Optional CTA button

### Loading
- Skeleton с теми же размерами, что и реальный контент
- Анимация `animate-pulse` Tailwind

### Error
- Иконка `AlertCircle` (warning color)
- Title `Не удалось загрузить`
- Description + кнопка `Retry`

---

## Layout

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar (60px)                                                 │
├─────────┬────────────────────────────────────────────────────┤
│         │                                                    │
│ Sidebar │  Main content (max-w-7xl, mx-auto, px-6)           │
│  240px  │                                                    │
│         │                                                    │
└─────────┴────────────────────────────────────────────────────┘
```

Sidebar:
- Logo Webvibe сверху
- Nav: Dashboard, Clients, Leads, Projects, Documents, Payments, Expenses, Maintenance, Reminders, Settings
- Активный item — accent gradient на левом edge (2px) + цвет иконки

### Tablet (640–1024px)

- Sidebar коллапсируется в иконки (60px)
- Hover показывает popover label

### Mobile (< 640px)

```
┌──────────────────────────┐
│ Topbar (50px)             │
├──────────────────────────┤
│                          │
│      Main content        │
│                          │
│   ...                    │
│                          │
├──────────────────────────┤
│ ▣ Dashboard              │
│ 🏠 Projects | 👤 Clients  │
│ 📄 Docs    | ⋯ More      │
└──────────────────────────┘
   Bottom tab bar (64px)
```

- Bottom tab bar — 5 пунктов: Dashboard, Projects, Clients, Documents, More
- `QuickAddFab` справа над bottom bar
- Все Dialog'и автоматически становятся Sheets с `side="bottom"`

---

## Mobile rules

- Touch target ≥ 44×44 px.
- Form inputs `font-size: 16px` минимум (избегаем zoom на iOS).
- Bottom sheets с safe-area-inset-bottom.
- Sticky header при скролле длинной формы.
- FAB — accent gradient, position `fixed bottom-20 right-4`.
- Swipe-to-close на bottom sheets.
- Кнопка «Share PDF» → `navigator.share({ files: [...] })`.

---

## Animations

Только функциональные, через Framer Motion:

| Где | Что |
|---|---|
| Sheet / Dialog | spring fade + slide (200ms) |
| List row insert | fade + slight Y translate (150ms) |
| Tab switch | crossfade (120ms) |
| Toast | slide-in от bottom (200ms) |
| FAB | scale tap feedback (80ms) |

**Не используем:** scroll-driven animations, parallax, particle effects, hover «дискотек».

---

## Accessibility (минимум для MVP)

- Focus ring видимый везде (accent ring).
- Все интерактивные элементы доступны с клавиатуры.
- Forms: `label` связан с `input` через `htmlFor`/`id` (или wrapped).
- Цвет не единственный сигнал статуса (плюс текст или точка-иконка).
- Контраст текста vs фон ≥ 4.5:1 для основного, ≥ 3:1 для muted.
- `aria-label` на иконках-кнопках.
- `prefers-reduced-motion` — отключаем анимации.

---

## PDF design (отдельная visual система)

Документы PDF — **light**, независимо от темы UI:
- Белый фон, чёрный текст.
- Inter / system serif fallback (PDF-friendly).
- Логотип Webvibe сверху.
- Аккуратные таблицы строк счёта.
- Подпись внизу (изображение PNG из подписи или моя сохранённая).
- Footer с реквизитами из Settings.
- Сумма крупно, справа, моноширинно.
- Метка `"Suma be PVM"` мелким шрифтом, если применимо.

Без декоративных графических элементов. Документ должен быть деловым.
