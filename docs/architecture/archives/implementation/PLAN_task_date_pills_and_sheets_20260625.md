# PLAN_task_date_pills_and_sheets_20260625

## Metadata

- Plan ID: `PLAN_task_date_pills_and_sheets_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T22:13:15Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_task_date_fields_20260625`
- Intention plan: —

## Goal and intent

- Goal: Replace the existing "Delivery Week" pill in `TaskScheduledDeliverySection` with two always-visible tappable pills — one for `ready_by_at` (formatted date) and one for the `scheduled_start_at / scheduled_end_at` delivery window (ISO week number) — each opening a dedicated bottom sheet that uses the new focused backend endpoints. Move all logic into the `@beyo/tasks` package. Delete the now-redundant managers-app-local `TaskScheduledDateSheetPage`.
- Business/user intent: Managers cannot currently change a task's ready-by date from the detail page at all, and neither pill is an independent self-contained component (week and date logic leaks into the section). Both pills need to be standalone components that receive raw date values and do their own formatting internally, and always appear on the detail page so the manager can tap to set them even when empty.
- Non-goals: Do not change the task edit slide page (`TaskEditSlidePage`) or its broad `updateTask` mutation. Do not expose these controls to the workers app. Do not implement role-gating (ADMIN/MANAGER guard) in this plan; the handoff notes it as a requirement but it is treated as a follow-up.

## Scope

- In scope:
  - New `formatShortDate` utility in `@beyo/lib` — accepts a single date string or a start+end pair; strips the year from any date whose year matches the current year; used by `TaskReadyByAtPill` for single-date formatting and available for future range display needs
  - Move `isoWeek` to `@beyo/lib` as a shared date utility — currently defined in `packages/tasks/src/lib/task-detail.ts`; extracted to `packages/lib/src/date/iso-week.ts` and exported from `@beyo/lib`; `task-detail.ts` re-exports it from `@beyo/lib` so existing callers inside the tasks package are unaffected
  - New focused API functions and actions in `@beyo/tasks`:
    - `update-task-ready-by-at.ts` → `PATCH /api/v1/tasks/{task_id}/ready-by-at`
    - `update-task-schedule.ts` → `PATCH /api/v1/tasks/{task_id}/schedule`
    - `use-update-task-ready-by-at.ts` (action hook with optimistic update + rollback)
    - `use-update-task-schedule.ts` (action hook with optimistic update + rollback)
  - New display pill components in `@beyo/tasks/components/detail`:
    - `TaskReadyByAtPill.tsx` — receives `readyByAt` string; formats via `formatShortDate` (strips year if same as current year); shows "—" when null
    - `TaskScheduledDeliveryDatePill.tsx` — receives `scheduledStartAt` / `scheduledEndAt` raw strings; internally calculates the ISO week via `isoWeek()` (already in `@beyo/tasks`); displays "Week X" or "—" when not set; the pill owns the week-calculation logic, not the parent section
  - New surface page components in `@beyo/tasks/pages`:
    - `TaskReadyByAtSheetPage.tsx` — standalone form sheet with `TaskReadyByDateField`; saves via `useUpdateTaskReadyByAt`
    - `TaskScheduledDeliverySheetPage.tsx` — standalone form sheet with `TaskDeliveryDateField`; saves via `useUpdateTaskSchedule`
  - New surface IDs + surface prop types in `@beyo/tasks/src/surface-ids.ts`
  - Redesign of `TaskScheduledDeliverySection` — replace week pill with the two new pill components; remove `onOpenSchedule`, add `onOpenReadyByAt` + `onOpenDeliveryDate`
  - Managers app wiring:
    - `features/tasks/surfaces.ts` — remove local `TaskScheduledDateSheetPage` registration; register two new package pages
    - `features/tasks/flows/use-task-detail.flow.ts` — replace `openScheduleSheet` with `openReadyByAtSheet` + `openDeliveryDateSheet` (inject calendar surfaceOpeners from app)
    - `features/tasks/index.ts` — remove `TaskScheduledDateSurfaceProps` export
    - `pages/tasks/TaskDetailSlidePage.tsx` — update props passed to `TaskScheduledDeliverySection`
  - Delete `apps/managers-app/.../pages/tasks/TaskScheduledDateSheetPage.tsx`

