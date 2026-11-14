# Flowtax Design System

Reference for the tokens, patterns and components used in the Flowtax prototype.
Source of truth in code: [src/index.css](src/index.css) (tokens) and [src/components/](src/components/) (components). Values originate from the Figma file **V2 - Prototype**.

- **Stack:** React 19, TypeScript, Tailwind CSS v4 (`@theme` tokens), Vite, Zustand, lucide-react
- **Import alias:** `@/` → `src/`
- **Theme:** light only (`color-scheme: light`)

---

## 1. Foundations

### 1.1 Typography

| Token | Value | Use |
|---|---|---|
| `--font-sans` | DM Sans, system fallbacks | Default body/UI font |
| `--font-heading` | Open Sans (600), system fallbacks | Headings |

Fonts load from Google Fonts in [index.html](index.html) (DM Sans 400/500/600, Open Sans 600). Optical sizing is on; text is antialiased.

**Type scale (as used in the app)**

| Class | Typical use |
|---|---|
| `text-[10px] leading-3` | Helper text (e.g. supported formats) |
| `text-xs leading-4` | Pills, captions, secondary meta, "Ask Ai" label |
| `text-sm leading-5` | **Default UI text** – buttons, inputs, nav, table cells |
| `text-base leading-[22px] tracking-[-0.18px] font-medium` | Page title / breadcrumb |
| `text-xl leading-6 font-medium` | Modal titles |
| `text-2xl` | Large display numbers/headings |

Weights: `400` body, `500` (`font-medium`) labels/titles/nav, `600` (`font-semibold`) active tab and inline links.
Use the `.tnum` utility (`font-variant-numeric: tabular-nums`) for numeric columns.

### 1.2 Color

Palette: **forest green** primary (`#1B4D3E`), **cream** light support colors (`#FEFAE0` family), **sage** tints, and warm green-tinted neutrals. Tokens live in `@theme` in [src/index.css](src/index.css) — always use the token, never the hex.

**Brand**

| Token | Value | Use |
|---|---|---|
| `brand` | `#1b4d3e` | Primary actions, links, active tab, focus ring |
| `brand-bar` | `#153d31` | Deeper green for brand surfaces |
| `brand-soft` | `rgba(27,77,62,.09)` | Active nav item, hover tint, avatar chip |
| `brand-border` | `#b9d0c5` | Green-tinted borders |
| `ai-border` | `#2f6f5a` | "Ask Ai" button border |
| `on-brand` | `#fefae0` | Cream text/icons on green fills |

**Cream & sage (light supports)**

| Token | Value | Use |
|---|---|---|
| `cream` | `#fefae0` | Accent only (text on green) — avoid on large surfaces |
| `surface-grey` | `#fefdf7` | Sidebars, rails, hover backgrounds (light cream) |
| `cream-deep` | `#f6efc4` | Stronger cream accents |
| `sage` | `#dfe9df` | Soft green fills |
| `sage-deep` | `#c4d7c9` | Sage borders / emphasis |
| `nav-active` | `#f9f6e6` | Active rail / client-panel item |
| `section` | `#fcfaf0` | Section header bands |
| `banner` | `#f4efcf` | Prep banner |

**Neutrals**

| Token | Value | Use |
|---|---|---|
| `fg` | `#16211c` | Primary text |
| `muted` | `#6b7068` | Secondary text, inactive nav |
| `slate` | `#5b665f` | Tertiary text |
| `sidebar-fg` / `sidebar-accent` | `#2c3a33` / `#10261e` | Sidebar text; toast background |
| `axis` | `#75786f` | Chart axis labels |
| `line` | `#ecead9` | Borders, dividers |
| `grid` | `#f3f1e7` | Chart gridlines |
| `surface` | `#ffffff` | Page / card / modal |
| `surface-muted` | `rgba(246,244,230,.6)` | Muted panels |

**Semantic & status**

| Token | Value | Use |
|---|---|---|
| `destructive` | `#d92d20` | Required asterisk, errors, delete |
| `cell-filled` | `#d3e8da` | Worksheet value pulled from a document |
| `cell-empty` | `#f3efd6` | Worksheet value needing preparer input |
| `tag` | `rgba(168,203,184,.6)` | Tag chips |

| Status | bg | fg |
|---|---|---|
| Draft | `#edebdf` | – |
| Invited / Pending | `#fff8e1` | `#8a5a00` |
| Pending (orange) | `#fff1e6` | `#c2570c` |
| Review | `#e8f0fa` | `#1f4e8c` |
| Prep / Validated | `#e3f1e8` | `#1b6b47` |
| Rejected | `#fdeeee` | `#b42318` |

**AI accent:** `--ai-gradient` (cream → sage → green wash) for the Ask Ai pill and `--ai-bar` (green → mint → gold) for loading bars, both defined on `:root`.

SVG icons and the logo in `src/assets/` were recolored to match (green brand, `#6b7068` muted strokes).

### 1.3 Spacing & layout

Tailwind's 4px scale. Common values: `gap-1/2/3`, `px-2` (compact), `px-3` (inputs), `px-4` (cards/modals), `px-6` (top bars).

