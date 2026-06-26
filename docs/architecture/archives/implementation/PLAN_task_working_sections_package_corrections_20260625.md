# PLAN_task_working_sections_package_corrections_20260625

## Metadata

- Plan ID: `PLAN_task_working_sections_package_corrections_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T18:23:12Z`
- Related issue/ticket: —
- Intention plan: —
- Source review: `docs/architecture/implemented_summaries/SUMMARY_task_working_sections_to_package_20260625.md`

## Goal and intent

- Goal: Correct four issues found in the post-implementation review of `PLAN_task_working_sections_to_package_20260625`: (1) dead export, (2) unstable surfaceOpeners object, (3) unnecessary type cast from a weak generic constraint, and (4) two pre-existing §13 violations in the tasks package date field components.
- Business/user intent: Keep the package boundary clean and consistent — the §13 fix for the date fields was the same pattern just applied in the working sections migration, so leaving them as-is is an inconsistency that will grow.
- Non-goals: Migrating the task creation form to packages (PLAN_A / PLAN_B). Adding calendar surface IDs as exported constants. Changing the calendar picker pages themselves.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts` — remove dead `preloadTaskWorkingSectionsSurface` export (fix 1)
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-task-detail.flow.ts` — memoize `surfaceOpeners` with `useMemo` (fix 2)
  - `packages/hooks/src/use-surface-props.ts` — change generic constraint `T extends Record<string, unknown>` → `T extends object` (fix 3a)
  - `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx` — remove type cast on line 239 after fix 3a (fix 3b)
  - `packages/tasks/src/components/fields/TaskDeliveryDateField.tsx` — replace `useSurfaceStore.getState().open(...)` with an injected `onOpenCalendarRangePicker` prop (fix 4)
  - `packages/tasks/src/components/fields/TaskReadyByDateField.tsx` — replace `useSurfaceStore.getState().open(...)` with an injected `onOpenCalendarSinglePicker` prop (fix 4)
  - `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskScheduledDateSheetPage.tsx` — provide the two calendar openers via `useSurface()` (fix 4 caller update)
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx` — provide the two calendar openers via `useSurface()` (fix 4 caller update)

- Out of scope:
  - Exporting `CalendarRangePickerSurfaceProps` / `CalendarSinglePickerSurfaceProps` from `@beyo/ui` (separate concern)
  - `packages/tasks/src/index.ts` — no new public exports needed; the field props types are kept internal
  - Moving calendar pages to a package
  - Changing the calendar surface IDs to exported constants

- Assumptions:
  - `useSurface()` from `@/hooks/use-surface` exposes a stable `open` method — using it as a `useMemo` dep in the flow will not cause recreation loops.
  - Changing `T extends Record<string, unknown>` → `T extends object` in `useSurfaceProps` is backward compatible — every type that previously satisfied `Record<string, unknown>` also satisfies `object`.
  - If fix 3a does not eliminate the type error in the slide page, Codex should leave the `use-surface-props.ts` unchanged, keep the existing cast in the slide page, and add an inline comment `// useSurfaceProps Partial<T> loses function types through Record<string,unknown> constraint` — typecheck must still pass.

## Clarifications required

None — scope is fully specified.

## Acceptance criteria