- Out of scope:
  - Workers app
  - Role/permission gating
  - `TaskEditSlidePage` and the broad `useUpdateTask` mutation
  - Changing `TaskReadyByDateField` or `TaskDeliveryDateField` field components themselves
  - Calendar picker page components in `@beyo/task-creation`
  - Creating a new UI primitive (the existing `InfoPill` in `@beyo/ui` is already a suitable pill primitive; no new primitive is needed)

- Assumptions:
  - `InfoPill` from `@beyo/ui` is the correct pill primitive to use; both new pill components wrap it inside a `<button>`.
  - `CALENDAR_SINGLE_PICKER_SURFACE_ID` and `CALENDAR_RANGE_PICKER_SURFACE_ID` from `@beyo/task-creation` are already registered in the managers app's surface registry and will remain so.
  - The focused endpoints (`/ready-by-at` and `/schedule`) emit `task:updated` realtime events, making extra explicit invalidation of the task list unnecessary; both action hooks invalidate `taskKeys.detail(id)` on settle to ensure freshness.
  - `formatShortDate` parses dates the same way as existing `formatLocalDateISO` (handles both ISO datetime strings and date-only strings, uses local time).
  - The `TaskScheduledDeliverySection` component is always rendered when `taskDetail` is non-null; the pills themselves handle the "not set" case by showing "—" so the section no longer conditionally hides based on whether a week value exists.
  - `useGetTaskQuery` (already in `@beyo/tasks`) is used inside the new sheet pages to hydrate the form defaults from cached task data.
  - Error recovery (reopening the sheet with a prefill after a save failure) uses `useSurfaceStore.getState().open(SURFACE_ID, { taskId, prefill })` from inside the package pages — this is safe because both surface IDs are now owned by `@beyo/tasks` itself (same pattern as `TaskWorkingSectionsSlidePage`).

## Clarifications required

_None — cause and fix are fully understood._

## Acceptance criteria

