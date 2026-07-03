# PLAN_task_assortment_field_and_pill_20260703

## Metadata

- Plan ID: `PLAN_task_assortment_field_and_pill_20260703`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T10:43:57Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Add an "Assortment Position" text field to the `ReturnFormContent` (visible only when `return_source === "store_return"`), rename the existing position field label to "Current Position", wire the `assortment` key into the create-task payload, and create a `TaskAssortmentPill` + `TaskAssortmentSheetPage` in `@beyo/tasks` that allows editing the assortment on an existing task via the `update-post-handling` endpoint.
- Business/user intent: Store-return tasks need to track the assortment position where the returned item belongs. Managers must be able to set it at creation time and update it later from the task detail view.
- Non-goals: No changes to worker app, no changes to task-list display, no new query hooks (the assortment sheet reads directly from the existing `useGetTaskQuery`).

## Scope

- In scope:
  - `packages/items` — rename label in `ItemPositionField`
  - `packages/task-creation` — new `TaskAssortmentField`, schema extension, payload normalization, `ReturnFormContent` wiring
  - `packages/tasks` — new `TaskAssortmentPill`, new `TaskAssortmentSheetPage`, new surface ID, `TaskScheduledDeliverySection` prop extension, public API exports
  - `apps/managers-app` — surface registration, flow method, slide page prop
- Out of scope: Workers app, task list card, task filter, pre-order or internal forms.
- Assumptions:
  - `task.assortment` is already present in `TaskDetailRawSchema` (confirmed: `assortment: z.string().nullable()` at line 230).
  - `UpdatePostHandlingInput` already accepts `assortment?: string | null` (confirmed: `update-post-handling.ts` line 18).
  - `useUpdatePostHandling` already spreads `fields` into the optimistic update (confirmed: `use-update-post-handling.ts` line 34 `...fields`).

## Clarifications required

_(none — all field names, schema shapes, and surface registration patterns are confirmed from existing files)_

## Acceptance criteria

