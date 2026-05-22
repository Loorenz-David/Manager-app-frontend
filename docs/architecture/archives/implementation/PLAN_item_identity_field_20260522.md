# PLAN_item_identity_field_20260522

## Metadata

- Plan ID: `PLAN_item_identity_field_20260522`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T17:20:47Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Replace the separate `ItemArticleNumberField` and `ItemSkuField` with a single `ItemIdentityField` that uses `BoxSlidePicker` to switch between two inputs, animated with a directional slide, and persists the last-active tab in localStorage.
- Business/user intent: Compresses two related inputs into one field, reducing visual clutter while keeping both article number and SKU editable in a natural swipe-like interaction.
- Non-goals: Barcode/scanner integration (button logs to console only); validation schema changes; new surfaces or API changes.

## Scope

- In scope:
  - New `ItemIdentityField.tsx` component (1 file)
  - Directional slide animation between inputs using `AnimatePresence` + `m.div`
  - localStorage persistence of active tab
  - Scanner button inside each `TextInput` via `rightIcon`
  - Update `ItemDetailsFieldGroup.tsx` to use `ItemIdentityField`
  - Update `features/items/index.ts` to export `ItemIdentityField` and remove old exports
  - Delete `ItemArticleNumberField.tsx` and `ItemSkuField.tsx`
- Out of scope:
  - Actual barcode scanner integration
  - Zod schema changes (paths `item.article_number` and `item.sku` are unchanged)
  - New surfaces, query hooks, or action hooks

## Clarifications required

None — all requirements specified.

## Acceptance criteria

1. A `BoxSlidePicker` with two options ("Article number", "SKU") renders as the field's label, compact (`w-auto`), not full-width.
2. Switching tabs slides the current input out and the new input in, with direction determined by index order (→ when going right, ← when going left).
3. On mount, the field opens on the tab stored in `localStorage` under `'item-identity-field-active-tab'`; defaults to `'article_number'` when no stored value exists.
4. Each tab change persists the new value to `localStorage`.
5. Both `TextInput` fields have a scanner icon button inside the right side of the input. Pressing it calls `console.log('opening scanner...')`.
6. The scanner button is interactive even though it is passed as `rightIcon` (which is wrapped in `pointer-events-none`). Achieved by `pointer-events-auto` on the button.
7. RHF paths are unchanged: `item.article_number` and `item.sku`. Injecting values via `form.setValue('item.article_number', ...)` and `form.setValue('item.sku', ...)` still works.
8. `ItemDetailsFieldGroup` renders `ItemIdentityField` where the `grid-cols-2` article+sku row used to be.
9. `ItemArticleNumberField.tsx` and `ItemSkuField.tsx` are deleted.
10. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/15_feature_structure.md`: feature folder layout, co-location discipline
- `architecture/07_components.md`: standalone component pattern, no context writes
- `architecture/31_animations.md`: Framer Motion usage with `m.*` aliases, `AnimatePresence`, `transitions` from `@/lib/animation`

### File read intent — pattern vs. relational

Permitted reads (relational — what already exists):
- `components/primitives/box-slide-picker/BoxSlidePicker.tsx` — understand `className`, `dataTestId` props, `w-auto` approach
- `components/primitives/box-slide-picker/types.ts` — `BoxSlidePickerOption` shape
- `components/primitives/box-slide-picker/box-slide-picker.variants.ts` — option min-height and padding
- `components/primitives/input/TextInput.tsx` — `rightIcon: ReactNode`, wrapper layout
- `components/primitives/staged-form/StagedFormStep.tsx` — directional slide variant pattern (exact template to copy)
- `lib/animation.ts` — `transitions.slide`, `durations`, `easings`
- `features/items/components/fields/ItemArticleNumberField.tsx` — existing RHF path, placeholder, register pattern
- `features/items/components/fields/ItemSkuField.tsx` — existing RHF path, placeholder
- `features/items/components/ItemDetailsFieldGroup.tsx` — where to replace the 2-column grid row
- `features/items/index.ts` — what to remove and add

Prohibited:
- Reading unrelated feature controllers/actions for animation or form patterns — use `31_animations.md` and `07_components.md`

### Skill selection

- Primary skill: standalone RHF field with Framer Motion directional animation (pattern established in `StagedFormStep`)

## Implementation plan

### Step 1 — `features/items/components/fields/ItemIdentityField.tsx` (NEW FILE)

Full implementation of the combined field.

**Imports:**

```tsx
import { AnimatePresence, m } from 'framer-motion';
import { ScanLine } from 'lucide-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { BoxSlidePicker, FieldErrorPill, TextInput } from '@/components/primitives';
import type { BoxSlidePickerOption } from '@/components/primitives/box-slide-picker/types';
import { transitions } from '@/lib/animation';
```

**Constants:**

```ts
const STORAGE_KEY = 'item-identity-field-active-tab';

