# PLAN_calendar_picker_surface_wiring_20260625

## Metadata

- Plan ID: `PLAN_calendar_picker_surface_wiring_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T21:54:23Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Wire the `onOpenCalendarSinglePicker` and `onOpenCalendarRangePicker` callback props in the three task-creation form content components so that tapping a date field actually opens the calendar bottom sheet.
- Business/user intent: Tapping the "Due date" field in all three task creation forms and the "Delivery window" field in the Return and Pre-Order forms currently does nothing. The calendar sheets exist and are registered; they just are never opened because the callback that fires `surface.open()` is never provided to the field components.
- Non-goals: Do not change `TaskReadyByDateField` or `TaskDeliveryDateField` (they are correct). Do not restructure surface registration. Do not move logic to the app layer.

## Scope

- In scope:
  - `packages/task-creation/src/components/InternalFormContent.tsx` — import `CALENDAR_SINGLE_PICKER_SURFACE_ID`; pass `onOpenCalendarSinglePicker` to `<TaskReadyByDateField />`
  - `packages/task-creation/src/components/ReturnFormContent.tsx` — import `CALENDAR_SINGLE_PICKER_SURFACE_ID` + `CALENDAR_RANGE_PICKER_SURFACE_ID`; pass both callbacks to the respective fields
  - `packages/task-creation/src/components/PreOrderFormContent.tsx` — same as ReturnFormContent

- Out of scope:
  - Changes to `@beyo/tasks` field components
  - Changes to `CalendarSinglePickerPage` or `CalendarRangePickerPage`
  - Changes to `surfaces.ts` (calendar surfaces are already registered in `taskCreationSurfaces`)
  - Workers app forms

- Assumptions:
  - All three form contents already call `const surface = useSurface()` (confirmed in code).
  - The calendar surfaces `CALENDAR_SINGLE_PICKER_SURFACE_ID` and `CALENDAR_RANGE_PICKER_SURFACE_ID` are already registered in `taskCreationSurfaces` and the managers app's `surface-registry.ts` already spreads `taskCreationSurfaces`.
  - The prop shape of `CalendarSinglePickerProps` in `TaskReadyByDateField` is structurally identical to `CalendarSinglePickerSurfaceProps` in `CalendarSinglePickerPage` — the object passed through `onOpenCalendarSinglePicker` flows unchanged to `useSurfaceProps()`.
  - Same structural match for `CalendarRangePickerProps` / `CalendarRangePickerSurfaceProps`.
  - Using `surface.open()` inside `@beyo/task-creation` for surfaces it **owns and defines** (calendar pickers are in `taskCreationSurfaces`) is the established package-internal pattern — the same pattern already used for the scanner (`surface.open(SCANNER_SLIDE_SURFACE_ID, ...)`) in all three form contents.

## Clarifications required

_None — cause and fix are fully understood._

## Acceptance criteria

1. Tapping the "Due date" trigger in the Internal form opens the single-date calendar bottom sheet.
2. Tapping the "Due date" trigger in the Return form opens the single-date calendar bottom sheet.
3. Tapping the "Delivery window" trigger in the Return form opens the range-date calendar bottom sheet.
4. Tapping the "Due date" trigger in the Pre-Order form opens the single-date calendar bottom sheet.
5. Tapping the "Delivery window" trigger in the Pre-Order form opens the range-date calendar bottom sheet.
6. Selecting a date in any calendar sheet updates the form field value.
7. `npm run typecheck` from the managers app passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md §13`: confirms that packages may call `surface.open()` for surfaces they own (same pattern as existing scanner usage); the rule forbids calling into app-registered surfaces the package does not define.

### File read intent — pattern vs. relational

Permitted reads performed:
- All three form content files — to confirm `surface = useSurface()` already exists and to locate the exact render site of each field.
- `TaskReadyByDateField.tsx` and `TaskDeliveryDateField.tsx` — to confirm the callback prop names and their argument shapes.
- `CalendarSinglePickerPage.tsx` and `CalendarRangePickerPage.tsx` — to confirm surface prop shapes match the field callback argument shapes.
- `surfaces.ts` in `@beyo/task-creation` — to confirm the surface IDs are already exported and registered.

### Skill selection

- Primary skill: none (pure prop wiring — 3 files, no new logic)

## Implementation plan

### Step 1 — `InternalFormContent.tsx`: import the surface ID and wire the callback

**File:** `packages/task-creation/src/components/InternalFormContent.tsx` _(modified)_

**1a. Add `CALENDAR_SINGLE_PICKER_SURFACE_ID` to the `../surfaces` import:**

