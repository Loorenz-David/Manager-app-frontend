# PLAN_core_colors_20260521

## Metadata

- Plan ID: `PLAN_core_colors_20260521`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T10:16:11Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- **Goal**: Replace the current warm-toned color palette with a neutral gray system. Redefine all CSS custom properties in `index.css`, add two new tokens (`card`, `icon`), remove the `input` token, and update every primitive, shell component, and feature field that references a token whose semantic meaning has shifted.
- **Business/user intent**: Establish a clean, neutral visual foundation (#F4F4F4 background, #FFFFFF cards, #303030 primary + text, #D0D3D9 borders, #8E8E8E icons, #6E7785 sub-text/labels) that will be used consistently across the entire app going forward.
- **Non-goals**: No layout changes. No new components. No changes to animation, routing, or business logic. No changes to `--color-destructive`.

## Scope

- **In scope**:
  - `src/index.css` — redefine `@theme` block
  - `src/components/primitives/input/TextInput.tsx`
  - `src/components/primitives/textarea/TextArea.tsx`
  - `src/components/primitives/date/DateFieldTrigger.tsx`
  - `src/components/primitives/date/DateRangeFieldTrigger.tsx`
  - `src/components/primitives/switch/SwitchCheckbox.tsx`
  - `src/components/primitives/box-picker/box-picker.variants.ts`
  - `src/components/primitives/staged-form/StagedFormTimeline.tsx`
  - `src/components/shell/BottomTabBar.tsx`
  - 18 feature field component files (label + select/trigger bg where applicable — see Step 4)

- **Out of scope**:
  - `src/components/primitives/shared/primitive-base.ts` — `FOCUS_WITHIN_RING` uses `primary` and `destructive` tokens; both remain valid after the token value changes. No edit required.
  - `src/components/surfaces/` — surfaces use `bg-background`, `bg-muted` (hover), `bg-muted-foreground/30` (drawer handle); all automatically correct after token redefinition.
  - `src/components/ui/` skeletons — `bg-muted` shimmer; automatically correct after token redefinition.
  - `src/app/AppShell.tsx`, `src/main.tsx`, pages — `bg-background` and `bg-primary` indicator; automatically correct.
  - `src/components/primitives/date/DayCalendar.tsx` — `bg-muted` hover + `text-muted-foreground` for out-of-month/disabled day cells; automatically correct after token redefinition.

- **Assumptions**:
  - Tailwind v4 with `@theme` block. Custom color properties are available as `bg-*`, `text-*`, `border-*` utilities automatically — including `bg-card`, `text-card`, `bg-icon`, `text-icon`, `text-border`.
  - `muted` and `border` share the same hex value (`#D0D3D9`). This is intentional — they remain semantically distinct (fill vs edge) but happen to be visually identical in this palette.
  - `primary` becomes `#303030`. `text-white` on primary buttons continues to provide sufficient contrast.
  - The `--color-input` token is removed entirely. No file should reference `bg-input` after this plan. Three files use it as a raw background (text/textarea/select/date wrappers) — those switch to `bg-transparent`. One file uses it as a solid white fill (switch thumb) — that switches to `bg-card`.

## Clarifications required

None — all decisions are resolved.

## Acceptance criteria

1. `index.css @theme` block contains exactly the seven tokens listed in Step 1 with the specified hex values. `--color-input` is absent.
2. No file in `src/` references `bg-input` (zero matches from `rg "bg-input" src/`).
3. No file in `src/` references `bg-neutral-900` or `border-neutral-900` (zero matches from `rg "neutral-900" src/`).
4. `npm run typecheck` passes with zero errors.
5. `npm run build` passes.
6. Visual spot-check (dev server):
   - App background is `#F4F4F4` (warm tone gone).
   - BoxPicker unselected options show white (`#FFFFFF`) card background; selected options are dark gray (`#303030`) with white text.
   - Input and textarea wrappers have transparent background; border color is `#D0D3D9`; placeholder text is `#D0D3D9`.
   - Field labels ("Name", "Fulfillment method", etc.) render in `#6E7785`.
   - Timeline step separator `›` and date field calendar icon render in `#8E8E8E`.
   - Inactive tab bar items (icon + label) render in `#8E8E8E`.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: primitives stay in `components/primitives/`; no feature imports into primitives
- `architecture/07_components.md`: named exports; one public component per file; no nested component definitions
- `architecture/14_styling.md`: Tailwind + `cva` + `cn()` only; no inline style for color tokens

### File read intent — pattern vs. relational

**Permitted relational reads (to locate exact line before editing):**
- Read each file before editing to confirm exact string content (required by Edit tool)

**Prohibited:**
- Reading any file outside this plan's scope to understand patterns — contracts already define them

### Skill selection

- Primary skill: none — mechanical token substitution with no ambiguity

---

## Implementation plan

### Step 1 — `src/index.css`: redefine `@theme` block

Replace the entire `@theme { ... }` block with:

```css
@theme {
  --color-background: #F4F4F4;
  --color-foreground: #303030;
  --color-card: #FFFFFF;
  --color-muted: #D0D3D9;
  --color-muted-foreground: #6E7785;
  --color-primary: #303030;
  --color-border: #D0D3D9;
  --color-icon: #8E8E8E;
  --color-destructive: #c0392b;
}
```

`--color-input` is removed. `--color-card` and `--color-icon` are new.

---

### Step 2 — `src/components/primitives/input/TextInput.tsx`: 3 changes

| Location | Old | New |
|---|---|---|
| `inputWrapperVariants` base string, `bg-input` | `bg-input` | `bg-transparent` |
| `inputFieldClasses`, placeholder class | `placeholder:text-muted-foreground` | `placeholder:text-border` |
| Left icon `<span>` className | `text-muted-foreground` | `text-icon` |
| Right icon `<span>` className | `text-muted-foreground` | `text-icon` |

---

### Step 3 — `src/components/primitives/textarea/TextArea.tsx`: 2 changes

| Location | Old | New |
|---|---|---|
| `textareaWrapperVariants` base string, `bg-input` | `bg-input` | `bg-transparent` |
| `textareaFieldClasses`, placeholder class | `placeholder:text-muted-foreground` | `placeholder:text-border` |

---

### Step 4 — `src/components/primitives/date/DateFieldTrigger.tsx`: 3 changes

| Location | Old | New |
|---|---|---|
| `triggerVariants` base string | `bg-input` | `bg-transparent` |
| Placeholder value span `cn(...)` fallback | `'text-muted-foreground'` | `'text-border'` |
| `<CalendarIcon>` className | `text-muted-foreground` | `text-icon` |

---

### Step 5 — `src/components/primitives/date/DateRangeFieldTrigger.tsx`: 3 changes

| Location | Old | New |
|---|---|---|
| `cva` base string | `bg-input` | `bg-transparent` |
| "from" value span `cn(...)` fallback (appears twice for from/to) | `'text-muted-foreground'` | `'text-border'` |
| Calendar icon className | `text-muted-foreground` | `text-icon` |

---

### Step 6 — `src/components/primitives/switch/SwitchCheckbox.tsx`: 1 change

| Location | Old | New |
|---|---|---|
| `switchThumbVariants` base string | `bg-input` | `bg-card` |

---

### Step 7 — `src/components/primitives/box-picker/box-picker.variants.ts`: 4 changes

| Location | Old | New |
|---|---|---|
| `default` visualVariant string | `bg-background` | `bg-card` |
| `horizontalDescription` visualVariant string | `bg-background` | `bg-card` |
| `selected: true` value | `'border-neutral-900 bg-neutral-900 text-white'` | `'border-primary bg-primary text-card'` |
| `selected: false` value | `'border-border bg-background text-foreground'` | `'border-border bg-card text-foreground'` |

---

### Step 8 — `src/components/primitives/staged-form/StagedFormTimeline.tsx`: 1 change

| Location | Old | New |
|---|---|---|
| Separator `›` `<span>` className | `text-muted-foreground` | `text-icon` |

---

### Step 9 — `src/components/shell/BottomTabBar.tsx`: 1 change

| Location | Old | New |
|---|---|---|
| Inactive tab `className` ternary fallback | `'text-muted-foreground'` | `'text-icon'` |

---

### Step 10 — Feature fields: `bg-input` on native `<select>` elements (2 files)

Both files have a `<select>` with a hardcoded `bg-input` className string (not a shared variant).

**`src/features/customers/components/fields/CustomerTypeField.tsx`**
- In the `<select>` `cn(...)` base string: `bg-input` → `bg-transparent`

**`src/features/items/components/fields/ItemCurrencyField.tsx`**
- In the `<select>` `cn(...)` base string: `bg-input` → `bg-transparent`

---

### Step 11 — Feature field: `bg-background` on trigger button (1 file)

**`src/features/items/components/fields/ItemCategorySelectionField.tsx`**
- Trigger button `className`: `bg-background` → `bg-card`

---

### Step 12 — Feature field labels: `text-foreground` → `text-muted-foreground` on `<label>` elements (18 files)

In every file listed below, find `<label` elements whose `className` contains `text-foreground` and change that token to `text-muted-foreground`. The surrounding classes (`text-sm font-medium`, `htmlFor`, etc.) are unchanged.

Files:
1. `src/features/customers/components/CustomerAddressFieldGroup.tsx`
2. `src/features/customers/components/fields/CustomerDisplayNameField.tsx`
3. `src/features/customers/components/fields/CustomerEmailField.tsx`
4. `src/features/customers/components/fields/CustomerPhoneField.tsx`
5. `src/features/customers/components/fields/CustomerTypeField.tsx`
6. `src/features/tasks/components/fields/TaskFulfillmentMethodField.tsx`
7. `src/features/tasks/components/fields/TaskReadyByDateField.tsx`
8. `src/features/tasks/components/fields/TaskDeliveryDateField.tsx`
9. `src/features/tasks/components/fields/TaskReturnSourceField.tsx`
10. `src/features/auth/components/SignInForm.tsx`
11. `src/features/items/components/fields/ItemPositionField.tsx`
12. `src/features/items/components/fields/ItemDesignerField.tsx`
13. `src/features/items/components/fields/ItemIssuesField.tsx`
14. `src/features/items/components/fields/ItemArticleNumberField.tsx`
15. `src/features/items/components/fields/ItemCurrencyField.tsx`
16. `src/features/items/components/fields/ItemCategorySelectionField.tsx`
17. `src/features/items/components/fields/ItemQuantityField.tsx`
18. `src/features/items/components/fields/ItemSkuField.tsx`

---

## Risks and mitigations

- **Risk**: `muted` and `border` share the same value (`#D0D3D9`). Any element using `bg-muted` as a hover or skeleton fill will look identical to a bordered element. **Mitigation**: intentional palette decision by the user — no action needed.

- **Risk**: `text-border` as a Tailwind utility class. In Tailwind v4, every `@theme` color token is available as a `text-*` utility. `--color-border` → `text-border` is valid. **Mitigation**: confirmed by Tailwind v4 token resolution rules.

- **Risk**: `bg-card` and `text-card` as Tailwind utility classes. Same as above — `--color-card: #FFFFFF` makes `bg-card` and `text-card` valid v4 utilities. **Mitigation**: confirmed.

- **Risk**: `text-icon` as a Tailwind utility class. `--color-icon: #8E8E8E` makes `text-icon` a valid v4 utility. **Mitigation**: confirmed.

- **Risk**: Native `<select>` with `bg-transparent` may render with an OS-default white or gray fill on iOS Safari. **Mitigation**: this is existing behavior on iOS for transparent selects and is outside this plan's scope — flag for future if it becomes a visual issue.

- **Risk**: `SwitchCheckbox` thumb was `bg-input` (white). After change to `bg-card` (also white `#FFFFFF`), the visual result is identical. **Mitigation**: zero regression.

---

## Validation plan

- `rg "bg-input" apps/managers-app/ManagerBeyo-app-managers/src/`: zero matches
- `rg "neutral-900" apps/managers-app/ManagerBeyo-app-managers/src/`: zero matches
- `npm run typecheck`: zero TypeScript errors
- `npm run build`: passes

---

## Review log

- `2026-05-21` David: plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