1. A "Ready by" pill is visible on the task detail page. When `ready_by_at` is null it shows "—"; otherwise it shows a date formatted as `MM-DD` (year omitted when same as current year) or `YYYY-MM-DD` (different year).
2. Tapping the "Ready by" pill opens a bottom sheet with a calendar date picker; selecting a date calls `PATCH /api/v1/tasks/{task_id}/ready-by-at` and closes the sheet.
3. A "Delivery window" pill is visible on the task detail page. When `scheduled_start_at` is null it shows "—"; otherwise it shows "Week X" (ISO week calculated internally from `scheduledStartAt`).
4. Tapping the "Delivery window" pill opens a bottom sheet with a calendar range picker; selecting a range calls `PATCH /api/v1/tasks/{task_id}/schedule` and closes the sheet.
5. If a save fails, the sheet reopens with the entered values pre-filled so the user does not lose their input.
6. The section still shows "Week X" for the delivery pill — but the calculation is now inside `TaskScheduledDeliveryDatePill`, not in the parent section. The old combined `TaskScheduledDateSheetPage` no longer exists.
7. `npm run typecheck` from the managers app passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md §13` (surfaceOpeners pattern): `@beyo/tasks` pages must not call `surface.open()` for surfaces they do not own. The calendar pickers are owned by `@beyo/task-creation`. Therefore `TaskReadyByAtSheetPage` and `TaskScheduledDeliverySheetPage` receive opener callbacks via `surfaceOpeners` surface props, which the managers-app flow injects at open time. The two new date sheet surfaces ARE owned by `@beyo/tasks`, so the pages may call `useSurfaceStore.getState().open(TASK_READY_BY_AT_SHEET_SURFACE_ID, ...)` directly for error recovery.
- `architecture/08_hooks.md` (action hook pattern): action hooks use `useMutation` from TanStack Query with optimistic updates via `cancelQueries` + `getQueryData` + `setQueryData` and rollback in `onError`.

### File read intent — pattern vs. relational

Permitted reads performed:
- `TaskScheduledDeliverySection.tsx` — existing props and render shape
- `TaskScheduledDateSheetPage.tsx` — existing managers-app page being deleted
- `TaskReadyByDateField.tsx`, `TaskDeliveryDateField.tsx` — callback prop shapes for calendar openers
- `features/tasks/surfaces.ts`, `flows/use-task-detail.flow.ts`, `features/tasks/index.ts` — existing surface registration, flow, and export shape
- `TaskDetailSlidePage.tsx` — current props passed to `TaskScheduledDeliverySection`
- `packages/tasks/src/surface-ids.ts` — existing surface ID patterns
- `packages/tasks/src/api/get-task.ts`, `packages/tasks/src/actions/use-add-task-step.ts` — shape for new API and action files
- `packages/tasks/src/types.ts` — field names for `ready_by_at`, `scheduled_start_at`, `scheduled_end_at`
- `packages/lib/src/date/resolve-range-selection.ts` — existing date utility shape in lib
- `packages/lib/src/index.ts` — how to add a new export
- `packages/ui/src/components/primitives/shared/InfoPill.tsx` — confirmed existing pill primitive
- `features/tasks/actions/use-update-task.ts` — existing optimistic-update action pattern to replicate

### Skill selection

- Primary skill: none (API + action + component + page wiring; follows established patterns)

## Implementation plan

### Step 1 — `@beyo/lib`: new `formatShortDate` utility

**File:** `packages/lib/src/date/format-short-date.ts` _(new)_

The utility accepts a primary date string and an optional end date string.
- For a single date: if year == current year → `MM-DD`; otherwise `YYYY-MM-DD`.
- For a range: each individual date is formatted with the same year-aware rule, and the two parts are joined with ` → `. If either date's year differs from the current year the year is shown for **that** date only (not forced on both).
- Returns `null` if the primary date is null/invalid.

```ts
function parseDate(value: string): Date | null {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const fallback = new Date(`${value}T00:00:00`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatSingle(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const date = parseDate(dateString);
  if (!date) return null;
  const currentYear = new Date().getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() === currentYear
    ? `${mm}-${dd}`
    : `${date.getFullYear()}-${mm}-${dd}`;
}

/**
 * Format one date or a start–end range.
 * Year is omitted for any date whose year matches the current year.
 */
export function formatShortDate(
  start: string | null | undefined,
  end?: string | null,
): string | null {
  const startFormatted = formatSingle(start);
  if (!startFormatted) return null;
  if (!end) return startFormatted;
  const endFormatted = formatSingle(end);
  if (!endFormatted) return startFormatted;
  return `${startFormatted} → ${endFormatted}`;
}
```

**File:** `packages/lib/src/date/iso-week.ts` _(new)_

Extract verbatim from `packages/tasks/src/lib/task-detail.ts` — no logic change:

```ts
export function isoWeek(dateString: string | null): number | null {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  const dayOfWeek = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayOfWeek + 3);
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const dayOfYear = (d.getTime() - jan4.getTime()) / 86400000;
  return 1 + Math.round((dayOfYear - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}
```

**File:** `packages/lib/src/index.ts` _(modified)_

Add after the `resolveRangeSelection` export line:
```ts
export { formatShortDate } from "./date/format-short-date";
export { isoWeek } from "./date/iso-week";
```

**File:** `packages/tasks/src/lib/task-detail.ts` _(modified)_

Remove the local `isoWeek` function body. Replace it with a re-export from `@beyo/lib` so all existing callers inside the tasks package (`TaskScheduledDeliverySection`, `index.ts` public export) continue to work without changes:

```ts
// remove the local isoWeek function, add this import at the top:
export { isoWeek } from "@beyo/lib";
```

---

### Step 2 — `@beyo/tasks`: new surface IDs and surface prop types

**File:** `packages/tasks/src/surface-ids.ts` _(modified)_

Add the following to the existing file (after the working-sections exports):

```ts
export const TASK_READY_BY_AT_SHEET_SURFACE_ID = "task-ready-by-at-sheet";
export const TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID = "task-scheduled-delivery-sheet";

// Locally-scoped calendar prop types (mirrors the field component shapes;
// duplicated here to avoid a cross-package import from @beyo/task-creation).
type CalendarSinglePickerProps = {
  currentValue: string | null;
  onSelect: (isoString: string | null) => void;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
  quickSelectOptions?: Array<{
    id: string;
    label: string;
    amount: number;
    unit: "day" | "week" | "month";
  }>;
};

type CalendarRangePickerProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: "from" | "to";
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
};

export type TaskReadyByAtSheetSurfaceOpeners = {
  openCalendarSinglePicker?: (props: CalendarSinglePickerProps) => void;
};

export type TaskReadyByAtSheetSurfaceProps = {
  taskId: string;
  surfaceOpeners?: TaskReadyByAtSheetSurfaceOpeners;
  prefill?: { ready_by_at: string | null };
};

export type TaskScheduledDeliverySheetSurfaceOpeners = {
  openCalendarRangePicker?: (props: CalendarRangePickerProps) => void;
};

export type TaskScheduledDeliverySheetSurfaceProps = {
  taskId: string;
  surfaceOpeners?: TaskScheduledDeliverySheetSurfaceOpeners;
  prefill?: { scheduled_start_at: string | null; scheduled_end_at: string | null };
};
```

---

### Step 3 — `@beyo/tasks`: focused API functions

**File:** `packages/tasks/src/api/update-task-ready-by-at.ts` _(new)_

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const UpdateTaskReadyByAtResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() })
).extend({ ok: z.literal(true) });

export type UpdateTaskReadyByAtInput = {
  taskId: string;
  ready_by_at: string | null;
};

export async function updateTaskReadyByAt(
  input: UpdateTaskReadyByAtInput
): Promise<void> {
  await apiClient.patch(
    `/api/v1/tasks/${input.taskId}/ready-by-at`,
    { ready_by_at: input.ready_by_at },
    UpdateTaskReadyByAtResponseSchema,
  );
}
```

**File:** `packages/tasks/src/api/update-task-schedule.ts` _(new)_

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const UpdateTaskScheduleResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() })
).extend({ ok: z.literal(true) });