1. `preloadTaskWorkingSectionsSurface` is not exported from `surfaces.ts` and no file in the app imports it.
2. `surfaceOpeners` in `use-task-detail.flow.ts` is wrapped in `useMemo`.
3. No `as TaskWorkingSectionsSurfaceOpeners | undefined` cast in `TaskWorkingSectionsSlidePage.tsx` (or, if fix 3a does not resolve the TypeScript error, a comment explains why).
4. `TaskDeliveryDateField` and `TaskReadyByDateField` contain zero `useSurfaceStore` imports.
5. `TaskScheduledDateSheetPage` and `TestingFormsContent` pass the calendar opener props to the two fields.
6. `npm run typecheck` from `frontend/` produces zero TypeScript errors.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md` §13: surface openers injection pattern — trigger fields read openers from props/context, never call `useSurface`/`useSurfaceStore` directly.

### File read intent — pattern vs. relational

Permitted relational reads before coding:
- `packages/tasks/src/components/fields/TaskDeliveryDateField.tsx` — read to confirm the exact props object passed to `useSurfaceStore.getState().open(...)` ✓ (already read)
- `packages/tasks/src/components/fields/TaskReadyByDateField.tsx` — same ✓ (already read)
- `pages/calendar/CalendarRangePickerPage.tsx` — read to get exact `CalendarRangePickerSurfaceProps` type ✓ (already read: `{ currentFrom, currentTo, initialTarget?, onFromSelect, onToSelect, fromLabel?, toLabel? }`)
- `pages/calendar/CalendarSinglePickerPage.tsx` — read to get exact `CalendarSinglePickerSurfaceProps` type ✓ (already read: `{ currentValue, onSelect, title?, minDate?, maxDate?, quickSelectOptions? }`)
- `apps/.../pages/tasks/TaskScheduledDateSheetPage.tsx` — read before editing to confirm current `useSurface` usage (**read at Step 7**)
- `apps/.../features/testing_forms/components/TestingFormsContent.tsx` — read before editing (**read at Step 8**)

---

## Calendar surface props types (established from read)

These types are defined locally in each field file (not exported from `index.ts` — they are implementation details of the field props).

```ts
// Used inside TaskDeliveryDateField.tsx
type CalendarRangePickerProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: "from" | "to";
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
};
```

```ts
// Used inside TaskReadyByDateField.tsx
type CalendarQuickSelectOption = { label: string; getValue: () => string | null };

type CalendarSinglePickerProps = {
  currentValue: string | null;
  onSelect: (isoString: string | null) => void;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
  quickSelectOptions?: CalendarQuickSelectOption[];
};
```

> `CalendarQuickSelectOption` matches the type used by `TASK_READY_BY_QUICK_SELECT_OPTIONS`. Verify by reading `task-ready-by-quick-select-options.ts` at Step 6 if the type shape is uncertain.

---

## Implementation plan

### Fix 1 — Delete dead export in `surfaces.ts`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`

Delete this block (lines 196–197):
```ts
export const preloadTaskWorkingSectionsSurface =
  taskWorkingSectionsSlide.preload;
```

Grep `preloadTaskWorkingSectionsSurface` across the app to confirm no remaining callers before deleting. If any caller exists, update it to call `taskWorkingSectionsSlide.preload` directly or remove the call if it was only called from inside the slide page (which now handles preloading internally).

---

### Fix 2 — Memoize `surfaceOpeners` in `use-task-detail.flow.ts`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-task-detail.flow.ts`

Add `useMemo` import from `"react"`. Wrap the `surfaceOpeners` object:

```ts
import { useMemo } from "react";

// Inside useTaskDetailFlow:
const surfaceOpeners = useMemo<TaskWorkingSectionsSurfaceOpeners>(
  () => ({
    closeSlide: () =>
      useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID),
    closeDiscardSheet: () =>
      useSurfaceStore
        .getState()
        .close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID),
    openDiscardChangesSheet: (props) =>
      surface.open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, props),
    reopenSlideAfterError: (props) =>
      useSurfaceStore
        .getState()
        .open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, props),
    preloadWorkerPickerSurface: preloadWorkingSectionWorkerPickerSurface,
  }),
  [surface],
);
```

`useSurfaceStore` and `preloadWorkingSectionWorkerPickerSurface` are module-level imports — not reactive deps. Only `surface` (from `useSurface()`) is a reactive value and belongs in the deps array.

---

### Fix 3a — Loosen generic constraint in `useSurfaceProps`

**File:** `packages/hooks/src/use-surface-props.ts`

Change:
```ts
export function useSurfaceProps<T extends Record<string, unknown>>(): Partial<T> {
```
To:
```ts
export function useSurfaceProps<T extends object>(): Partial<T> {
```

`T extends object` accepts all types that `T extends Record<string, unknown>` accepted (every record is an object), plus types with function-typed values that don't distribute well through `Record<string, unknown>`. This allows TypeScript to preserve the full type of `TaskWorkingSectionsSurfaceOpeners` when the generic resolves.