| Region | Size |
|---|---|
| Main sidebar (dashboard shell) | 220px wide (≥ `md`), stacks on top below `md` |
| V2 icon rail | 55px wide, hidden below `md` |
| Client panel | 200px wide (≥ `md`) |
| Client switcher / row height | 48px / 36px |
| Top bar | sticky, `z-20`, `px-6 py-3`, bottom border |

Breakpoint: **`md` (768px)** is the single responsive switch – vertical sidebars become horizontal strips.

### 1.4 Radius, borders, elevation

| Token | Use |
|---|---|
| `rounded` (4px) | Nav items, small icon buttons |
| `rounded-md` (6px) | **Default** – buttons, inputs, modals, popovers |
| `rounded-lg` | Toast, avatar chip |
| `rounded-full` | Switch, badges |
| `rounded-[31px]` | AI pill |

Borders are always 1px `line` unless stated. Shadows: modal `0 10px 30px rgba(0,0,0,.12)`, popover `shadow-lg`, toast `shadow-lg`.

### 1.5 Z-index

`z-20` sticky top bars · `z-30` dropdowns/popovers · `z-50` modals · `z-[60]` toasts.

### 1.6 Motion & accessibility

- Transitions are minimal (`transition-colors`, switch knob `left`). All transitions are disabled under `prefers-reduced-motion: reduce`.
- Global focus ring: `:focus-visible { outline: 2px solid brand; outline-offset: 2px }`.
- Icon-only controls must have `aria-label`; decorative `<img>` icons use `alt=""`.

---

## 2. Iconography

- **Custom SVGs** exported from Figma in `src/assets/` – `icons/` (16px app icons), `v2/` and `ws/` (client workspace rail/nav), `logo/` (wordmark layers).
- Central registry: [src/components/icons.ts](src/components/icons.ts) exports `icons` (`add`, `bellDot`, `calendarPlus`, `chevronsUpDown`, `clock`, `clockActive`, `download`, `ellipsis`, `info`, `navClients`, `navDashboard`, `navSettings`, `navWorkspace`, `search`, `star`, `tag`, `user`).
- **lucide-react** is used for utility glyphs (e.g. `X` in modals).
- Standard size: `size-4` (16px); drag/drop art `size-6`.

```tsx
<img alt="" src={icons.search} className="size-4" />
```

---

## 3. Components

### 3.1 Button — [Button.tsx](src/components/Button.tsx)

Figma "Button" (shadcn-based). 28px tall, 6px radius.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `"primary" \| "outline"` | `"primary"` | primary = `bg-brand`, outline = bordered, `text-muted` |
| `icon` | `string` (svg url) | – | Rendered 16px before label |
| `className` | `string` | – | Appended |
| …`ButtonHTMLAttributes` | | | `type` defaults to `"button"` |

States: hover (`brand/90` or `surface-grey`), `disabled` → 50% opacity + `not-allowed`. Min width 64px.

```tsx
<Button onClick={save}>Save</Button>
<Button variant="outline" icon={icons.add}>Add client</Button>
```

### 3.2 Tabs — [Tabs.tsx](src/components/Tabs.tsx)

Generic underline tabs: `<Tabs<T> tabs value onChange label />`.
Active = `brand`, semibold, 2px bottom rule; inactive = `muted`, medium, hover `fg`. Min tab width 70px, height 28px. Renders `role="tablist"` / `role="tab"` with `aria-selected`; `label` is the tablist's `aria-label`.

### 3.3 Sidebar — [Sidebar.tsx](src/components/Sidebar.tsx)

220px app navigation: logo, nav list (Dashboard, Workspace, Clients, Settings), user card at bottom (hidden below `md`). Active item: `bg-brand-soft text-sidebar-accent` + `aria-current="page"`; inactive: `text-muted`, hover `brand-soft/60`. Nav items are hash links (`#dashboard`, …).

### 3.4 TopBar — [TopBar.tsx](src/components/TopBar.tsx)

Sticky page header: title (`text-base`, medium) on the left; **Ask Ai** pill and notification bell on the right.

### 3.5 Logo — [Logo.tsx](src/components/Logo.tsx)

109 × 25 flowtax wordmark composed from masked SVG layers positioned per the Figma "Logo Container". `role="img"` `aria-label="flowtax"`. Don't resize with CSS – scale via a wrapper transform. A 23.7 px mark-only variant (`LogoMark`) lives in ClientShell.

### 3.6 `ui.tsx` primitives — [ui.tsx](src/components/ui.tsx)