export type UpdateTaskScheduleInput = {
  taskId: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
};

export async function updateTaskSchedule(
  input: UpdateTaskScheduleInput
): Promise<void> {
  await apiClient.patch(
    `/api/v1/tasks/${input.taskId}/schedule`,
    {
      scheduled_start_at: input.scheduled_start_at,
      scheduled_end_at: input.scheduled_end_at,
    },
    UpdateTaskScheduleResponseSchema,
  );
}
```

---

### Step 4 — `@beyo/tasks`: action hooks with optimistic updates

**File:** `packages/tasks/src/actions/use-update-task-ready-by-at.ts` _(new)_

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskDetailRaw } from "../types";
import { taskKeys } from "../api/task-keys";
import { updateTaskReadyByAt } from "../api/update-task-ready-by-at";

export function useUpdateTaskReadyByAt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskReadyByAt,
    onMutate: async ({ taskId, ready_by_at }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(taskId));
      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId), (old) => {
        if (!old) return old;
        return { ...old, task: { ...old.task, ready_by_at } };
      });
      return { taskId, snapshot };
    },
    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(context.taskId), context.snapshot);
      }
    },
    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(input.taskId) });
    },
  });
}
```

**File:** `packages/tasks/src/actions/use-update-task-schedule.ts` _(new)_

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskDetailRaw } from "../types";
import { taskKeys } from "../api/task-keys";
import { updateTaskSchedule } from "../api/update-task-schedule";

export function useUpdateTaskSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskSchedule,
    onMutate: async ({ taskId, scheduled_start_at, scheduled_end_at }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(taskId));
      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId), (old) => {
        if (!old) return old;
        return { ...old, task: { ...old.task, scheduled_start_at, scheduled_end_at } };
      });
      return { taskId, snapshot };
    },
    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(context.taskId), context.snapshot);
      }
    },
    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(input.taskId) });
    },
  });
}
```

---

### Step 5 — `@beyo/tasks`: display pill components

**File:** `packages/tasks/src/components/detail/TaskReadyByAtPill.tsx` _(new)_

```tsx
import { EyebrowLabel, InfoPill } from "@beyo/ui";
import { formatShortDate } from "@beyo/lib";

type TaskReadyByAtPillProps = {
  readyByAt: string | null | undefined;
  onPress: () => void;
};

export function TaskReadyByAtPill({
  readyByAt,
  onPress,
}: TaskReadyByAtPillProps): React.JSX.Element {
  const label = formatShortDate(readyByAt) ?? "—";

  return (
    <div className="flex flex-col gap-1.5">
      <EyebrowLabel>Ready by</EyebrowLabel>
      <button
        className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        type="button"
        onClick={onPress}
      >
        <InfoPill>{label}</InfoPill>
      </button>
    </div>
  );
}
```

**File:** `packages/tasks/src/components/detail/TaskScheduledDeliveryDatePill.tsx` _(new)_

Display rule: calculate the ISO week from `scheduledStartAt` using the existing `isoWeek()` utility from `../../lib/task-detail`. Shows "Week X" when a week can be computed; shows "—" when `scheduledStartAt` is null or unparseable. The pill is fully self-contained — the parent section passes raw date strings and the pill owns all week-calculation logic.

```tsx
import { EyebrowLabel, InfoPill } from "@beyo/ui";
import { isoWeek } from "@beyo/lib";