const IDENTITY_TABS = ['article_number', 'sku'] as const;
type IdentityTab = (typeof IDENTITY_TABS)[number];

const TAB_OPTIONS: readonly BoxSlidePickerOption<IdentityTab>[] = [
  {
    value: 'article_number',
    label: 'Article number',
    testId: 'item-identity-article-number-tab',
    ariaLabel: 'Article number input',
  },
  {
    value: 'sku',
    label: 'SKU',
    testId: 'item-identity-sku-tab',
    ariaLabel: 'SKU input',
  },
] as const;

// Directional slide variants — identical pattern to StagedFormStep.tsx
const inputVariants = {
  enter: (dir: 1 | -1) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
} as const;

function readStoredTab(): IdentityTab {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'article_number' || stored === 'sku') {
      return stored;
    }
  } catch {}
  return 'article_number';
}
```

**Component:**

```tsx
export function ItemIdentityField(): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const articleError = (errors as { item?: Record<string, { message?: string }> })
    .item?.article_number?.message;
  const skuError = (errors as { item?: Record<string, { message?: string }> })
    .item?.sku?.message;

  const [activeTab, setActiveTab] = useState<IdentityTab>(readStoredTab);
  const [direction, setDirection] = useState<1 | -1>(1);

  function handleTabChange(newTab: IdentityTab) {
    const oldIndex = IDENTITY_TABS.indexOf(activeTab);
    const newIndex = IDENTITY_TABS.indexOf(newTab);
    setDirection(newIndex > oldIndex ? 1 : -1);
    setActiveTab(newTab);
    try {
      localStorage.setItem(STORAGE_KEY, newTab);
    } catch {}
  }

  const activeError = activeTab === 'article_number' ? articleError : skuError;

  return (
    <div className="flex flex-col gap-2" data-testid="item-identity-field">
      {/* Tab picker replaces the label — compact, left-aligned */}
      <BoxSlidePicker
        value={activeTab}
        options={TAB_OPTIONS}
        onValueChange={handleTabChange}
        className="w-auto"
        dataTestId="item-identity-tab-picker"
      />

      {/* Sliding input — overflow-hidden clips the exiting/entering slide */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <m.div
            key={activeTab}
            custom={direction}
            variants={inputVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transitions.slide}
          >
            {activeTab === 'article_number' ? (
              <TextInput
                data-testid="item-article-number-input"
                id="item-article-number"
                type="text"
                autoCapitalize="characters"
                placeholder="e.g. KN-123"
                invalid={Boolean(articleError)}
                rightIcon={
                  <button
                    type="button"
                    aria-label="Scan article number"
                    data-testid="item-article-number-scan-button"
                    className="pointer-events-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => {
                      console.log('opening scanner...');
                    }}
                  >
                    <ScanLine className="size-4" />
                  </button>
                }
                {...register('item.article_number')}
              />
            ) : (
              <TextInput
                data-testid="item-sku-input"
                id="item-sku"
                type="text"
                autoCapitalize="characters"
                placeholder="e.g. SKU-456"
                invalid={Boolean(skuError)}
                rightIcon={
                  <button
                    type="button"
                    aria-label="Scan SKU"
                    data-testid="item-sku-scan-button"
                    className="pointer-events-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => {
                      console.log('opening scanner...');
                    }}
                  >
                    <ScanLine className="size-4" />
                  </button>
                }
                {...register('item.sku')}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Error for the active tab only */}
      <FieldErrorPill
        data-testid={
          activeTab === 'article_number' ? 'item-article-number-error' : 'item-sku-error'
        }
        message={activeError}
      />
    </div>
  );
}
```

**Note on `pointer-events-auto`**: `TextInput` wraps `rightIcon` in `<span className="pointer-events-none ...">`. CSS `pointer-events: none` does not automatically propagate to HTML descendants — but to be explicit and safe, the scanner buttons carry `pointer-events-auto` so their interactivity is clearly declared and cannot be accidentally overridden.

---

### Step 2 — `features/items/components/ItemDetailsFieldGroup.tsx` (MODIFY)

**a. Remove imports of old fields:**

```diff
- import { ItemArticleNumberField } from './fields/ItemArticleNumberField';
- import { ItemSkuField } from './fields/ItemSkuField';
+ import { ItemIdentityField } from './fields/ItemIdentityField';
```

**b. Replace the `grid-cols-2` row** containing both fields with the single new field:

Current code to remove:
```tsx
<div className="grid grid-cols-2 gap-3">
  <ItemArticleNumberField />
  <ItemSkuField />
