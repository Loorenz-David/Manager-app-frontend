# PLAN_task_date_direct_calendar_20260626

## Metadata

- Plan ID: `PLAN_task_date_direct_calendar_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T00:00:00Z`
- Last updated at (UTC): `2026-06-25T22:37:30Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Replace the current two-step UX (intermediate sheet with a field + Save button → nested calendar surface) with a single step: tapping a date pill opens a sheet that renders the calendar picker directly. When the user makes a valid selection the mutation fires immediately and the sheet closes — no Save button needed.
- Business/user intent: The current flow requires the user to tap the pill, then tap the date field inside the sheet, then interact with the calendar in a second sheet, then tap Save. That is three interactions too many. The new flow is: tap pill → calendar sheet → tap date → done.
- Non-goals: Do not add a "clear" / unset option. Do not change the pill components (`TaskReadyByAtPill`, `TaskScheduledDeliveryDatePill`) or `TaskScheduledDeliverySection`. Do not expose these controls to the workers app. Do not change the mutation hooks or API files.

## Scope

- In scope:
  - **`packages/tasks/src/surface-ids.ts`** — Remove `CalendarSinglePickerProps`, `CalendarRangePickerProps`, `TaskReadyByAtSheetSurfaceOpeners`, and `TaskScheduledDeliverySheetSurfaceOpeners` local types. Simplify `TaskReadyByAtSheetSurfaceProps` and `TaskScheduledDeliverySheetSurfaceProps` to `{ taskId: string }` (no prefill, no surfaceOpeners).
  - **`packages/tasks/src/pages/TaskReadyByAtSheetPage.tsx`** — Complete rewrite. Renders `DayCalendar` (from `@beyo/ui`) directly in single-select mode. Reads the current `ready_by_at` from `useGetTaskQuery` to seed initial selection. When `onSelect` fires with a date, calls `header.requestClose()` then `useUpdateTaskReadyByAt.mutate()`. No form, no Save button, no surfaceOpeners.
  - **`packages/tasks/src/pages/TaskScheduledDeliverySheetPage.tsx`** — Complete rewrite. Renders `BoxSlidePicker` (from/to tabs) + `DayCalendar` in range mode, mirroring the shape of `CalendarRangePickerPage` in `@beyo/task-creation` but owning the mutation. Uses `resolveRangeSelection` from `@beyo/lib` directly. When `resolution.shouldClose === true`, calls `header.requestClose()` then `useUpdateTaskSchedule.mutate()`. No form, no Save button, no surfaceOpeners.
  - **`packages/tasks/src/index.ts`** — Remove `TaskReadyByAtSheetSurfaceOpeners` and `TaskScheduledDeliverySheetSurfaceOpeners` from the type export block.
  - **`apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-task-detail.flow.ts`** — Remove `CALENDAR_SINGLE_PICKER_SURFACE_ID` / `CALENDAR_RANGE_PICKER_SURFACE_ID` imports from `@beyo/task-creation`. Remove `TaskReadyByAtSheetSurfaceOpeners`, `TaskReadyByAtSheetSurfaceProps`, `TaskScheduledDeliverySheetSurfaceOpeners`, `TaskScheduledDeliverySheetSurfaceProps` imports from `@beyo/tasks`. Remove the two `useMemo` blocks that constructed surfaceOpeners for the calendar. Simplify `openReadyByAtSheet` and `openDeliveryDateSheet` to just `surface.open(SURFACE_ID, { taskId })`.

- Out of scope:
  - Mutation hooks (`use-update-task-ready-by-at.ts`, `use-update-task-schedule.ts`) — unchanged.
  - API files (`update-task-ready-by-at.ts`, `update-task-schedule.ts`) — unchanged.
  - Pill components (`TaskReadyByAtPill`, `TaskScheduledDeliveryDatePill`) — unchanged.
  - `TaskScheduledDeliverySection` — unchanged.
  - Surface registrations in `features/tasks/surfaces.ts` — unchanged (the two lazy imports and `taskSurfaces` entries are still correct).
  - `features/tasks/index.ts` in managers app — unchanged (the `TaskReadyByAtSheetSurfaceProps` and `TaskScheduledDeliverySheetSurfaceProps` type re-exports remain valid with the simplified props).

- Assumptions:
  - `DayCalendar`, `parseISOToDate`, `serializeDateToISO`, `BoxSlidePicker`, `formatDateDisplay` are all exported from `@beyo/ui` — confirmed by reading `CalendarSinglePickerPage.tsx` and `CalendarRangePickerPage.tsx` in `@beyo/task-creation`.
  - `resolveRangeSelection` from `@beyo/lib` encapsulates the exact same range-completion logic that `CalendarRangePickerPage` uses. `shouldClose: true` is the authoritative signal that the user has completed a valid range selection.
  - `header.requestClose()` called before `mutate()` produces the correct snappy close animation (matches the existing optimistic-close pattern from `TaskWorkingSectionsSlidePage` and previous sheet pages).
  - The `useGetTaskQuery(taskId)` call inside the new pages will return immediately from cache because `TaskDetailSlidePage` already fetched the task before the pill became tappable.
  - Clearing `ready_by_at` (setting to null) is out of scope; the guard `if (!date) return` in `handleSelect` is correct.

## Corrections already applied — Codex must NOT revert

Two bugs in the previous implementation were already corrected in the working tree before this plan was written. Codex must preserve them:

1. **`packages/lib/src/date/format-short-date.ts` line 50** — range separator must be Unicode `→` (U+2192), NOT ASCII `->`:
   ```ts
   return `${startFormatted} → ${endFormatted}`;
   ```

2. **`packages/tasks/src/components/detail/TaskScheduledDeliveryDatePill.tsx` line 1** — `isoWeek` must be imported directly from `@beyo/lib`, NOT from `../../lib/task-detail`:
   ```ts
   import { isoWeek } from "@beyo/lib";
   import { EyebrowLabel, InfoPill } from "@beyo/ui";
   ```

## Clarifications required

_None — cause and fix are fully understood._

## Acceptance criteria

1. Tapping the "Ready by" pill opens a sheet showing a single-date calendar. The date that is already set for `ready_by_at` is pre-selected (highlighted). Tapping a date immediately fires `PATCH /api/v1/tasks/{task_id}/ready-by-at` and closes the sheet — no Save button.
2. Tapping the "Delivery window" pill opens a sheet showing From/To tabs + a range calendar. The existing `scheduled_start_at`/`scheduled_end_at` dates are pre-highlighted. Selecting the "To" date (whether same as existing or different) fires `PATCH /api/v1/tasks/{task_id}/schedule` and closes the sheet — no Save button.
3. If the user opens the delivery sheet and only selects a "From" date then dismisses without selecting "To", no mutation fires and no data is changed.
4. `npm run typecheck` from `apps/managers-app/ManagerBeyo-app-managers` passes with zero errors.
5. No reference to `TaskReadyByAtSheetSurfaceOpeners` or `TaskScheduledDeliverySheetSurfaceOpeners` exists anywhere in the live source tree (docs/archives excluded).
6. Corrections from the previous plan (Unicode `→` and `@beyo/lib` import) are still present and unchanged.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md §13` (surfaceOpeners pattern): The new pages render `DayCalendar` and `BoxSlidePicker` from `@beyo/ui` directly — no cross-package surface opening from within the package. This is fully compliant: the pages are now self-contained and do not open any surface they don't own.
- `architecture/08_hooks.md` (action hook pattern): Mutations continue to use the existing `useUpdateTaskReadyByAt` and `useUpdateTaskSchedule` hooks unchanged.