type TaskScheduledDeliveryDatePillProps = {
  scheduledStartAt: string | null | undefined;
  scheduledEndAt: string | null | undefined;
  onPress: () => void;
};

export function TaskScheduledDeliveryDatePill({
  scheduledStartAt,
  onPress,
}: TaskScheduledDeliveryDatePillProps): React.JSX.Element {
  const week = isoWeek(scheduledStartAt ?? null);
  const label = week !== null ? `Week ${week}` : "—";

  return (
    <div className="flex flex-col gap-1.5">
      <EyebrowLabel>Delivery window</EyebrowLabel>
      <button
        className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        type="button"
        onClick={onPress}
      >
        <InfoPill>{label}</InfoPill>
      </button>
    </div>
  );
}
```

---

### Step 6 — `@beyo/tasks`: redesign `TaskScheduledDeliverySection`

**File:** `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx` _(modified)_

Replace the entire file. Removes `onOpenSchedule` and the week number, adds two pills (always rendered when taskDetail is non-null), and adds `onOpenQuantity` (unchanged).

```tsx
import { DashedInfoSection, EyebrowLabel, InfoPill } from "@beyo/ui";

import type { TaskDetailRaw } from "../../types";
import { TaskReadyByAtPill } from "./TaskReadyByAtPill";
import { TaskScheduledDeliveryDatePill } from "./TaskScheduledDeliveryDatePill";

type TaskScheduledDeliverySectionProps = {
  onOpenQuantity: () => void;
  onOpenReadyByAt: () => void;
  onOpenDeliveryDate: () => void;
  taskDetail: TaskDetailRaw | null;
};

export function TaskScheduledDeliverySection({
  onOpenQuantity,
  onOpenReadyByAt,
  onOpenDeliveryDate,
  taskDetail,
}: TaskScheduledDeliverySectionProps): React.JSX.Element | null {
  if (!taskDetail) return null;

  const { item, task } = taskDetail;
  const quantity = item?.quantity ?? null;
  const quantityLabel =
    quantity !== null
      ? `${quantity} ${quantity === 1 ? "piece" : "pieces"}`
      : null;

  return (
    <DashedInfoSection data-testid="task-detail-schedule-section">
      <div className="flex items-start gap-6">
        <TaskReadyByAtPill
          readyByAt={task.ready_by_at}
          onPress={onOpenReadyByAt}
        />
        <TaskScheduledDeliveryDatePill
          scheduledStartAt={task.scheduled_start_at}
          scheduledEndAt={task.scheduled_end_at}
          onPress={onOpenDeliveryDate}
        />
        {quantityLabel !== null ? (
          <div className="flex flex-col gap-1.5">
            <EyebrowLabel>Quantity</EyebrowLabel>
            <button
              className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              type="button"
              onClick={onOpenQuantity}
            >
              <InfoPill>{quantityLabel}</InfoPill>
            </button>
          </div>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
```

Note: The section now always renders when `taskDetail` is non-null (the pills themselves show "—"), so the outer guard on `week === null && quantityLabel === null` is removed.

---

### Step 7 — `@beyo/tasks`: sheet pages

**File:** `packages/tasks/src/pages/TaskReadyByAtSheetPage.tsx` _(new)_

```tsx
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useSurfaceStore } from "@beyo/ui";

import { useGetTaskQuery } from "../api/use-get-task-query";
import { useUpdateTaskReadyByAt } from "../actions/use-update-task-ready-by-at";
import { TaskReadyByDateField } from "../components/fields/TaskReadyByDateField";
import { formatLocalDateISO } from "../lib/task-detail";
import {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  type TaskReadyByAtSheetSurfaceProps,
} from "../surface-ids";

// useSurfaceHeader and useSurfaceProps are app-provided; import via peer (they
// come from the host app's hook wiring). Because this page is consumed via
// lazy registration in the app, the app ensures these hooks are in scope
// through the SurfaceProvider and SurfaceHeader context.
// NOTE: these imports are from the package's own dependencies — see §13.
// The page imports them from "@beyo/hooks" which the app satisfies as a peer.
import { useSurface } from "@beyo/hooks";
import { useSurfaceHeader } from "@beyo/hooks";
import { useSurfaceProps } from "@beyo/hooks";

type ReadyByForm = {
  ready_by_at: string | null;
};

export function TaskReadyByAtSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, surfaceOpeners, prefill } =
    useSurfaceProps<TaskReadyByAtSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateReadyByAt = useUpdateTaskReadyByAt();

  const form = useForm<ReadyByForm>({
    defaultValues: prefill ?? { ready_by_at: null },
  });

  const hasResetRef = useRef(false);

  useEffect(() => {
    header?.setTitle("Ready by date");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (taskQuery.isPending || hasResetRef.current || prefill) return;
    hasResetRef.current = true;
    form.reset({
      ready_by_at: formatLocalDateISO(taskQuery.data?.task.ready_by_at ?? null),
    });
  }, [form, prefill, taskQuery.data, taskQuery.isPending]);

  function handleSave(values: ReadyByForm) {
    if (!taskId) return;
    header?.requestClose();
    updateReadyByAt.mutate(
      { taskId, ready_by_at: values.ready_by_at },
      {
        onError: () => {
          useSurfaceStore
            .getState()
            .open(TASK_READY_BY_AT_SHEET_SURFACE_ID, { taskId, surfaceOpeners, prefill: values });
        },
      },
    );
  }

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-4 p-6">
        <TaskReadyByDateField
          onOpenCalendarSinglePicker={surfaceOpeners?.openCalendarSinglePicker}
        />
        <button
          type="button"
          className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
          disabled={updateReadyByAt.isPending}
          onClick={() => void form.handleSubmit(handleSave)()}
        >
          Save
        </button>
      </div>
    </FormProvider>
  );
}
```

**File:** `packages/tasks/src/pages/TaskScheduledDeliverySheetPage.tsx` _(new)_

```tsx
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useSurfaceStore } from "@beyo/ui";