1. In `ReturnFormContent`, the existing position field label reads "Current Position".
2. When `return_source === "store_return"`, an "Assortment Position" text field appears below the position field; it is not mandatory, and its value is submitted as `assortment` in the create-task payload.
3. In `TaskScheduledDeliverySection`, when a task is of type `return` and `return_source === "store_return"`, a `TaskAssortmentPill` renders showing the current assortment value (or "—" when null).
4. Pressing the pill opens `TaskAssortmentSheetPage` as a bottom sheet; the page shows the current value in a text input and a Save button.
5. Saving calls `updatePostHandling` with `{ taskId, assortment: value }`, optimistically updates the task detail cache, and closes the sheet.
6. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo layer rules, package boundary enforcement
- `architecture/02_types.md`: Zod schema authoring, `z.input<>` vs `z.infer<>`
- `architecture/04_api_client.md`: `apiClient.patch` call shape
- `architecture/05_server_state.md`: TanStack Query patterns, cache invalidation
- `architecture/06_client_state.md`: optimistic update shape (already implemented in `use-update-post-handling`)
- `architecture/08_hooks.md`: action hook with optimistic update (no new hook needed — existing `useUpdatePostHandling` supports `assortment`)
- `architecture/07_components.md`: feature component authoring, context vs props
- `architecture/09_forms.md`: `useFormContext`, `useController`, field component pattern
- `architecture/13_errors.md`: error boundary, fallback behavior
- `architecture/15_feature_structure.md`: layer build order, file naming
- `architecture/28_surfaces.md`: surface types (`sheet`, `slide`), `useSurface`, `useSurfaceProps`
- `architecture/30_dynamic_loading.md`: `lazyWithPreload`, loader function convention
- `architecture/35_shared_packages.md §14`: package page export via loader functions, code-split boundary

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types are `slide`, `sheet`, `modal` — `drawer` excluded
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` import path is `@beyo/ui`; `usePreloadSurface` from `@beyo/hooks`; loader functions use `.then(m => ({ default: m.XxxPage }))`

### File read intent — pattern vs. relational

Permitted reads performed during planning (relational — understanding what exists):
- `packages/tasks/src/api/update-post-handling.ts` → confirmed `assortment?: string | null` already in `UpdatePostHandlingInput`
- `packages/tasks/src/types.ts` → confirmed `assortment: z.string().nullable()` in `TaskDetailRawSchema`
- `packages/tasks/src/surface-ids.ts` → confirmed naming convention for surface IDs and prop types
- `packages/tasks/src/components/detail/TaskFulfillmentMethodPill.tsx` → confirmed pill shape (EyebrowLabel + InfoPill + button/span toggle)
- `packages/tasks/src/pages/TaskFulfillmentMethodSheetPage.tsx` → confirmed sheet page shape (useSurfaceHeader + useSurfaceProps + useGetTaskQuery + useUpdatePostHandling)
- `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx` → confirmed `isStoreReturn` already computed, confirmed prop interface
- `packages/tasks/src/index.ts` → confirmed loader function pattern + public API export shape
- `packages/task-creation/src/types.ts` → confirmed `ReturnFormSchema` shape, `z.input<>` usage
- `packages/task-creation/src/components/ReturnFormContent.tsx` → confirmed conditional rendering, `returnSource` watch, form reset shape
- `packages/task-creation/src/lib/normalize-task-form-payload.ts` → confirmed `toOptionalString` helper, payload structure
- `packages/items/src/components/ItemPositionField.tsx` → confirmed label "Position" to rename
- `apps/managers-app/.../features/tasks/surfaces.ts` → confirmed registration pattern
- `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts` → confirmed `openFulfillmentMethodSheet` pattern to follow
- `apps/managers-app/.../features/tasks/controllers/use-task-detail.controller.ts` → confirmed `...flow` spread exposes all flow methods on `controller`

### Skill selection

- Primary skill: `skills/forms/SKILL.md` (form field authoring with `useController`)
- Trigger terms: `useFormContext`, `useController`, surface, lazyWithPreload, sheet page
- Excluded alternatives: none

## Domain schemas consulted

- `packages/tasks/src/types.ts`: `TaskDetailRaw.task.assortment = z.string().nullable()` (line 230); `TaskDetailRaw.task.return_source = z.enum(TASK_RETURN_SOURCE).nullable()` (line 218); `TaskDetailRaw.task.task_type = z.enum(TASK_TYPE)` (line 211)
- `packages/task-creation/src/types.ts`: `ReturnFormSchema` shape, `ReturnFormValues = z.input<typeof ReturnFormSchema>`, `RETURN_STEP_FIELDS_MAP.task = ["return_source", "item", "item_upholstery"]`
- `packages/tasks/src/api/update-post-handling.ts`: `UpdatePostHandlingInput.assortment?: string | null` — key confirmed, no new API function needed

## Implementation plan

### Step 1 — Rename ItemPositionField label

**File:** `packages/items/src/components/ItemPositionField.tsx`

Change `label="Position"` → `label="Current Position"` on the `FieldLabelRow` (line 27).

---

### Step 2 — Extend `ReturnFormSchema` with `assortment`

**File:** `packages/task-creation/src/types.ts`

Inside `ReturnFormSchema`'s `z.object({ ... })`, add:
```ts
assortment: z.string().optional(),
```
No superRefine change needed — field is optional with no cross-field rule.

---

### Step 3 — Create `TaskAssortmentField` component

**File (new):** `packages/task-creation/src/components/TaskAssortmentField.tsx`

Mirror `ItemPositionField` exactly, but:
- `useController` name: `"assortment"` (top-level, not nested)
- `FieldLabelRow` label: `"Assortment Position"`
- `id`/`data-testid`: `"assortment"` / `"assortment-input"` / `"assortment-error"`
- `FieldErrorPill` reads from `errors.assortment?.message`
- No error expected in practice (field is optional), but keep the pill for consistency

```tsx
import { useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { FieldErrorPill, FieldLabelRow, NumericKeyboardBar, TextInput } from "@beyo/ui";

export function TaskAssortmentField(): React.JSX.Element {
  const { control, formState: { errors } } = useFormContext();
  const error = (errors as { assortment?: { message?: string } }).assortment?.message;
  const { field } = useController({ name: "assortment", control });
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = field.value != null ? String(field.value) : "";

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor="assortment" label="Assortment Position">
        <FieldErrorPill data-testid="assortment-error" message={error} />
      </FieldLabelRow>
      <TextInput
        data-testid="assortment-input"
        id="assortment"
        type="text"
        placeholder="e.g. A3"
        invalid={Boolean(error)}
        value={displayValue}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => field.onChange(event.target.value)}
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

---

### Step 4 — Wire `TaskAssortmentField` into `ReturnFormContent`

**File:** `packages/task-creation/src/components/ReturnFormContent.tsx`

4a. Import `TaskAssortmentField`:
```ts
import { TaskAssortmentField } from "./TaskAssortmentField";
```

4b. Extend `RETURN_STEP_FIELDS_MAP.task`:
```ts
task: ["return_source", "item", "item_upholstery", "assortment"],
```

4c. Add `assortment: undefined` to `defaultValues` (inside `useForm`).

4d. Add `assortment: undefined` to the `form.reset(...)` call after `createTask.mutateAsync`.

4e. In the `StagedFormStep id="task"` JSX, below `<ItemPositionField />`, add:
```tsx
{returnSource === "store_return" ? <TaskAssortmentField /> : null}
```

---

### Step 5 — Add `assortment` to `normalizeReturnFormPayload`

**File:** `packages/task-creation/src/lib/normalize-task-form-payload.ts`

In the `return { ... }` block of `normalizeReturnFormPayload`, add after `ready_by_at`:
```ts
assortment: toOptionalString(values.assortment),
```
`toOptionalString` already trims and returns `undefined` for empty/null, which is correct — the create-task endpoint accepts `assortment` as an optional string key.

---

### Step 6 — Add surface ID and props type in `@beyo/tasks`

**File:** `packages/tasks/src/surface-ids.ts`

Add:
```ts
export const TASK_ASSORTMENT_SHEET_SURFACE_ID = "task-assortment-sheet";

export type TaskAssortmentSheetSurfaceProps = {
  taskId: string;
};
```

---

### Step 7 — Create `TaskAssortmentPill` component

**File (new):** `packages/tasks/src/components/detail/TaskAssortmentPill.tsx`

Mirror `TaskFulfillmentMethodPill` exactly, but for assortment:

```tsx
import { EyebrowLabel, InfoPill } from "@beyo/ui";

type TaskAssortmentPillProps = {
  assortment: string | null;
  onPress?: () => void;
};

export function TaskAssortmentPill({
  assortment,
  onPress,
}: TaskAssortmentPillProps): React.JSX.Element {
  const label = assortment ?? "—";
  const pill = <InfoPill>{label}</InfoPill>;

  if (onPress) {
    return (
      <div className="flex flex-col gap-1.5">
        <EyebrowLabel>Assortment Position</EyebrowLabel>
        <button
          className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-assortment-pill"
          type="button"
          onClick={onPress}
        >
          {pill}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <EyebrowLabel>Assortment Position</EyebrowLabel>
      <span data-testid="task-assortment-pill">{pill}</span>
    </div>
  );
}
```

---

### Step 8 — Export `TaskAssortmentPill` from detail barrel

**File:** `packages/tasks/src/components/detail/index.ts`

Add:
```ts
export { TaskAssortmentPill } from "./TaskAssortmentPill";
```

---

### Step 9 — Update `TaskScheduledDeliverySection`

**File:** `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx`

9a. Add import:
```ts
import { TaskAssortmentPill } from "./TaskAssortmentPill";
```

9b. Extend props type:
```ts
type TaskScheduledDeliverySectionProps = {
  onOpenDeliveryDate: () => void;
  onOpenFulfillmentMethod?: () => void;
  onOpenAssortment?: () => void;   // new
  taskDetail: TaskDetailRaw | null;
};
```

9c. Destructure new prop:
```ts
const { onOpenDeliveryDate, onOpenFulfillmentMethod, onOpenAssortment, taskDetail } = props;
// (or add to existing destructure)
```

9d. After the `TaskFulfillmentMethodPill` block, add:
```tsx
{isReturnTask && isStoreReturn ? (
  <TaskAssortmentPill
    assortment={task.assortment ?? null}
    onPress={onOpenAssortment}
  />
) : null}
```

---

### Step 10 — Create `TaskAssortmentSheetPage`

**File (new):** `packages/tasks/src/pages/TaskAssortmentSheetPage.tsx`

The page uses local state for the text input value, initialized from the task query. It calls `updatePostHandling.mutate` on save and closes via `header?.requestClose()`.

```tsx
import { useEffect, useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { FieldLabelRow, NumericKeyboardBar, TextInput } from "@beyo/ui";

import { useUpdatePostHandling } from "../actions/use-update-post-handling";
import { useGetTaskQuery } from "../api/use-get-task-query";
import type { TaskAssortmentSheetSurfaceProps } from "../surface-ids";

export function TaskAssortmentSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskAssortmentSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updatePostHandling = useUpdatePostHandling();
  const [value, setValue] = useState(taskQuery.data?.task.assortment ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const displayValue = value != null ? String(value) : "";

  useEffect(() => {
    header?.setTitle("Assortment Position");
    header?.setActions(null);
  }, [header]);

  // Sync initial value once the query resolves
  useEffect(() => {
    if (taskQuery.data?.task.assortment != null) {
      setValue(taskQuery.data.task.assortment);
    }
  }, [taskQuery.data?.task.assortment]);

  function handleSave() {
    if (!taskId) {
      return;
    }

    header?.requestClose();
    updatePostHandling.mutate({
      taskId,
      assortment: value.trim() || null,
    });
  }

  return (
    <div
      className="flex flex-col gap-4 px-4 pb-4 pt-2"
      data-testid="task-assortment-sheet-page"
    >
      <div className="flex flex-col gap-1.5">
        <FieldLabelRow htmlFor="assortment-sheet" label="Assortment Position" />
        <TextInput
          data-testid="task-assortment-sheet-input"
          id="assortment-sheet"
          type="text"
          placeholder="e.g. A3"
          value={displayValue}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        <NumericKeyboardBar
          hasFocus={isFocused}
          value={displayValue}
          onChange={(next) => setValue(next)}
        />
      </div>
      <button
        className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
        data-testid="task-assortment-save-button"
        type="button"
        onClick={handleSave}
      >
        Save
      </button>
    </div>
  );
}
```

> **Note:** Verify the Save button's className against the existing primary button pattern in the app (e.g. look at another sheet page's save button). Adjust if `@beyo/ui` exposes a `Button` component with `variant="primary"` — prefer the UI component over raw className.