Run `npm run typecheck` immediately after this change. If it produces new errors from other callers of `useSurfaceProps`, revert and leave fix 3b as a documented cast.

---

### Fix 3b — Remove type cast in `TaskWorkingSectionsSlidePage.tsx`

**File:** `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx`

Line 239 — only perform this step if fix 3a succeeded without new typecheck errors.

Change:
```tsx
surfaceOpeners={surfaceOpeners as TaskWorkingSectionsSurfaceOpeners | undefined}
```
To:
```tsx
surfaceOpeners={surfaceOpeners}
```

If fix 3a did not resolve the type error, leave the cast as-is and add a comment above it:
```tsx
{/* useSurfaceProps Partial<T> loses function types through Record<string,unknown> constraint */}
surfaceOpeners={surfaceOpeners as TaskWorkingSectionsSurfaceOpeners | undefined}
```

---

### Fix 4a — Refactor `TaskDeliveryDateField` (§13 compliance)

**File:** `packages/tasks/src/components/fields/TaskDeliveryDateField.tsx`

1. Remove `useSurfaceStore` from the `@beyo/ui` import.
2. Define a local `CalendarRangePickerProps` type (shape listed above).
3. Add `onOpenCalendarRangePicker?: (props: CalendarRangePickerProps) => void` to the component's props.
4. Replace the `useSurfaceStore.getState().open(...)` call with `onOpenCalendarRangePicker?.({...})`.

Result:
```ts
import { useController, useFormContext } from "react-hook-form";
import { DateRangeFieldTrigger, FieldErrorPill, formatDateDisplay } from "@beyo/ui";

type CalendarRangePickerProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: "from" | "to";
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
};

type TaskDeliveryDateFieldProps = {
  onOpenCalendarRangePicker?: (props: CalendarRangePickerProps) => void;
};

export function TaskDeliveryDateField({
  onOpenCalendarRangePicker,
}: TaskDeliveryDateFieldProps = {}): React.JSX.Element {
  // ...
  function handlePress(initialTarget: "from" | "to") {
    onOpenCalendarRangePicker?.({
      currentFrom: startField.value ?? null,
      currentTo: endField.value ?? null,
      initialTarget,
      onFromSelect: (iso) => startField.onChange(iso),
      onToSelect: (iso) => endField.onChange(iso),
    });
  }
  // ... rest unchanged
}
```

---

### Fix 4b — Refactor `TaskReadyByDateField` (§13 compliance)

**File:** `packages/tasks/src/components/fields/TaskReadyByDateField.tsx`

1. Remove `useSurfaceStore` from the `@beyo/ui` import.
2. Read `packages/tasks/src/components/fields/task-ready-by-quick-select-options.ts` to confirm the `CalendarQuickSelectOption` type shape.
3. Define local `CalendarQuickSelectOption` and `CalendarSinglePickerProps` types (shapes listed above).
4. Add `onOpenCalendarSinglePicker?: (props: CalendarSinglePickerProps) => void` to the component's props.
5. Replace the `useSurfaceStore.getState().open(...)` call with `onOpenCalendarSinglePicker?.({...})`.

Result:
```ts
import { useController, useFormContext } from "react-hook-form";
import { DateFieldTrigger, FieldErrorPill, formatDateDisplay } from "@beyo/ui";
import { TASK_READY_BY_QUICK_SELECT_OPTIONS } from "./task-ready-by-quick-select-options";

type CalendarQuickSelectOption = { label: string; getValue: () => string | null };

type CalendarSinglePickerProps = {
  currentValue: string | null;
  onSelect: (isoString: string | null) => void;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
  quickSelectOptions?: CalendarQuickSelectOption[];
};

type TaskReadyByDateFieldProps = {
  onOpenCalendarSinglePicker?: (props: CalendarSinglePickerProps) => void;
};

export function TaskReadyByDateField({
  onOpenCalendarSinglePicker,
}: TaskReadyByDateFieldProps = {}): React.JSX.Element {
  // ...
  function handlePress() {
    onOpenCalendarSinglePicker?.({
      currentValue: field.value ?? null,
      onSelect: (iso) => field.onChange(iso),
      quickSelectOptions: TASK_READY_BY_QUICK_SELECT_OPTIONS,
      title: "Select due date",
    });
  }
  // ... rest unchanged
}
```