import { useGetTaskQuery } from "../api/use-get-task-query";
import { useUpdateTaskSchedule } from "../actions/use-update-task-schedule";
import { TaskDeliveryDateField } from "../components/fields/TaskDeliveryDateField";
import { formatLocalDateISO } from "../lib/task-detail";
import {
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  type TaskScheduledDeliverySheetSurfaceProps,
} from "../surface-ids";

import { useSurfaceHeader } from "@beyo/hooks";
import { useSurfaceProps } from "@beyo/hooks";

type ScheduleForm = {
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
};

export function TaskScheduledDeliverySheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, surfaceOpeners, prefill } =
    useSurfaceProps<TaskScheduledDeliverySheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateSchedule = useUpdateTaskSchedule();

  const form = useForm<ScheduleForm>({
    defaultValues: prefill ?? { scheduled_start_at: null, scheduled_end_at: null },
  });

  const hasResetRef = useRef(false);

  useEffect(() => {
    header?.setTitle("Delivery window");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (taskQuery.isPending || hasResetRef.current || prefill) return;
    hasResetRef.current = true;
    form.reset({
      scheduled_start_at: formatLocalDateISO(
        taskQuery.data?.task.scheduled_start_at ?? null,
      ),
      scheduled_end_at: formatLocalDateISO(
        taskQuery.data?.task.scheduled_end_at ?? null,
      ),
    });
  }, [form, prefill, taskQuery.data, taskQuery.isPending]);

  function handleSave(values: ScheduleForm) {
    if (!taskId) return;
    header?.requestClose();
    updateSchedule.mutate(
      {
        taskId,
        scheduled_start_at: values.scheduled_start_at,
        scheduled_end_at: values.scheduled_end_at,
      },
      {
        onError: () => {
          useSurfaceStore
            .getState()
            .open(TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID, {
              taskId,
              surfaceOpeners,
              prefill: values,
            });
        },
      },
    );
  }

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-4 p-6">
        <TaskDeliveryDateField
          onOpenCalendarRangePicker={surfaceOpeners?.openCalendarRangePicker}
        />
        <button
          type="button"
          className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
          disabled={updateSchedule.isPending}
          onClick={() => void form.handleSubmit(handleSave)()}
        >
          Save
        </button>
      </div>
    </FormProvider>
  );
}
```

**Important note on `useSurfaceHeader` / `useSurfaceProps` / `useSurface` imports**: These hooks come from the app-side hook wiring. Check whether `@beyo/hooks` exports them (as in the existing working-sections page approach) or whether they need to be provided via surface prop injection. Use the same import path that `TaskWorkingSectionsSlidePage.tsx` uses for these hooks.

---

### Step 8 — `@beyo/tasks`: update `detail/index.ts` and `index.ts`

**File:** `packages/tasks/src/components/detail/index.ts` _(modified)_

Add exports:
```ts
export { TaskReadyByAtPill } from "./TaskReadyByAtPill";
export { TaskScheduledDeliveryDatePill } from "./TaskScheduledDeliveryDatePill";
```

**File:** `packages/tasks/src/index.ts` _(modified)_

Add the following exports (grouped logically with existing exports):
```ts
// New API
export { updateTaskReadyByAt } from "./api/update-task-ready-by-at";
export type { UpdateTaskReadyByAtInput } from "./api/update-task-ready-by-at";
export { updateTaskSchedule } from "./api/update-task-schedule";
export type { UpdateTaskScheduleInput } from "./api/update-task-schedule";