---

### Step 11 — Export from `packages/tasks/src/index.ts`

Add to the public API:

```ts
export { TaskAssortmentPill } from "./components/detail";

export {
  TASK_ASSORTMENT_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  TaskAssortmentSheetSurfaceProps,
} from "./surface-ids";

export function loadTaskAssortmentSheetPage() {
  return import("./pages/TaskAssortmentSheetPage").then((m) => ({
    default: m.TaskAssortmentSheetPage,
  }));
}
```

---

### Step 12 — Register the surface in the managers app

**File:** `apps/managers-app/.../features/tasks/surfaces.ts`

12a. Add import at top:
```ts
import {
  TASK_ASSORTMENT_SHEET_SURFACE_ID,
  loadTaskAssortmentSheetPage,
} from "@beyo/tasks";
```

12b. Create lazy component:
```ts
const taskAssortmentSheet = lazyWithPreload(loadTaskAssortmentSheetPage);
```

12c. Add to `taskSurfaces` object:
```ts
[TASK_ASSORTMENT_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: taskAssortmentSheet.Component,
},
```

12d. Re-export the new surface ID and props type:
```ts
export {
  TASK_ASSORTMENT_SHEET_SURFACE_ID,
} from "@beyo/tasks";
export type {
  TaskAssortmentSheetSurfaceProps,
} from "@beyo/tasks";
```