### Key source files to read before writing

Codex must read these files before modifying anything, as the implementation mirrors their exact import patterns:

- `packages/task-creation/src/pages/CalendarSinglePickerPage.tsx` — reference for `DayCalendar` single-mode usage and `parseISOToDate`/`serializeDateToISO` import pattern
- `packages/task-creation/src/pages/CalendarRangePickerPage.tsx` — reference for `BoxSlidePicker` + `DayCalendar` range-mode usage and `resolveRangeSelection` usage
- `packages/tasks/src/pages/TaskReadyByAtSheetPage.tsx` — current file being replaced
- `packages/tasks/src/pages/TaskScheduledDeliverySheetPage.tsx` — current file being replaced
- `packages/tasks/src/surface-ids.ts` — to identify the exact blocks to remove
- `packages/tasks/src/index.ts` — to identify the exact type export lines to remove
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-task-detail.flow.ts` — to identify the exact blocks to remove

## Implementation plan

---

### Step 1 — `packages/tasks/src/surface-ids.ts`: strip openers and local calendar types

Read the file first. Then remove:

- The entire `CalendarSinglePickerProps` local type block
- The entire `CalendarRangePickerProps` local type block
- The entire `TaskReadyByAtSheetSurfaceOpeners` type
- The entire `TaskScheduledDeliverySheetSurfaceOpeners` type
- The `surfaceOpeners?` and `prefill?` fields from `TaskReadyByAtSheetSurfaceProps`
- The `surfaceOpeners?` and `prefill?` fields from `TaskScheduledDeliverySheetSurfaceProps`

After the edit the two surface prop types must be:

```ts
export type TaskReadyByAtSheetSurfaceProps = {
  taskId: string;
};

