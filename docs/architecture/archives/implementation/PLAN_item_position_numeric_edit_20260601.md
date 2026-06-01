# PLAN_item_position_numeric_edit_20260601

## Metadata

- Plan ID: `PLAN_item_position_numeric_edit_20260601`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-01T00:00:00Z`
- Last updated at (UTC): `2026-06-01T07:39:33Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Two coordinated changes. (1) Convert `ItemPositionField` from a free-text input to a numeric input (opens numeric keyboard on mobile); the schema value is typed as `number` in the form but serialised back to `string` for the API because the server stores `item_position` as `string`. (2) Make the position display in `TaskBodyCategoryRow` a tappable `<button>` that opens a lightweight sheet for inline editing, following the same pattern used by the quantity pill in `TaskScheduledDeliverySection`.
- **Business/user intent:** Position is a discrete numeric identifier (e.g. seat 3). A text keyboard is error-prone; a numeric keyboard reduces friction at creation time. A tappable position pill in the detail view gives managers a fast path to correct a mis-numbered position without navigating to the full task-edit slide.
- **Non-goals:** No backend or database schema changes. `Item.item_position` stays `z.string().nullable()` and `UpdateItemInput.item_position` stays `z.string()`. No new edit entry-point beyond `TaskBodyCategoryRow`. No support for adding a position from `null` via the detail sheet (creation form is the entry-point for that).

---

## Scope

- **In scope:**
  - `ItemDetailsFieldsSchema.item_position` — change from `z.string().max(255).optional()` to `z.coerce.number().int().nonnegative().optional()`
  - `ItemPositionField.tsx` — change input to `inputMode="numeric"` with `{ valueAsNumber: true }` register option; update placeholder
  - Default values in `InternalFormContent`, `PreOrderFormContent`, `ReturnFormContent` — `item_position: ""` → `item_position: undefined`
  - `buildItemFields` in `normalize-task-form-payload.ts` — stringify numeric position before sending; fix `hasAnyItemData` check
  - New surface constant + props type + lazy loader + registration in `tasks/surfaces.ts`
  - New page `src/pages/tasks/ItemPositionSheetPage.tsx`
  - `use-task-detail.flow.ts` — add `openPositionSheet()`
  - `TaskBodyCategoryRow.tsx` — wrap position `<span>` in `<button>` calling `openPositionSheet` from context

- **Out of scope:**
  - Changing `ItemSchema.item_position` or `UpdateItemInput.item_position` (server-side type stays `string`)
  - Adding position from `null` via the detail sheet
  - Edit affordance in the task list row, task-edit slide, or workers app

- **Assumptions:**
  - Position is always a non-negative integer (no decimals, no negatives)
  - An unset position arrives as `null` from the server; in form state it is `undefined`
  - When `item.item_position` is `null` the current span already renders nothing; the button is only shown when a value exists (no change to the null-guard)

---

## Clarifications required

None — design is fully derivable from the existing quantity-edit pattern.

---

## Acceptance criteria

1. In all three creation forms the `ItemPositionField` shows a numeric keyboard on iOS/Android and rejects non-integer input via Zod validation.
2. Entering `"3"` in the field results in `item_position: 3` (number) in form state and `item_position: "3"` (string) in the API payload.
3. In the task-detail view, when `item.item_position` is non-null, the position text is wrapped in a tappable button that opens the position-edit sheet.
4. The edit sheet pre-fills the current position (parsed from string), accepts numeric input, calls `updateItem` on save, closes on success, and re-opens with the prefill value on error.
5. `npm run typecheck` produces zero errors after all changes.

---

## Contracts and skills

### Domain schemas consulted

- `src/features/items/types.ts`: `Item.item_position: string | null`; `ItemDetailsFieldsSchema.item_position: z.string().max(255).optional()`; `UpdateItemInput.item_position: z.string().max(255).nullable().optional()`
- `src/features/tasks/surfaces.ts`: existing surface IDs, props types, lazy loaders, `taskSurfaces` registration map
- `src/features/tasks/flows/use-task-detail.flow.ts`: existing flow methods pattern (`openQuantitySheet`)
- `src/features/tasks/controllers/use-task-detail.controller.ts`: spread of `flow` into controller return
- `src/pages/tasks/ItemQuantitySheetPage.tsx`: canonical sheet-page pattern to mirror

### Contracts loaded

- `../architecture/01_architecture.md`: overall monorepo layer rules
- `../architecture/02_types.md`: Zod schema conventions
- `../architecture/04_api_client.md`: API client usage
- `../architecture/05_server_state.md`: TanStack Query hooks
- `../architecture/08_hooks.md`: action hook (mutation) shape
- `../architecture/09_forms.md`: form schema and field conventions
- `../architecture/13_errors.md`: error handling
- `../architecture/15_feature_structure.md`: feature folder layout
- `../architecture/24_dto.md`: DTO / form-value separation
- `../architecture/28_surfaces.md` + `28_surfaces_local.md`: sheet surface pattern
- `../architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` usage