---

### Step 13 — Add `openAssortmentSheet` to the task detail flow

**File:** `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts`

13a. Import:
```ts
import {
  TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID,
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  TASK_ASSORTMENT_SHEET_SURFACE_ID,   // new
} from "@beyo/tasks";
```

13b. Add to the return object:
```ts
openAssortmentSheet: () =>
  surface.open(TASK_ASSORTMENT_SHEET_SURFACE_ID, { taskId }),
```

---

### Step 14 — Pass `onOpenAssortment` from `TaskDetailSlidePage`

**File:** `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx`

In the `<TaskScheduledDeliverySection>` element, add:
```tsx
<TaskScheduledDeliverySection
  onOpenDeliveryDate={controller.openDeliveryDateSheet}
  onOpenFulfillmentMethod={controller.openFulfillmentMethodSheet}
  onOpenAssortment={controller.openAssortmentSheet}   // new
  taskDetail={controller.taskDetail}
/>
```

---

## File change summary

| # | File | Change |
|---|---|---|
| 1 | `packages/items/src/components/ItemPositionField.tsx` | Rename label "Position" → "Current Position" |
| 2 | `packages/task-creation/src/types.ts` | Add `assortment: z.string().optional()` to `ReturnFormSchema` |
| 3 (new) | `packages/task-creation/src/components/TaskAssortmentField.tsx` | New field component (useController on `"assortment"`) |
| 4 | `packages/task-creation/src/components/ReturnFormContent.tsx` | Import + conditional render of `TaskAssortmentField`; extend defaults/reset; add field to step map |
| 5 | `packages/task-creation/src/lib/normalize-task-form-payload.ts` | Add `assortment: toOptionalString(values.assortment)` to payload |
| 6 | `packages/tasks/src/surface-ids.ts` | Add `TASK_ASSORTMENT_SHEET_SURFACE_ID` + `TaskAssortmentSheetSurfaceProps` |
| 7 (new) | `packages/tasks/src/components/detail/TaskAssortmentPill.tsx` | New pill component mirroring `TaskFulfillmentMethodPill` |
| 8 | `packages/tasks/src/components/detail/index.ts` | Export `TaskAssortmentPill` |
| 9 | `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx` | Add `onOpenAssortment` prop + render `TaskAssortmentPill` when store_return |
| 10 (new) | `packages/tasks/src/pages/TaskAssortmentSheetPage.tsx` | New sheet page (local state + TextInput + NumericKeyboardBar + Save button) |
| 11 | `packages/tasks/src/index.ts` | Export `TaskAssortmentPill`, loader, surface ID, props type |
| 12 | `apps/managers-app/.../features/tasks/surfaces.ts` | Register `taskAssortmentSheet`; re-export ID + type |
| 13 | `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts` | Import new surface ID; add `openAssortmentSheet` to return |
| 14 | `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` | Pass `onOpenAssortment={controller.openAssortmentSheet}` |

