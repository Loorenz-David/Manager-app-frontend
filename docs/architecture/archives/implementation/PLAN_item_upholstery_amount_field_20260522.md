# PLAN_item_upholstery_amount_field_20260522

## Metadata

- Plan ID: `PLAN_item_upholstery_amount_field_20260522`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T21:46:51Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Add `ItemUpholsteryAmountField` — a decimal number input for `upholstery_amount_meters` with two quick-multiplier pill buttons (× 0.25, × 0.5) below it.
- Business/user intent: Allow managers to record how many meters of upholstery an item requires, with convenient shortcut buttons for common fractional amounts.
- Non-goals: No API integration — the field is a pure form-layer component. No upholstery picker change.

## Scope

- In scope:
  - Extend `ItemUpholsteryFieldsSchema` in `types.ts` with `upholstery_amount_meters`
  - New `ItemUpholsteryAmountField.tsx` component in `features/items/components/fields/`
  - Export the new component and updated schema type from `features/items/index.ts`
  - Register the field in `TestingFormsContent.tsx` (testing harness only — no production form change required)
- Out of scope:
  - Any upholstery API changes
  - Changes to `ItemUpholsteryField` (the picker field)
  - Production form wiring beyond the testing harness
- Assumptions:
  - The form nests upholstery fields under the `item_upholstery` key (confirmed: `item_upholstery.upholstery_client_id`)
  - `NumberInput` `allowDecimal` prop handles decimal input and display correctly (confirmed from primitive)
  - The multiplier pill buttons multiply the **current input value** by the factor; if the field is empty they set the field to the factor value itself

## Clarifications required

_Resolved during implementation using the plan defaults: multiplier buttons apply to the current value or seed the factor when empty, `step={0.25}`, and `unitLabel="m"`._

## Acceptance criteria

1. `ItemUpholsteryAmountField` renders a `NumberInput` with `allowDecimal`, `min={0}`, `unitLabel="m"`, and `step={0.25}`.
2. Below the input, two full-width pill buttons in a 2-column grid render with labels `× 0.25` and `× 0.5`.
3. Clicking `× 0.25` when the field has value `4` sets it to `1`; when empty sets it to `0.25`.
4. Clicking `× 0.5` when the field has value `4` sets it to `2`; when empty sets it to `0.5`.
5. `ItemUpholsteryFieldsSchema` now includes `upholstery_amount_meters: z.number().positive().nullable().optional()`.
6. The field is exported from `features/items/index.ts`.
7. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: form field hook pattern (`useController`, `useFormContext` usage)

### Local extensions loaded

- None required

### File read intent — pattern vs. relational

Prohibited (pattern reads — contract already covers these):
- Reading another field file to understand `useController` setup → `08_hooks.md`

Permitted (relational reads — understanding what exists):
- `features/items/types.ts` — exact field names in `ItemUpholsteryFieldsSchema`, `ItemUpholsteryFields` type
- `features/items/index.ts` — verify export list before adding
- `components/primitives/number-input/types.ts` — verify `NumberInputProps` signature
- `features/testing_forms/components/TestingFormsContent.tsx` — verify form schema nesting and where to add the new field in the harness

### Skill selection

- Primary skill: form field primitive wiring
- Trigger terms: `useController`, `NumberInput`, field component
- Excluded alternatives: none

## Implementation plan

### Step 1 — Extend `ItemUpholsteryFieldsSchema` in `types.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/types.ts`

Add `upholstery_amount_meters` to the existing schema object:

```ts
export const ItemUpholsteryFieldsSchema = z.object({
  upholstery_client_id: z.string().nullable().optional(),
  upholstery_amount_meters: z
    .number()
    .positive({ message: 'Enter a positive amount.' })
    .nullable()
    .optional(),
});
```

`ItemUpholsteryFields` is inferred — no separate type change needed.

---

### Step 2 — Create `ItemUpholsteryAmountField.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemUpholsteryAmountField.tsx`

```tsx
import { useController, useFormContext } from 'react-hook-form';

import { FieldErrorPill, NumberInput } from '@/components/primitives';

export function ItemUpholsteryAmountField() {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const { field } = useController({
    name: 'item_upholstery.upholstery_amount_meters',
    control,
  });
  const error = (
    errors as { item_upholstery?: Record<string, { message?: string }> }
  ).item_upholstery?.upholstery_amount_meters?.message;

  function applyMultiplier(factor: number): void {
    const current = field.value ?? null;
    field.onChange(current !== null ? current * factor : factor);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="item-upholstery-amount"
          className="text-sm font-medium text-muted-foreground"
        >
          Amount <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="item-upholstery-amount-error" message={error} />
      </div>
      <NumberInput
        id="item-upholstery-amount"
        inputTestId="item-upholstery-amount-input"
        incrementTestId="item-upholstery-amount-increment-button"
        decrementTestId="item-upholstery-amount-decrement-button"
        min={0}
        allowDecimal
        unitLabel="m"
        placeholder="e.g. 2.5"
        step={0.25}
        invalid={Boolean(error)}
        value={field.value ?? null}
        onBlur={field.onBlur}
        onValueChange={(nextValue) => field.onChange(nextValue ?? undefined)}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="item-upholstery-amount-x025-button"
          className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => applyMultiplier(0.25)}
        >
          × 0.25
        </button>
        <button
          type="button"
          data-testid="item-upholstery-amount-x05-button"
          className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => applyMultiplier(0.5)}
        >
          × 0.5
        </button>
      </div>
    </div>
  );
}
```

---

### Step 3 — Export from `features/items/index.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/index.ts`

Add after the existing `ItemUpholsteryField` export line:

```ts
export { ItemUpholsteryAmountField } from './components/fields/ItemUpholsteryAmountField';
```

`ItemUpholsteryFieldsSchema` and `ItemUpholsteryFields` are already exported — no change needed there since the inferred type updates automatically.

---

### Step 4 — Register in testing harness

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx`

1. Import `ItemUpholsteryAmountField` at the top alongside `ItemUpholsteryField`.
2. Add `upholstery_amount_meters: null` to the default values under `item_upholstery`.
3. Render `<ItemUpholsteryAmountField />` directly below the upholstery picker `Controller` block (no wrapper needed — self-contained like `ItemQuantityField`).

```tsx
// inside the <div className="flex flex-col gap-4"> block, after the upholstery picker Controller:
<ItemUpholsteryAmountField />
```

Note: `ItemUpholsteryAmountField` reads its own form path (`item_upholstery.upholstery_amount_meters`) via `useController`, so it needs no props — mirrors the pattern of `ItemQuantityField`.

## Risks and mitigations

- Risk: Floating-point rounding — `4 × 0.25` = `1.0000000000000002` in JS
  Mitigation: Round to 4 decimal places in `applyMultiplier`: `Math.round((current * factor) * 10000) / 10000`
- Risk: `step={0.25}` stepper might conflict with `allowDecimal` producing non-quarter values
  Mitigation: No conflict — `allowDecimal` only controls the input keyboard/sanitization; the step only affects the stepper buttons. User can type any decimal value.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open testing harness → upholstery section → field renders with NumberInput and two pill buttons
- Manual: type `4` → press `× 0.25` → field shows `1`
- Manual: clear field → press `× 0.5` → field shows `0.5`
- Manual: step buttons increment/decrement by 0.25

## Review log

- 2026-05-22T21:46:51Z — Implemented the field, added summary `docs/architecture/implemented_summaries/SUMMARY_PLAN_item_upholstery_amount_field_20260522.md`, and passed `npm run typecheck`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