// New actions
export { useUpdateTaskReadyByAt } from "./actions/use-update-task-ready-by-at";
export { useUpdateTaskSchedule } from "./actions/use-update-task-schedule";

// New display components (add to existing detail component block)
// TaskReadyByAtPill and TaskScheduledDeliveryDatePill already come through
// the "detail" barrel, so update the named export list in the barrel block:
// export { ..., TaskReadyByAtPill, TaskScheduledDeliveryDatePill } from "./components/detail";

// New pages
export { TaskReadyByAtSheetPage } from "./pages/TaskReadyByAtSheetPage";
export { TaskScheduledDeliverySheetPage } from "./pages/TaskScheduledDeliverySheetPage";

// New surface IDs + types (add to existing surface-ids re-export block)
export {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  TaskReadyByAtSheetSurfaceOpeners,
  TaskReadyByAtSheetSurfaceProps,
  TaskScheduledDeliverySheetSurfaceOpeners,
  TaskScheduledDeliverySheetSurfaceProps,
} from "./surface-ids";
```

---

### Step 9 — Managers app: update `features/tasks/surfaces.ts`

**File:** `apps/managers-app/.../features/tasks/surfaces.ts` _(modified)_

Remove:
- `TASK_SCHEDULED_DATE_SHEET_SURFACE_ID` constant definition and its export
- `TaskScheduledDateSurfaceProps` type definition
- `loadTaskScheduledDateSheetPage` function
- `taskScheduledDateSheet` lazy variable
- `[TASK_SCHEDULED_DATE_SHEET_SURFACE_ID]` entry in `taskSurfaces`

Add:
```ts
import {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  preloadCalendarSinglePickerSurface,
  preloadCalendarRangePickerSurface,
} from "@beyo/tasks";

function loadTaskReadyByAtSheetPage() {
  return import("@beyo/tasks").then((module) => ({
    default: module.TaskReadyByAtSheetPage,
  }));
}

function loadTaskScheduledDeliverySheetPage() {
  return import("@beyo/tasks").then((module) => ({
    default: module.TaskScheduledDeliverySheetPage,
  }));
}

const taskReadyByAtSheet = lazyWithPreload(loadTaskReadyByAtSheetPage);
const taskScheduledDeliverySheet = lazyWithPreload(loadTaskScheduledDeliverySheetPage);

export const preloadTaskReadyByAtSheetSurface = taskReadyByAtSheet.preload;
export const preloadTaskScheduledDeliverySheetSurface = taskScheduledDeliverySheet.preload;

// In taskSurfaces object, add:
[TASK_READY_BY_AT_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: taskReadyByAtSheet.Component,
},
[TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: taskScheduledDeliverySheet.Component,
},
```

Also export the two new surface IDs from this file for use in the flow:
```ts
export {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
} from "@beyo/tasks";
```

---

### Step 10 — Managers app: update `features/tasks/flows/use-task-detail.flow.ts`

**File:** `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts` _(modified)_

Remove:
- `TASK_SCHEDULED_DATE_SHEET_SURFACE_ID` import and `openScheduleSheet` return value

Add imports:
```ts
import {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
} from "../surfaces";
import {
  CALENDAR_SINGLE_PICKER_SURFACE_ID,
  CALENDAR_RANGE_PICKER_SURFACE_ID,
} from "@beyo/task-creation";
```

Replace `openScheduleSheet` with:
```ts
openReadyByAtSheet: () =>
  surface.open(TASK_READY_BY_AT_SHEET_SURFACE_ID, {
    taskId,
    surfaceOpeners: {
      openCalendarSinglePicker: (props) =>
        surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props),
    },
  }),