**Total: 14 files (3 new, 11 modified)**

## Risks and mitigations

- Risk: `NumericKeyboardBar` in `TaskAssortmentSheetPage` has no `hasFocus` guard and shows permanently.
  Mitigation: Use local `isFocused` state with `onFocus`/`onBlur` on `TextInput`, exactly as in `ItemPositionField`.

- Risk: The save button className may not match the app's button primitive.
  Mitigation: Step 10 includes a note to verify the Save button className against existing sheet pages. If `@beyo/ui` exports a `Button` component, use `<Button variant="primary" ...>` instead of the raw `<button>` with className.

- Risk: `useEffect` sync of the task query value into `useState` fires after mount and could override user edits if the query re-fetches mid-edit.
  Mitigation: Only initialize `useState` once from `taskQuery.data?.task.assortment` via the initial arg; remove the secondary sync `useEffect` if re-fetch during edit is possible. Alternatively, gate the sync with a `hasInitialized` ref so it only fires on first non-null data.

- Risk: `assortment` field added to `RETURN_STEP_FIELDS_MAP.task` triggers unnecessary validation on step advance.
  Mitigation: Since the field has no validation rule, `form.trigger(["assortment"])` always resolves `true`. No impact.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all 14 changed files
- Manual: Open return task creation, select "Store Return" → verify "Current Position" and "Assortment Position" fields appear
- Manual: Fill assortment, submit → verify API payload contains `assortment` key
- Manual: Open an existing store-return task detail → verify `TaskAssortmentPill` renders in `DashedInfoSection`
- Manual: Press pill → verify sheet opens with correct current value
- Manual: Edit value, press Save → verify optimistic update in the task detail and network request to `PATCH /api/v1/tasks/:id/post-handling`

## Review log

_(empty — awaiting Codex execution)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