```ts
// Before:
import {
  TASK_CREATION_INTERNAL_SURFACE_ID,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";

// After:
import {
  CALENDAR_SINGLE_PICKER_SURFACE_ID,
  TASK_CREATION_INTERNAL_SURFACE_ID,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";
```

**1b. Pass the callback to `<TaskReadyByDateField />`:**

```tsx
// Before:
<TaskReadyByDateField />

// After:
<TaskReadyByDateField
  onOpenCalendarSinglePicker={(props) =>
    surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
  }
/>
```

---

### Step 2 — `ReturnFormContent.tsx`: import both surface IDs and wire both callbacks

**File:** `packages/task-creation/src/components/ReturnFormContent.tsx` _(modified)_

**2a. Add both calendar surface IDs to the `../surfaces` import:**

```ts
// Before:
import {
  TASK_CREATION_RETURN_SURFACE_ID,
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadPhoneCountryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";

// After:
import {
  CALENDAR_RANGE_PICKER_SURFACE_ID,
  CALENDAR_SINGLE_PICKER_SURFACE_ID,
  TASK_CREATION_RETURN_SURFACE_ID,
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadPhoneCountryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";
```

**2b. Pass the callback to `<TaskDeliveryDateField />` (in the "customer" step):**

```tsx
// Before:
<TaskDeliveryDateField />

// After:
<TaskDeliveryDateField
  onOpenCalendarRangePicker={(props) =>
    surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props)
  }
/>
```

**2c. Pass the callback to `<TaskReadyByDateField />` (in the "details" step):**

```tsx
// Before:
<TaskReadyByDateField />

// After:
<TaskReadyByDateField
  onOpenCalendarSinglePicker={(props) =>
    surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
  }
/>
```

---

### Step 3 — `PreOrderFormContent.tsx`: identical changes to Step 2

**File:** `packages/task-creation/src/components/PreOrderFormContent.tsx` _(modified)_

**3a. Add both calendar surface IDs to the `../surfaces` import:**

```ts
// Before:
import {
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadPhoneCountryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";

// After:
import {
  CALENDAR_RANGE_PICKER_SURFACE_ID,
  CALENDAR_SINGLE_PICKER_SURFACE_ID,
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
  preloadItemCategoryPickerSurface,
  preloadPhoneCountryPickerSurface,
  preloadScannerSlideSurface,
} from "../surfaces";
```

**3b. Pass the callback to `<TaskDeliveryDateField />` (in the "customer" step):**

```tsx
// Before:
<TaskDeliveryDateField />

// After:
<TaskDeliveryDateField
  onOpenCalendarRangePicker={(props) =>
    surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props)
  }
/>
```

**3c. Pass the callback to `<TaskReadyByDateField />` (in the "details" step):**

```tsx
// Before:
<TaskReadyByDateField />

// After:
<TaskReadyByDateField
  onOpenCalendarSinglePicker={(props) =>
    surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
  }
/>
```

---

## Risks and mitigations

- Risk: Stale closure — the callback captures `surface` from the enclosing render. If `useSurface()` returns a stable reference (as is expected from a context hook), this is not an issue.
  Mitigation: The existing scanner callback already follows this exact pattern in all three files without wrapping in `useCallback`. Treat consistently.

- Risk: Surface not mounted when opened — if `taskCreationSurfaces` is not spread into the app's `surfaceRegistry`, the sheet will silently fail.
  Mitigation: Confirmed that `app/surface-registry.ts` already imports and spreads `taskCreationSurfaces`.

## Validation plan

- `npm run typecheck` from `frontend/apps/managers-app/ManagerBeyo-app-managers`: zero TypeScript errors
- Manual test: open each of the three task creation forms via the FAB button:
  - Internal form → Task step → tap "Due date" → single calendar sheet opens
  - Return form → Customer step → tap "Delivery window" → range calendar sheet opens
  - Return form → Details step → tap "Due date" → single calendar sheet opens
  - Pre-Order form → Customer step → tap "Delivery window" → range calendar sheet opens
  - Pre-Order form → Details step → tap "Due date" → single calendar sheet opens
- Manual test: select a date — form field updates and sheet closes (for single picker); select both dates — sheet closes (for range picker)

## Review log

- `2026-06-25T21:54:23Z` — Implemented the three calendar opener prop wirings in `InternalFormContent.tsx`, `ReturnFormContent.tsx`, and `PreOrderFormContent.tsx`. `npm run typecheck` passed.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `user`