| Export | Description |
|---|---|
| `StatusPill({ status })` | Checklist item status chip, 23px tall, `rounded-md`, `text-xs`. Maps `Pending` → invited colors, `Needs Review` → review, `Validated` → prep/green, `Rejected` → rose. |
| `Modal({ title, description?, onClose, children, footer?, width = 520 })` | Centered dialog on `bg-fg/20` scrim. 16px padding, 6px radius, footer separated by a top border and right-aligned. Closes on Esc, scrim click, or the ✕ button. Autofocuses first input/select/textarea/button. `role="dialog"` `aria-modal`. |
| `Toast()` | Reads `toast` from the engagement store; dark pill (`sidebar-accent`) centered at bottom, auto-dismisses after 3.6s. `role="status"`. |
| `usePopover(open, onClose)` | Hook returning a ref; closes on outside mousedown or Esc. Use for dropdowns/menus. |
| `inputCls` | Shared class string for text inputs: 40px tall, `rounded-md`, `border-line`, `px-3`, `text-sm`, focus → `border-brand`. |
| `Label({ children, required?, htmlFor? })` | Form label (`text-sm` medium) with red `*` when `required`. |
| `Switch({ checked, onChange, id? })` | 36×20 toggle, `role="switch"`; on = `brand`, off = `line`. |

```tsx
<Modal title="Invite client" onClose={close} footer={<Button onClick={send}>Send</Button>}>
  <Label htmlFor="email" required>Email</Label>
  <input id="email" className={inputCls} />
</Modal>
```

### 3.7 Client workspace shell — [client/ClientShell.tsx](src/components/client/ClientShell.tsx)

Layout for a single client: **Rail (55px) → ClientPanel (200px) → main**.

- **Rail** – icon-only nav (Dashboard, Workspace, Inbox with count badge, Team, Files) + user chip.
- **ClientSwitcher** – 48px dropdown listing all clients (uses `usePopover`); current client highlighted in `brand`.
- **ClientPanel** – Checklist / Worksheet section nav + dashed-border drag-and-drop upload zone (pdf, jpeg, png).
- **ClientTopBar** – breadcrumb `Workspace / {client}` + Ask Ai + bell.

### 3.8 Page-local patterns

These are defined inside page files and are candidates to promote into shared components if reused:

| Pattern | File | Notes |
|---|---|---|
| `Field`, `Select`, `Section`, `Dropzone`, `BuildingModal` | [pages/NewClient.tsx](src/pages/NewClient.tsx) | Form field with error text, native select, titled form section, file drop target, progress modal |
| `Checkbox` | [pages/Workspace.tsx](src/pages/Workspace.tsx) | Labeled checkbox |
| `CardTitle`, `ClientStatusChart` | [pages/Dashboard.tsx](src/pages/Dashboard.tsx) | Card heading with optional info icon; bar chart (axis max 20, plot height 172px) |
| `RemindersFields`, `Comments`, `RowMenu`, `RequestModal`, `InviteModal`, `MiniSwitch`, `Questionnaire` | [pages/client/Checklist.tsx](src/pages/client/Checklist.tsx) | Checklist workflow pieces |
| `Cell`, `Row`, `Checks`, `Person`, `Section` | [pages/client/Worksheet.tsx](src/pages/client/Worksheet.tsx) | Tax-form worksheet. Cells: `cell-filled` (green) = extracted from doc, `cell-empty` (cream) = needs input |
| `ReviewDoc` | [pages/client/ReviewDoc.tsx](src/pages/client/ReviewDoc.tsx) | Document review with reject-reason list |
| `FocusHeader`, `AddClientSwitch` | [components/addClient/FocusHeader.tsx](src/components/addClient/FocusHeader.tsx) | Full-screen flow top bar (no sidebar): close · title · path switch (filter-chip style) · step indicator |
| Import review table | [pages/ImportClients.tsx](src/pages/ImportClients.tsx) | Follows the Team table: `rounded-md border`, `bg-surface-muted` header, 44px rows, 23px status pills, 40px selects |

> Note: `Select`/`Section` in NewClient and `Section` in Worksheet share a name but are separate implementations.

---

## 4. Domain status model

| Type | Values | Defined in |
|---|---|---|
| `ClientStatus` | Draft · Client Invited · Pending Docs · Prep Started · Ready for Review · Approved · Pushed | [mocks/clients.ts](src/mocks/clients.ts) — colours in [lib/workflow.ts](src/lib/workflow.ts) `STAGES` |
| `ItemStatus` | Pending · Needs Review · Validated · Rejected | [mocks/checklists.ts](src/mocks/checklists.ts) |

Always render these through the status color pairs in §1.2 rather than ad-hoc colors.

---

## 5. Usage guidelines

1. **Use tokens, not hex.** `text-muted`, `bg-surface-grey`, `border-line` – never raw colors. Add new colors to `@theme` in `index.css`.
2. **Reuse before creating.** Check `ui.tsx` and `Button.tsx` first; extend with a prop rather than copying classes.
3. **Default sizes:** 14px text, 16px icons, 40px inputs, 28px buttons, 6px radius.
4. **One primary button per view/modal footer**; secondary actions use `outline`.
5. **Required fields** use `<Label required>`; show errors in `destructive` under the field.
6. **Keyboard & a11y:** overlays close on Esc; keep `aria-label` on icon-only buttons; preserve the focus ring.
7. **Responsive:** design mobile-first and switch layout at `md`.

## 6. Known gaps / suggested cleanup

- `--font-heading` (Open Sans) is defined but headings currently inherit DM Sans.
- `Button` supports only `primary` / `outline`; no destructive, ghost, or size variants yet.
- `Checkbox`, `Field`, `Select`, `Section` are duplicated per page; move to `components/`.
- No dark theme.