</div>
```

Replace with:
```tsx
<ItemIdentityField />
```

Full resulting component:
```tsx
import { ItemCurrencyField } from './fields/ItemCurrencyField';
import { ItemDesignerField } from './fields/ItemDesignerField';
import { ItemIdentityField } from './fields/ItemIdentityField';
import { ItemPositionField } from './fields/ItemPositionField';
import { ItemQuantityField } from './fields/ItemQuantityField';

export function ItemDetailsFieldGroup() {
  return (
    <div className="flex flex-col gap-4" data-testid="item-details-field-group">
      <ItemDesignerField />
      <ItemIdentityField />
      <ItemQuantityField />
      <ItemCurrencyField />
      <ItemPositionField />
    </div>
  );
}
```

---

### Step 3 — `features/items/index.ts` (MODIFY)

**a. Remove old exports:**

```diff
- export { ItemArticleNumberField } from './components/fields/ItemArticleNumberField';
- export { ItemSkuField } from './components/fields/ItemSkuField';
```

**b. Add new export:**

```diff
+ export { ItemIdentityField } from './components/fields/ItemIdentityField';
```

---

### Step 4 — Delete old field files

Delete both files as they are fully replaced:

- `features/items/components/fields/ItemArticleNumberField.tsx`
- `features/items/components/fields/ItemSkuField.tsx`

Before deleting, confirm no remaining imports reference either file outside the items feature (run: `grep -r "ItemArticleNumberField\|ItemSkuField" src/` and verify only the updated files appear).

---

## Risks and mitigations

- Risk: `localStorage` access throws in sandboxed environments (e.g., private browsing with storage blocked).
  Mitigation: `readStoredTab` wraps in `try/catch`, defaults to `'article_number'`. Tab changes silently no-op on storage failure — no crash.
- Risk: Both `article_number` and `sku` can have form errors simultaneously, but only the active tab's error is shown.
  Mitigation: Acceptable UX for a test form; when the user tabs to the other input, its error becomes visible. A combined `FieldErrorPill` can be added later if needed.
- Risk: `AnimatePresence mode="wait"` causes a brief gap between exit and enter if `transitions.slide` is slow.
  Mitigation: `transitions.slide` is 0.24s at `slideIn` easing — fast enough on a 2-input toggle. `initial={false}` suppresses the enter animation on mount.
- Risk: Deleting `ItemArticleNumberField.tsx` / `ItemSkuField.tsx` breaks other consumers.
  Mitigation: Grep for all usages before deleting (Step 4 instruction). The items `index.ts` no longer re-exports them, so any remaining import would produce a compile error caught by `typecheck`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open testing forms → item step → verify BoxSlidePicker shows "Article number | SKU" tabs, compact, left-aligned
- Manual: tab shows article number input by default (or persisted tab on reload)
- Manual: type value in article number → tap SKU → article number slides LEFT, SKU slides IN from RIGHT
- Manual: tap article number → SKU slides LEFT, article number slides IN from LEFT
- Manual: tap scanner button → console logs `opening scanner...`
- Manual: reload page → field opens on last-used tab
- Manual: fill both fields → verify form values contain both `item.article_number` and `item.sku`

## Review log

- `2026-05-22`: Implemented `ItemIdentityField`, replaced the article-number/SKU row, removed obsolete field files, and passed managers-app `npm run typecheck`.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `david`