### File read intent — pattern vs. relational

All reads below were **relational** (understanding what exists):

Permitted reads taken:
- `items/types.ts` — established actual field names and Zod schema types
- `tasks/surfaces.ts` — verified surface ID naming, props type shape, lazy loader pattern, registration map
- `tasks/flows/use-task-detail.flow.ts` — verified `openQuantitySheet` guard pattern
- `tasks/controllers/use-task-detail.controller.ts` — verified `...flow` spread, no manual forwarding needed
- `pages/tasks/ItemQuantitySheetPage.tsx` — understood sheet page structure to replicate
- `task-creation/types.ts` — confirmed form schemas compose `ItemDetailsFieldsSchema`
- `task-creation/lib/normalize-task-form-payload.ts` — confirmed `toOptionalString(item.item_position)` site

---

## Implementation plan

### Step 1 — `src/features/items/types.ts`

Change `ItemDetailsFieldsSchema.item_position` from `z.string().max(255).optional()` to:

```ts
item_position: z.coerce.number().int().nonnegative().optional(),
```

`z.coerce.number()` converts the raw string from the DOM input to a number before Zod validates it. The `Item` schema, `CreateItemInputSchema`, and `UpdateItemInputSchema` are **not changed** — they continue to use `z.string()` because the API speaks strings.

---

### Step 2 — `src/features/items/components/fields/ItemPositionField.tsx`

Three changes:

1. Add `{ valueAsNumber: true }` to the `register` call so React Hook Form stores the value as a `number`, not a string:
   ```ts
   {...register('item.item_position', { valueAsNumber: true })}
   ```
2. Change the input to open the numeric keyboard. Use `inputMode="numeric"` with `pattern="[0-9]*"` (preferred over `type="number"` to avoid browser spinner controls):
   ```tsx
   <TextInput
     inputMode="numeric"
     pattern="[0-9]*"
     placeholder="e.g. 3"
     ...
   />
   ```
3. Update the placeholder from `"e.g. Top-left corner"` to `"e.g. 3"`.

---

### Step 3 — Default values in creation forms

In `InternalFormContent.tsx`, `PreOrderFormContent.tsx`, and `ReturnFormContent.tsx`, change the default value for `item.item_position`:

```ts
// before
item_position: "",
// after
item_position: undefined,
```

Both the initial `defaultValues` and the reset call inside `InternalFormContent.onSubmit` must be updated.

---

### Step 4 — `src/features/task-creation/lib/normalize-task-form-payload.ts`

Two sites:

**`hasAnyItemData`** — `item.item_position` is now `number | undefined`, not `string | undefined`. Change:
```ts
// before
toOptionalString(item.item_position) ??
// after
(item.item_position != null ? String(item.item_position) : undefined) ??
```

**`buildItemFields` return** — stringify the number before sending:
```ts
// before
item_position: toOptionalString(item.item_position),
// after
item_position: item.item_position != null ? String(item.item_position) : undefined,
```

---

### Step 5 — `src/features/tasks/surfaces.ts`

Add in the constants block:
```ts
export const ITEM_POSITION_SHEET_SURFACE_ID = "item-position-sheet";
```

Add the props type alongside the other surface prop types:
```ts
export type ItemPositionSurfaceProps = {
  taskId: string;
  itemId: string;
  prefill?: {
    position: number | null;
  };
};
```

Add a loader function:
```ts
function loadItemPositionSheetPage() {
  return import("@/pages/tasks/ItemPositionSheetPage").then((module) => ({
    default: module.ItemPositionSheetPage,
  }));
}
```

Add a lazy component:
```ts
const itemPositionSheet = lazyWithPreload(loadItemPositionSheetPage);
```

Add to `taskSurfaces`:
```ts
[ITEM_POSITION_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: itemPositionSheet.Component,
},
```

---

### Step 6 — `src/features/tasks/flows/use-task-detail.flow.ts`

Import `ITEM_POSITION_SHEET_SURFACE_ID` and add the method:
```ts
openPositionSheet: () => {
  if (!itemId) {
    return;
  }
  surface.open(ITEM_POSITION_SHEET_SURFACE_ID, { taskId, itemId });
},
```

The `itemId` guard mirrors `openQuantitySheet`. No controller change is needed — `useTaskDetailController` spreads `...flow`, so `openPositionSheet` is automatically included in `TaskDetailController`.

---

### Step 7 — `src/pages/tasks/ItemPositionSheetPage.tsx` (new file)