---

### Fix 4c — Update `TaskScheduledDateSheetPage.tsx` caller

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskScheduledDateSheetPage.tsx`

Read the file first to confirm it does not already import `useSurface`.

Add `useSurface` import from `@/hooks/use-surface` (or use the existing one if present). Pass openers to the two fields:

```tsx
const surface = useSurface();

<TaskReadyByDateField
  onOpenCalendarSinglePicker={(props) =>
    surface.open("calendar-single-picker", props)
  }
/>
<TaskDeliveryDateField
  onOpenCalendarRangePicker={(props) =>
    surface.open("calendar-range-picker", props)
  }
/>
```

Both fields already accept `= {}` as default, so they remain optional — no other callers break.

---

### Fix 4d — Update `TestingFormsContent.tsx` caller

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx`

Apply the same pattern as fix 4c. This component already imports `preloadCalendarRangePickerSurface` and `preloadCalendarSinglePickerSurface` — confirm `useSurface` is available and add the opener props to the two field usages.

---

### Fix 5 — Typecheck

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck
```

Zero errors expected. If `useSurfaceStore` is still imported anywhere in the tasks package, flag it — that is an unresolved §13 violation.

---

## File summary

| # | File | Fix |
|---|---|---|
| 1 | `apps/…/features/tasks/surfaces.ts` | Delete dead `preloadTaskWorkingSectionsSurface` export |
| 2 | `apps/…/features/tasks/flows/use-task-detail.flow.ts` | Memoize `surfaceOpeners` with `useMemo` |
| 3 | `packages/hooks/src/use-surface-props.ts` | `T extends Record<string, unknown>` → `T extends object` |
| 4 | `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx` | Remove type cast (if fix 3 succeeds) |
| 5 | `packages/tasks/src/components/fields/TaskDeliveryDateField.tsx` | Props injection; remove `useSurfaceStore` |
| 6 | `packages/tasks/src/components/fields/TaskReadyByDateField.tsx` | Props injection; remove `useSurfaceStore` |
| 7 | `apps/…/pages/tasks/TaskScheduledDateSheetPage.tsx` | Pass calendar openers via `useSurface()` |
| 8 | `apps/…/features/testing_forms/components/TestingFormsContent.tsx` | Pass calendar openers via `useSurface()` |

---

## Risks and mitigations

- Risk: Changing `T extends Record<string, unknown>` → `T extends object` in `useSurfaceProps` breaks existing callers that relied on the stricter constraint.
  Mitigation: `extends object` is a superset of `extends Record<string, unknown>` — all previously valid call sites remain valid. Run typecheck immediately after the change; revert if new errors appear.

- Risk: Fix 3a does not resolve the TypeScript error in the slide page (the root cause may be the circular type reference, not the constraint).
  Mitigation: If typecheck still fails after fix 3a, leave the cast and add an inline comment. Do not spend further effort on this — the cast is safe and correctly typed.

- Risk: `CalendarQuickSelectOption` type in the field does not match the shape expected by the calendar picker page.
  Mitigation: Read `task-ready-by-quick-select-options.ts` at step 4b to confirm the type shape before writing the local type. If it has additional fields, mirror them.

- Risk: `TaskScheduledDateSheetPage` or `TestingFormsContent` does not already have `useSurface` and importing it adds a new hook call.
  Mitigation: Adding `useSurface()` to a component is safe — it reads from context and is always stable. No side effects.

## Validation plan

- `npm run typecheck`: zero errors
- Grep `useSurfaceStore` in `packages/tasks/src/` — must return zero results after fix 4
- Grep `preloadTaskWorkingSectionsSurface` in app `src/` — must return zero results after fix 1

## Review log

— (none yet)

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