export type TaskScheduledDeliverySheetSurfaceProps = {
  taskId: string;
};
```

The surface ID constants (`TASK_READY_BY_AT_SHEET_SURFACE_ID`, `TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID`) are unchanged.

---

### Step 2 — `packages/tasks/src/pages/TaskReadyByAtSheetPage.tsx`: rewrite

Replace the entire file content:

```tsx
import { useEffect, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { DayCalendar, parseISOToDate, serializeDateToISO } from "@beyo/ui";

import { useUpdateTaskReadyByAt } from "../actions/use-update-task-ready-by-at";
import { useGetTaskQuery } from "../api/use-get-task-query";
import { type TaskReadyByAtSheetSurfaceProps } from "../surface-ids";

export function TaskReadyByAtSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskReadyByAtSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateReadyByAt = useUpdateTaskReadyByAt();
  const task = taskQuery.data?.task;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    parseISOToDate(task?.ready_by_at ?? null),
  );

  useEffect(() => {
    header?.setTitle("Ready by");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!taskQuery.isPending) {
      setSelectedDate(parseISOToDate(task?.ready_by_at ?? null));
    }
  }, [taskQuery.isPending, task?.ready_by_at]);

  function handleSelect(date: Date | undefined) {
    if (!taskId || !date) {
      return;
    }

    setSelectedDate(date);
    header?.requestClose();
    updateReadyByAt.mutate({ taskId, ready_by_at: serializeDateToISO(date) });
  }

  return (
    <DayCalendar
      mode="single"
      onSelect={handleSelect}
      selected={selectedDate}
    />
  );
}
```

---

### Step 3 — `packages/tasks/src/pages/TaskScheduledDeliverySheetPage.tsx`: rewrite

Replace the entire file content. Mirror the exact shape of `CalendarRangePickerPage` for the calendar interaction, with the mutation wired into `handleDayClick` when `resolution.shouldClose === true`.

```tsx
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { resolveRangeSelection } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  BoxSlidePicker,
  DayCalendar,
  formatDateDisplay,
  parseISOToDate,
  serializeDateToISO,
} from "@beyo/ui";

import { useUpdateTaskSchedule } from "../actions/use-update-task-schedule";
import { useGetTaskQuery } from "../api/use-get-task-query";
import { type TaskScheduledDeliverySheetSurfaceProps } from "../surface-ids";

export function TaskScheduledDeliverySheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskScheduledDeliverySheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateSchedule = useUpdateTaskSchedule();
  const task = taskQuery.data?.task;

  const [activeTarget, setActiveTarget] = useState<"from" | "to">("from");
  const [fromDate, setFromDate] = useState<Date | undefined>(
    parseISOToDate(task?.scheduled_start_at ?? null),
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    parseISOToDate(task?.scheduled_end_at ?? null),
  );

  useEffect(() => {
    header?.setTitle("Delivery window");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!taskQuery.isPending) {
      setFromDate(parseISOToDate(task?.scheduled_start_at ?? null));
      setToDate(parseISOToDate(task?.scheduled_end_at ?? null));
    }
  }, [taskQuery.isPending, task?.scheduled_start_at, task?.scheduled_end_at]);

  function handleDayClick(date: Date) {
    if (!taskId) {
      return;
    }

    const resolution = resolveRangeSelection({
      activeTarget,
      clickedDate: date,
      fromDate,
      toDate,
    });

    setFromDate(resolution.fromDate);
    setToDate(resolution.toDate);
    setActiveTarget(resolution.nextActiveTarget);

    if (resolution.shouldClose) {
      header?.requestClose();
      updateSchedule.mutate({
        taskId,
        scheduled_start_at: resolution.fromDate
          ? serializeDateToISO(resolution.fromDate)
          : null,
        scheduled_end_at: resolution.toDate
          ? serializeDateToISO(resolution.toDate)
          : null,
      });
    }
  }

  return (
    <div data-testid="task-scheduled-delivery-sheet-page">
      <BoxSlidePicker
        className="mx-4 mb-4 mt-2"
        dataTestId="delivery-date-range-tabs"
        options={[
          {
            value: "from",
            testId: "delivery-date-from-tab",
            label: (
              <span className="flex min-w-0 flex-col items-center">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
                  From
                </span>
                <span
                  className={
                    fromDate
                      ? "mt-0.5 text-sm font-medium text-foreground"
                      : "mt-0.5 text-sm font-medium text-muted-foreground"
                  }
                >
                  {fromDate
                    ? formatDateDisplay(serializeDateToISO(fromDate))
                    : "Select start"}
                </span>
              </span>
            ),
          },
          {
            value: "to",
            testId: "delivery-date-to-tab",
            label: (
              <span className="flex min-w-0 flex-col items-center">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
                  To
                </span>
                <span
                  className={
                    toDate
                      ? "mt-0.5 text-sm font-medium text-foreground"
                      : "mt-0.5 text-sm font-medium text-muted-foreground"
                  }
                >
                  {toDate
                    ? formatDateDisplay(serializeDateToISO(toDate))
                    : "Select end"}
                </span>
              </span>
            ),
          },
        ]}
        value={activeTarget}
        onValueChange={(v) => {
          setActiveTarget(v as "from" | "to");
        }}
      />
      <DayCalendar
        mode="range"
        onDayClick={handleDayClick}
        onSelect={(_range: DateRange | undefined) => {}}
        selected={{ from: fromDate, to: toDate }}
      />
    </div>
  );
}
```

**Note on `onValueChange` typing**: `CalendarRangePickerPage` passes `setActiveTarget` directly to `BoxSlidePicker.onValueChange`. If `BoxSlidePicker` is generic over the value type, `setActiveTarget` can be passed directly; if it expects `(v: string) => void`, use the explicit cast shown above. Read the existing `CalendarRangePickerPage` import and match its exact usage.

---

### Step 4 — `packages/tasks/src/index.ts`: remove surfaceOpeners type exports

Read the file. Find the type export block that includes `TaskReadyByAtSheetSurfaceOpeners` and `TaskScheduledDeliverySheetSurfaceOpeners`. Remove those two lines. The block currently looks like:

```ts
export type {
  RecoveredPendingAdd,
  RecoveredPendingReassignment,
  TaskReadyByAtSheetSurfaceOpeners,       // ← remove
  TaskReadyByAtSheetSurfaceProps,
  TaskScheduledDeliverySheetSurfaceOpeners, // ← remove
  TaskScheduledDeliverySheetSurfaceProps,
  TaskWorkingSectionsDiscardChangesSurfaceProps,
  TaskWorkingSectionsSurfaceOpeners,
  TaskWorkingSectionsSurfaceProps,
} from "./surface-ids";
```

After the edit, the block must not contain `TaskReadyByAtSheetSurfaceOpeners` or `TaskScheduledDeliverySheetSurfaceOpeners`.

---

### Step 5 — `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts`: simplify

Read the file. Make the following changes:

**Remove these imports entirely:**
```ts
import {
  CALENDAR_RANGE_PICKER_SURFACE_ID,
  CALENDAR_SINGLE_PICKER_SURFACE_ID,
} from "@beyo/task-creation";
```
and the following type imports (remove only these four names from the `@beyo/tasks` import block; keep the rest):
```ts
  type TaskReadyByAtSheetSurfaceOpeners,
  type TaskReadyByAtSheetSurfaceProps,
  type TaskScheduledDeliverySheetSurfaceOpeners,
  type TaskScheduledDeliverySheetSurfaceProps,