Mirror the `ItemQuantitySheetPage` pattern:

```
useSurfaceHeader  →  setTitle("Edit position"), setActions(null)
useSurfaceProps<ItemPositionSurfaceProps>  →  taskId, itemId, prefill
useGetTaskQuery(taskId)  →  item = taskQuery.data?.item
useUpdateItem(taskId)  →  updateItem mutation

State:  position: number | null
  initialised from prefill?.position ?? (item?.item_position ? parseInt(item.item_position, 10) : null)

useEffect syncs to item?.item_position when prefill is absent.

Input:
  TextInput
    inputMode="numeric"
    pattern="[0-9]*"
    value={position ?? ""}
    onChange  →  setPosition(e.target.value === "" ? null : parseInt(e.target.value, 10))

Save button:
  onClick:
    header?.requestClose()
    updateItem.mutate(
      { id: itemId, item_position: position != null ? String(position) : null },
      {
        onSuccess: () => { /* sheet already closed */ },
        onError: () =>
          useSurfaceStore.getState().open(ITEM_POSITION_SHEET_SURFACE_ID, {
            taskId,
            itemId,
            prefill: { position },
          }),
      },
    )
```

Key constraints:
- `item_position` is sent as `string | null` to `updateItem` (matches `UpdateItemInput.item_position: z.string().max(255).nullable().optional()`)
- The `parseInt` parse uses radix `10`
- `useSurfaceStore.getState().open(...)` on error matches the quantity sheet pattern exactly

---

### Step 8 — `src/features/tasks/components/detail/TaskBodyCategoryRow.tsx`

The component already has access to `useTaskDetailContext()`. The context now exposes `openPositionSheet` via `...flow`.

**Visual design** — the position display becomes a labelled pill:

```
[TrainFront icon]  Wagon  :  #3
```

- `TrainFront` (from `lucide-react`) at `size-3.5`
- The label `"Wagon"` rendered as `<SectionLabel tone="muted">`
- A separator `":"` and the value rendered as `#${item.item_position}`
- All wrapped in a `<button>` for the tap target

Replace the current position `<span>` with:

```tsx
import { TrainFront } from "lucide-react";

{item.item_position ? (
  <button
    className="inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    type="button"
    onClick={openPositionSheet}
  >
    <TrainFront className="size-3.5 shrink-0 text-muted-foreground" />
    <SectionLabel tone="muted">Wagon</SectionLabel>
    <SectionLabel tone="muted">: #{item.item_position}</SectionLabel>
  </button>
) : null}
```

Notes:
- `SectionLabel` with `tone="muted"` is already imported in the file; no new UI primitive needed.
- Two `SectionLabel` spans are used so `"Wagon"` and `": #3"` share the same text style without a custom wrapper.
- Destructure `openPositionSheet` from `useTaskDetailContext()` alongside `taskDetail`.

---

## Risks and mitigations

- **Risk:** `z.coerce.number()` on an empty string produces `NaN`, which fails `.int()` validation. React Hook Form fires validation only on submit (or on user interaction if mode is `onChange`). The field is optional, so an empty field is valid — but `NaN` is not `undefined`.
  **Mitigation:** Use `{ valueAsNumber: true }` on `register`. RHF converts an empty string to `NaN`, but Zod's `z.coerce.number().optional()` does not treat `NaN` as absent. Add a `.transform` / `.refine` or use `z.preprocess`:
  ```ts
  item_position: z.preprocess(
    (v) => (v === "" || v === null || Number.isNaN(v) ? undefined : Number(v)),
    z.number().int().nonnegative().optional(),
  ),
  ```
  This converts empty/NaN to `undefined` (field absent) before validation.

- **Risk:** `parseInt(item.item_position, 10)` in the sheet page could return `NaN` if the stored string is non-numeric (legacy data).
  **Mitigation:** Guard with `Number.isNaN`: if `parseInt` returns `NaN`, initialise `position` as `null` so the input starts empty.

- **Risk:** `item_position` being a `number` in `ItemDetailsFields` but `string` in `Item` could cause TypeScript errors if any component currently passes `item.item_position` directly into an `ItemDetailsFields`-typed object.
  **Mitigation:** `typecheck` will surface these. The only normalisation site is `normalize-task-form-payload.ts`, which is covered in Step 4.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test (creation): open Internal / Return / Pre-order creation forms → `ItemPositionField` shows numeric keyboard on iOS; entering `"5"` → submit → verify API payload has `item_position: "5"` (string)
- Manual smoke test (detail edit): open a task with a known numeric position → tap the position pill → sheet opens pre-filled → change value → save → position updates in the detail view
- Manual error path: simulate a network error on `updateItem` → sheet reopens with the entered value

---

## Review log

_(empty)_

---

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: implementation agent