openDeliveryDateSheet: () =>
  surface.open(TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID, {
    taskId,
    surfaceOpeners: {
      openCalendarRangePicker: (props) =>
        surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props),
    },
  }),
```

---

### Step 11 — Managers app: update `features/tasks/index.ts`

**File:** `apps/managers-app/.../features/tasks/index.ts` _(modified)_

Remove the re-export of `TaskScheduledDateSurfaceProps` from `./surfaces`.

---

### Step 12 — Managers app: update `pages/tasks/TaskDetailSlidePage.tsx`

**File:** `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` _(modified)_

Update the `<TaskScheduledDeliverySection>` call:
```tsx
// Before:
<TaskScheduledDeliverySection
  onOpenQuantity={controller.openQuantitySheet}
  onOpenSchedule={controller.openScheduleSheet}
  taskDetail={controller.taskDetail}
/>

// After:
<TaskScheduledDeliverySection
  onOpenQuantity={controller.openQuantitySheet}
  onOpenReadyByAt={controller.openReadyByAtSheet}
  onOpenDeliveryDate={controller.openDeliveryDateSheet}
  taskDetail={controller.taskDetail}
/>
```

---

### Step 13 — Managers app: delete `TaskScheduledDateSheetPage.tsx`

**File:** `apps/managers-app/.../pages/tasks/TaskScheduledDateSheetPage.tsx` _(deleted)_

Delete this file entirely. All its responsibilities are now covered by `TaskReadyByAtSheetPage` and `TaskScheduledDeliverySheetPage` in `@beyo/tasks`.

---

### Step 14 — Verify `useSurfaceHeader` / `useSurfaceProps` hook paths in new pages

Before finalising, check how `TaskWorkingSectionsSlidePage.tsx` in `@beyo/tasks` imports `useSurfaceHeader` and `useSurfaceProps`. Use the same import paths in Steps 7a and 7b. If they come from `@beyo/hooks`, use that. If they come from a different peer, mirror exactly.

---

## Risks and mitigations

- Risk: `useSurfaceHeader` / `useSurfaceProps` are app-side hooks; if `@beyo/hooks` does not export them the new pages will fail to compile.
  Mitigation: Step 14 — explicitly verify the import path from the existing `TaskWorkingSectionsSlidePage` before writing the new pages.

- Risk: The `TaskScheduledDeliverySection` guard change (removing the `week === null` check) means the section now always renders for any non-null `taskDetail`. If other consumers of this component rely on it returning `null` when no schedule is set, they may see an unexpected layout change.
  Mitigation: Check all call sites — currently only `TaskDetailSlidePage`. The change is intentional and the pills handle empty state with "—".

- Risk: `TaskScheduledDeliveryDatePill` receives `scheduledEndAt` as a prop but does not use it (only `scheduledStartAt` is passed to `isoWeek()`). The `scheduledEndAt` prop is kept in the signature for forward compatibility (e.g. if a future display shows "Week X–Y"). TypeScript's `noUnusedParameters` will flag it.
  Mitigation: Prefix the unused parameter with `_` in the destructuring: `_scheduledEndAt`. Or remove it from the prop type for now and add it later if needed. Codex should choose the simpler option (remove from type if not used).

- Risk: The `TASK_SCHEDULED_DATE_SHEET_SURFACE_ID` may be referenced in files not covered by this plan (e.g. tests or other components).
  Mitigation: Codex should grep for `TASK_SCHEDULED_DATE_SHEET_SURFACE_ID` and `TaskScheduledDateSheetPage` across the full monorepo before deleting.

## Validation plan

- `npm run typecheck` from `frontend/apps/managers-app/ManagerBeyo-app-managers`: zero TypeScript errors
- `./node_modules/.bin/tsc -p packages/tasks/tsconfig.json --noEmit`: zero errors
- `./node_modules/.bin/tsc -p packages/lib/tsconfig.json --noEmit`: zero errors
- Manual test — task detail page:
  - Both pills always visible with a "Ready by" and "Delivery window" label
  - Empty state: both show "—"
  - Tap "Ready by" pill → single-date calendar opens → select date → date appears in pill, `PATCH /ready-by-at` fires
  - Tap "Delivery window" pill → range calendar opens → select range → range appears in pill, `PATCH /schedule` fires
  - Save error → sheet reopens with the selected values pre-filled
  - No "Delivery Week" text or week number visible

## Review log

_(empty — awaiting Codex execution)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