```

**Remove these two `useMemo` blocks entirely:**
```ts
const readyByAtSurfaceOpeners = useMemo<TaskReadyByAtSheetSurfaceOpeners>(
  () => ({
    openCalendarSinglePicker: (props) =>
      surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props),
  }),
  [surface],
);
const scheduledDeliverySurfaceOpeners =
  useMemo<TaskScheduledDeliverySheetSurfaceOpeners>(
    () => ({
      openCalendarRangePicker: (props) =>
        surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props),
    }),
    [surface],
  );
```

**Replace the two `openReadyByAtSheet` and `openDeliveryDateSheet` return values:**

Before:
```ts
openReadyByAtSheet: () =>
  surface.open(TASK_READY_BY_AT_SHEET_SURFACE_ID, {
    taskId,
    surfaceOpeners: readyByAtSurfaceOpeners,
  } satisfies TaskReadyByAtSheetSurfaceProps),
openDeliveryDateSheet: () =>
  surface.open(TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID, {
    taskId,
    surfaceOpeners: scheduledDeliverySurfaceOpeners,
  } satisfies TaskScheduledDeliverySheetSurfaceProps),
```

After:
```ts
openReadyByAtSheet: () =>
  surface.open(TASK_READY_BY_AT_SHEET_SURFACE_ID, { taskId }),
openDeliveryDateSheet: () =>
  surface.open(TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID, { taskId }),
```

Verify that `useMemo` is still imported (it is still used for `surfaceOpeners` for working sections).

---

## Risks and mitigations

- Risk: The `useEffect` that initialises `selectedDate`/`fromDate`/`toDate` from the query may run on every re-render of the sheet if the task data hasn't loaded (isPending flips after initial render). The guard `if (!taskQuery.isPending)` prevents re-initialising after the user has already made a selection mid-session.
  Mitigation: Since the task detail page fetches the task before these sheets can be opened, `taskQuery.isPending` will be false on first render in practice. The guard is a safety net.

- Risk: `TaskReadyByAtSheetSurfaceProps` and `TaskScheduledDeliverySheetSurfaceProps` are re-exported from `features/tasks/surfaces.ts` and `features/tasks/index.ts` in the managers app. Removing `surfaceOpeners?` and `prefill?` from these types is a breaking change to consumers that currently spread those types.
  Mitigation: No external consumers pass `surfaceOpeners` or `prefill` to these surface IDs — only the flow does, and the flow is updated in Step 5. Grep for these prop names across the full source tree before committing.

- Risk: `BoxSlidePicker.onValueChange` type may not accept the `(v: string) => void` cast cleanly; TypeScript strict mode may flag it.
  Mitigation: Mirror the exact pattern used in `CalendarRangePickerPage`. If `setActiveTarget` can be passed directly (as it is there), do so.

- Risk: `DayCalendar` in `mode="single"` expects `onSelect?: (date: Date | undefined) => void`. The `handleSelect` function in Step 2 matches that signature.
  Mitigation: Read `CalendarSinglePickerPage` before writing Step 2 to confirm the exact prop name and signature used.

## Validation plan

- `npm run typecheck` from `frontend/apps/managers-app/ManagerBeyo-app-managers`: zero TypeScript errors
- `./node_modules/.bin/tsc -p packages/tasks/tsconfig.json --noEmit`: zero errors
- Manual test:
  - Tap "Ready by" pill → sheet opens showing calendar (no field, no Save button) → tap a date → mutation fires, sheet closes, pill updates
  - Tap "Delivery window" pill → sheet opens showing From/To tabs + range calendar → tap "From" date → tab moves to "To", no mutation → tap "To" date → mutation fires, sheet closes, pill updates (still shows "Week X")
  - Dismiss delivery sheet after selecting only "From" → no mutation, no data change
  - Both corrections verified: `→` separator in `format-short-date.ts:50`; `isoWeek` imported from `@beyo/lib` in `TaskScheduledDeliveryDatePill.tsx:1`

## Review log

_(empty — awaiting Codex execution)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
