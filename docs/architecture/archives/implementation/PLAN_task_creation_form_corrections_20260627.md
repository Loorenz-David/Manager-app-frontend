# PLAN_task_creation_form_corrections_20260627

## Metadata

- Plan ID: `PLAN_task_creation_form_corrections_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T20:48:44Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Correct and extend the three task-creation forms (InternalFormContent, PreOrderFormContent, ReturnFormContent) with six targeted fixes.
- Business/user intent: Forms must enforce seat-position validation, provide a number-pad above the keyboard for the position field, hide the redundant slide header, add top padding once the header is gone, surface customer email/phone warnings in PreOrder and Return, hide the customer step in Return when `store_return`, and fix the broken item-lookup response in ReturnFormContent.
- Non-goals: Adding new form fields, restructuring the multi-step flow, changing the scanner surface, or modifying anything in the workers-app.

## Scope

- In scope:
  - New `NumericKeyboardBar` UI primitive (packages/ui)
  - `ItemPositionField` refactor: text keyboard + NumericKeyboardBar (packages/items)
  - `ItemDetailsFieldsSchema` preprocess: string → number coercion (packages/items)
  - Schema corrections in packages/task-creation/src/types.ts (seat-position required, customer email/phone required, separate PreOrderFormSchema from ReturnFormSchema, customer partial for store_return)
  - `normalize-task-form-payload.ts`: skip customer spread for store_return, handle partial customer fields
  - Three slide page files: replace `setTitle` with `setHeaderHidden(true)`
  - Three form content files: add `pt-4` to form element
  - `ReturnFormContent`: fix lookup selector, add image creation, conditionally hide customer step for store_return
- Out of scope:
  - WorkerInternalFormContent
  - Any backend changes
  - Playwright e2e specs (prototype phase)
- Assumptions:
  - `useStagedForm`'s `onBeforeAdvance` captures fresh closure values on each invocation (consistent with existing `hasAssignmentStep` usage inside the callback).
  - The `NumericKeyboardBar` works on both Android and iPhone in this plan; restriction to iPhone only will come in a follow-up.
  - `normalizeReturnFormPayload` receives Zod-output values from `handleSubmit`, so `item.item_position` is always `number | undefined` at call time (Zod coerces the string).

## Clarifications required

_(none — all decisions resolved by code inspection)_

## Acceptance criteria

1. Submitting any form with `major_category === "seat"` and no position value shows a `FieldErrorPill` on the position input and an error badge on the item/task step header.
2. Tapping the position field opens the text keyboard; a row of digit buttons (0–9) and a backspace button appears above it when the keyboard is open, allowing number input without a numeric pad.
3. The slide surface back-arrow header is hidden for all three task-creation forms; the staged-form navigation footer handles close/back.
4. The staged form has visible top breathing room (≥ 16 px) below the safe-area inset after the header is hidden.
5. Submitting PreOrderFormContent with blank email or blank phone shows warnings on the fields and error badge on the customer step.
6. Submitting ReturnFormContent with `return_source !== "store_return"` and blank email or phone shows warnings on the fields and error badge on the customer step.
7. ReturnFormContent does not render the customer step when `return_source === "store_return"`.
8. ItemIdentityField in ReturnFormContent fills in article number, major category, and quantity when a valid article number is entered (lookup response is handled).

## Contracts and skills

### Contracts loaded

- `architecture/09_forms.md`: form validation pattern, step-level error detection
- `architecture/07_components.md`: component structure, no direct logic imports
- `architecture/08_hooks.md`: useController / useStagedForm pattern
- `architecture/37_keyboard_aware_inputs.md`: FloatingKeyboardBar / useKeyboardInset usage
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: slide surface header context, setHeaderHidden

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: data-testid naming convention (NumericKeyboardBar buttons)

### File read intent — pattern vs. relational

Permitted reads performed before authoring this plan:
- `packages/ui/src/components/surfaces/SlidePageSurface.tsx` — confirms `setHeaderHidden` API on SurfaceHeaderContext
- `packages/hooks/src/use-surface-header.ts` — confirms `useSurfaceHeader()` returns the context
- `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx` — existing pattern for portal-above-keyboard; used as model for NumericKeyboardBar
- `packages/ui/src/components/primitives/staged-form/StagedForm.tsx` — confirms StagedFormTimeline is absolutely positioned at top-0; `pt-4` on the `<form>` element pushes the whole staged form down safely
- `packages/items/src/types.ts` — actual field names and schema shape
- `packages/task-creation/src/types.ts` — actual schema shape, existing superRefine in InternalFormSchema
- `packages/task-creation/src/lib/item-lookup-prefill.ts` — `selectInternalLookupResult` vs `selectPurchaseApiLookupResult` distinction; confirms bug in ReturnFormContent
- `packages/customers/src/types.ts` — CustomerFieldsSchema; `display_name` is min(1) required; `primary_email` and `primary_phone_number` are optional → need superRefine enforcement

### Skill selection

- Primary skill: none (pure implementation)

## Implementation plan

### Step 1 — Create `NumericKeyboardBar` primitive

**File (new):** `packages/ui/src/components/primitives/floating-keyboard-bar/NumericKeyboardBar.tsx`

```tsx
import { type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@beyo/lib";
import { useKeyboardInset } from "../../../providers/KeyboardInsetProvider";

type NumericKeyboardBarProps = {
  value: string;
  onChange: (value: string) => void;
  hasFocus: boolean;
  className?: string;
};

function preventFocusSteal(event: MouseEvent<HTMLElement>): void {
  event.preventDefault();
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

export function NumericKeyboardBar({
  value,
  onChange,
  hasFocus,
  className,
}: NumericKeyboardBarProps): React.JSX.Element | null {
  const { isKeyboardOpen } = useKeyboardInset();

  if (!hasFocus || !isKeyboardOpen) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[9999]",
        "bottom-[var(--keyboard-inset)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto border-t border-border bg-card px-4 pb-[calc(var(--safe-bottom)_+_0.5rem)] pt-3 shadow-xl",
          className,
        )}
      >
        <div className="flex gap-2">
          {DIGITS.map((digit) => (
            <button
              key={digit}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-muted text-sm font-medium transition-colors hover:bg-muted/80 active:bg-muted/60"
              data-testid={`numeric-keyboard-bar-digit-${digit}`}
              type="button"
              onMouseDown={preventFocusSteal}
              onClick={() => onChange(value + digit)}
            >
              {digit}
            </button>
          ))}
          <button
            className="flex h-10 w-12 items-center justify-center rounded-lg bg-muted text-sm font-medium transition-colors hover:bg-muted/80 active:bg-muted/60"
            data-testid="numeric-keyboard-bar-backspace"
            type="button"
            onMouseDown={preventFocusSteal}
            onClick={() => onChange(value.slice(0, -1))}
          >
            ⌫
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

### Step 2 — Export `NumericKeyboardBar`

**File:** `packages/ui/src/components/primitives/floating-keyboard-bar/index.ts`

Add:
```ts
export { NumericKeyboardBar } from "./NumericKeyboardBar";
```

### Step 3 — Coerce string in `item_position` preprocess

**File:** `packages/items/src/types.ts`

Update the `item_position` preprocess so a string value (from the text input) is coerced to a number before being passed to `z.number()`:

```typescript
item_position: z.preprocess(
  (value) => {
    if (
      value === "" ||
      value === null ||
      value === undefined ||
      Number.isNaN(value)
    ) {
      return undefined;
    }
    if (typeof value === "string") {
      const num = Number(value);
      return Number.isNaN(num) ? undefined : num;
    }
    return value;
  },
  z.number({ message: "Enter a number." }).int().nonnegative().optional(),
),
```

### Step 4 — Refactor `ItemPositionField` to text keyboard + `NumericKeyboardBar`

**File:** `packages/items/src/components/ItemPositionField.tsx`

Replace the current `register` + numeric inputMode approach with `useController` + text type + `NumericKeyboardBar`:

```tsx
import { useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import { FieldErrorPill, FieldLabelRow, NumericKeyboardBar, TextInput } from "@beyo/ui";

export function ItemPositionField(): React.JSX.Element {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = (errors as { item?: Record<string, { message?: string }> }).item
    ?.item_position?.message;
  const { field } = useController({ name: "item.item_position", control });
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = field.value != null ? String(field.value) : "";

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor="item-position" label="Position">
        <FieldErrorPill data-testid="item-position-error" message={error} />
      </FieldLabelRow>
      <TextInput
        data-testid="item-position-input"
        id="item-position"
        type="text"
        placeholder="e.g. 3"
        invalid={Boolean(error)}
        value={displayValue}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => field.onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
      />
      <NumericKeyboardBar
        hasFocus={isFocused}
        value={displayValue}
        onChange={(next) => field.onChange(next)}
      />
    </div>
  );
}
```

Key changes:
- Removed `inputMode="numeric"`, `pattern="[0-9]*"`, `{ valueAsNumber: true }`
- Switched to `useController`; value stored as string in form state, Zod preprocess coerces to number at validation time
- `NumericKeyboardBar` appends/removes characters; input stays focused; portal appears above keyboard

### Step 5 — Update `types.ts` in task-creation

**File:** `packages/task-creation/src/types.ts`

Three changes:

#### 5a — Add `item_position` seat check to `InternalFormSchema.superRefine`

Inside the existing `.superRefine((data, ctx) => { ... })`:
```typescript
if (data.item.major_category === "seat" && data.item.item_position == null) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Position is required for seat items.",
    path: ["item", "item_position"],
  });
}
```

#### 5b — Rewrite `ReturnFormSchema` with partial customer + superRefine

Replace:
```typescript
export const ReturnFormSchema = z.object({
  // ... same fields ...
  customer: CustomerFieldsSchema,
  // ...
});
```

With:
```typescript
export const ReturnFormSchema = z
  .object({
    item: ItemDetailsFieldsSchema,
    item_upholstery: ItemUpholsteryFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    customer: CustomerFieldsSchema.partial(),   // partial — store_return has no customer
    return_source: z.enum(TASK_RETURN_SOURCE).optional(),
    fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
    scheduled_start_at: DateOnlySchema.nullable().optional(),
    scheduled_end_at: DateOnlySchema.nullable().optional(),
    working_section_assignments:
      WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
    ready_by_at: DateOnlySchema.nullable().optional(),
    note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.item.major_category === "seat" && data.item.item_position == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Position is required for seat items.",
        path: ["item", "item_position"],
      });
    }
    if (data.return_source !== "store_return") {
      if (!data.customer.display_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Name is required.",
          path: ["customer", "display_name"],
        });
      }
      if (!data.customer.customer_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a customer type.",
          path: ["customer", "customer_type"],
        });
      }
      if (!data.customer.primary_email?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email is required.",
          path: ["customer", "primary_email"],
        });
      }
      if (!data.customer.primary_phone_number?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone number is required.",
          path: ["customer", "primary_phone_number"],
        });
      }
    }
  });
export type ReturnFormValues = z.input<typeof ReturnFormSchema>;
```

#### 5c — Create a separate `PreOrderFormSchema` (no longer `= ReturnFormSchema`)

Replace:
```typescript
export const PreOrderFormSchema = ReturnFormSchema;
export type PreOrderFormValues = ReturnFormValues;
```

With:
```typescript
export const PreOrderFormSchema = z
  .object({
    item: ItemDetailsFieldsSchema,
    item_upholstery: ItemUpholsteryFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    customer: CustomerFieldsSchema,   // full — customer always required for pre-order
    return_source: z.enum(TASK_RETURN_SOURCE).optional(),
    fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
    scheduled_start_at: DateOnlySchema.nullable().optional(),
    scheduled_end_at: DateOnlySchema.nullable().optional(),
    working_section_assignments:
      WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
    ready_by_at: DateOnlySchema.nullable().optional(),
    note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.item.major_category === "seat" && data.item.item_position == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Position is required for seat items.",
        path: ["item", "item_position"],
      });
    }
    if (!data.customer.primary_email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required.",
        path: ["customer", "primary_email"],
      });
    }
    if (!data.customer.primary_phone_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number is required.",
        path: ["customer", "primary_phone_number"],
      });
    }
  });
export type PreOrderFormValues = z.input<typeof PreOrderFormSchema>;
```

### Step 6 — Update `normalize-task-form-payload.ts`

**File:** `packages/task-creation/src/lib/normalize-task-form-payload.ts`

#### 6a — Make `buildCustomerFields` handle partial customer

Change the function signature to accept partial customer (since ReturnFormValues now uses `CustomerFieldsSchema.partial()`):

```typescript
function buildCustomerFields(
  customer: { display_name?: string; primary_email?: string; primary_phone_number?: string; address?: ReturnFormValues["customer"]["address"] },
): Record<string, unknown> {
  const address = customer.address;

  return {
    customer_display_name: (customer.display_name ?? "").trim(),
    primary_phone_number: toOptionalString(customer.primary_phone_number),
    primary_email: toOptionalString(customer.primary_email),
    customer_address: {
      line1: toOptionalString(address?.street) ?? "",
      city: toOptionalString(address?.city),
      postal_code: toOptionalString(address?.postal_code),
      country: toOptionalString(address?.country),
    },
  };
}
```

(Or simply use `Partial<{ display_name: string; primary_email: string; primary_phone_number: string; address: ... }>` — let Codex resolve the exact type from the ReturnFormValues["customer"] shape after the schema change.)

#### 6b — Skip customer fields for `store_return` in `normalizeReturnFormPayload`

In `normalizeReturnFormPayload`, before the final `return` statement:

```typescript
const isStoreReturn = values.return_source === "store_return";
```

Then in the return object, replace the unconditional `...buildCustomerFields(values.customer)` spread with:

```typescript
...(!isStoreReturn ? buildCustomerFields(values.customer) : {}),
```

### Step 7 — Hide slide surface header in slide pages

For each of the three slide pages, replace the `header?.setTitle(...)` effect with `header?.setHeaderHidden(true)`. The slide pages themselves no longer set a title — the footer close/back button handles navigation.

**File:** `packages/task-creation/src/pages/InternalTaskSlidePage.tsx`

```typescript
useEffect(() => {
  header?.setHeaderHidden(true);
}, [header]);
```

**File:** `packages/task-creation/src/pages/ReturnTaskSlidePage.tsx`

```typescript
useEffect(() => {
  header?.setHeaderHidden(true);
}, [header]);
```

**File:** `packages/task-creation/src/pages/PreOrderTaskSlidePage.tsx`

```typescript
useEffect(() => {
  header?.setHeaderHidden(true);
}, [header]);
```

### Step 8 — Add `pt-4` to form element in all three form contents

**Files:** `InternalFormContent.tsx`, `PreOrderFormContent.tsx`, `ReturnFormContent.tsx`

In each, change the form element:
```tsx
// before
<form className="flex h-full flex-col" ...>

// after
<form className="flex h-full flex-col pt-4" ...>
```

This is safe because `StagedFormTimeline` is absolutely positioned at `top-0` relative to `StagedForm` (which is a flex child of the form), so the whole `StagedForm` is pushed down 16 px from the screen top, providing breathing room when the header is hidden. The form's `h-full` still fills the available viewport height; `pt-4` only affects the internal layout.

### Step 9 — Fix `ReturnFormContent` item-lookup bug + add image creation

**File:** `packages/task-creation/src/components/ReturnFormContent.tsx`

#### 9a — Change lookup selector

In `handleLookupResult`, change:
```typescript
const selectedItem = selectInternalLookupResult(items);
```
to:
```typescript
const selectedItem = selectPurchaseApiLookupResult(items);
```

Also add `buildCreateImagesFromUrlBatch` to the imports from `"../lib/item-lookup-prefill"` (it's already imported in `InternalFormContent`; bring it into `ReturnFormContent` too).

#### 9b — Add image creation on lookup result

Import `useCreateImagesFromUrl` and `imageKeys` from `@beyo/images`.

Add the hook call near the top of `ReturnFormContent`:
```typescript
const createImagesFromUrl = useCreateImagesFromUrl();
```

In `handleLookupResult`, after setting form values and before the signature assignment, add:
```typescript
if (selectedItem.images.length > 0) {
  void createImagesFromUrl
    .mutateAsync(
      buildCreateImagesFromUrlBatch(selectedItem.images, itemClientId),
    )
    .then(() =>
      queryClient.invalidateQueries({
        queryKey: imageKeys.list({
          entity_type: "item",
          entity_client_id: itemClientId,
        }),
      }),
    )
    .catch(() => {});
}
```

This matches the pattern in `InternalFormContent`.

### Step 10 — Conditional customer step in `ReturnFormContent`

**File:** `packages/task-creation/src/components/ReturnFormContent.tsx`

#### 10a — Derive `isCustomerStepVisible`

Below the existing `hasAssignmentStep` and `shouldShowTaskQuantity` derivations:
```typescript
const isCustomerStepVisible = returnSource !== "store_return";
```

#### 10b — Include customer step in `steps` array conditionally

```typescript
const steps = [
  { id: "task", title: "Task" },
  ...(isCustomerStepVisible
    ? ([{ id: "customer", title: "Customer" }] as const)
    : []),
  ...(hasAssignmentStep
    ? ([{ id: "assignment", title: "Assignment" }] as const)
    : []),
  { id: "details", title: "Details" },
];
```

#### 10c — Wrap `StagedFormStep id="customer"` in conditional render

```tsx
{isCustomerStepVisible ? (
  <StagedFormStep id="customer" className="px-0">
    {/* ... existing customer step content unchanged ... */}
  </StagedFormStep>
) : null}
```

#### 10d — Guard customer error detection in `onBeforeAdvance`

In the `if (currentStepId === "details")` branch:
```typescript
if (
  isCustomerStepVisible &&
  (errors.customer ??
    errors.fulfillment_method ??
    errors.scheduled_start_at ??
    errors.scheduled_end_at)
) {
  setStatus("customer", "error");
}
```

## Risks and mitigations

- Risk: `CustomerFieldsSchema.partial()` in `ReturnFormSchema` makes the TypeScript type of `ReturnFormValues["customer"]` fully optional; `normalizeReturnFormPayload` may emit TypeScript errors on `customer.display_name.trim()`.
  Mitigation: Step 6 updates `buildCustomerFields` to use `?? ""` guards on all potentially undefined fields.

- Risk: `NumericKeyboardBar` shows for any open keyboard if another input on the same form step is focused while position was previously focused and `isFocused` is stale.
  Mitigation: `onBlur` on the TextInput sets `isFocused` to false; the bar disappears before the next input opens its keyboard. This is standard browser focus order behavior.

- Risk: `StagedForm` uses `h-full` and the parent `<form className="... pt-4">` also uses `h-full`. Adding `pt-4` shrinks the available height by 16 px, potentially causing a very slight layout shift in the footer.
  Mitigation: The StagedForm's internal layout is flex-based and the footer is `shrink-0`, so the only effect is that the scrollable content area is 16 px shorter — acceptable.

- Risk: Calling `setStatus("customer", "error")` for a step ID that no longer exists in `staged.steps` (store_return case) might throw or leave stale state.
  Mitigation: Step 10d guards the call with `isCustomerStepVisible`. If `useStagedForm.setStatus` is called with an unknown step ID it likely no-ops, but the guard makes intent clear.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test — Internal form: fill seat category, skip position → expect position error pill on field + item step badge
- Manual smoke test — position field: focus field, text keyboard appears, number bar floats above, tapping digit appends to field
- Manual smoke test — slide surfaces: header arrow is gone for all three forms; footer Close & Back button works
- Manual smoke test — PreOrder / Return: leave email+phone blank → customer step badge shows on submit
- Manual smoke test — Return with store_return: customer step absent from timeline; form submits without customer data
- Manual smoke test — Return article number lookup: enter `0000405` → article_number, category, quantity filled in

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
