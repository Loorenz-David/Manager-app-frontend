# PLAN_task_post_handling_role_modes_and_revision_form_20260703

## Metadata

- Plan ID: `PLAN_task_post_handling_role_modes_and_revision_form_20260703`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T11:18:30Z`
- Related issue/ticket: —
- Intention plan: —
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_task_post_handling_role_modes_and_revision_form_20260703.md`

## Goal and intent

- Goal: Introduce role-based default filter state into `TaskPostHandlingSlidePage` (seller defaults to `pending` only; manager keeps `pending + filled`), apply the same role-based logic to the `HomeView` count query, and replace the existing `PostHandlingPendingWarningSheetPage` (force-complete confirmation) with a form-based "pending revision" page that lets users fill in the missing required values (`TaskFulfillmentMethodField`, `TaskDeliveryDateField`, `TaskAssortmentField`) before the post-handling state can transition.
- Business/user intent: Sellers care only about items they still need to act on (pending); managers see the full pipeline. The current "force complete" interaction is replaced by a targeted data-entry flow that surfaces exactly which fields are missing and lets users fill them in-place.
- Non-goals: No new query hooks, no new route registration, no changes to the workers app, no changes to Playwright specs.

## Scope

- In scope:
  - `packages/tasks` — `surface-ids.ts`, `PostHandlingPendingWarningSheetPage.tsx`, `use-task-post-handling.controller.ts`, `PostHandlingBottomAction.tsx`, `TaskPostHandlingSlidePage.tsx`
  - `apps/managers-app` — `HomeView.tsx`
- Out of scope: Worker app, new surface registrations (existing loader + surface ID reused), `useUpdatePostHandling` action hook (unchanged).
- Assumptions:
  - `getPostHandlingMissingRequirements` correctly identifies which requirements are missing for each task type/source combination (confirmed by reading `post-handling-requirements.ts`).
  - `CALENDAR_RANGE_PICKER_SURFACE_ID` from `@beyo/task-creation` is already registered in the managers app's surface provider (confirmed: registered in `taskCreationSurfaces`).
  - `useRole()` / `AuthRole` are exported from `@beyo/auth` (confirmed: `auth/src/index.ts` exports both).
  - `useUpdatePostHandling` already invalidates `taskKeys.detail`, `taskKeys.lists()`, and `taskKeys.postHandling()` on `onSettled` — no additional invalidation needed in the revision page.

## Clarifications required

_(none — all surface prop patterns, role enum values, field binding names, and surface IDs are confirmed from existing files)_

## Acceptance criteria

1. In `HomeView`, when the logged-in user has `role === AuthRole.Seller`, the post-handling count badge shows only pending-state count and the slide opens with `defaultActiveStates: ["pending"]`.
2. When the user has any other role (manager, admin), existing behavior is preserved: count = pending + filled; default states = `["pending", "filled"]`.
3. The `PostHandlingBottomAction` button for a `pending` instance reads "Pending - revision" (not "Complete - pending").
4. Pressing "Pending - revision" opens the revised sheet page (not the old force-complete page), with the header title "Pending revision".
5. For `pre_order` tasks: the sheet shows `TaskFulfillmentMethodField` + `TaskDeliveryDateField` pre-filled with existing values; missing fields have visual warning treatment.
6. For `return` tasks: the sheet shows `TaskAssortmentField` pre-filled with existing value; if missing, warning treatment is applied.
7. Saving calls `PATCH /api/v1/tasks/:id/post-handling` with only the relevant fields for that task type; the sheet closes; the list re-fetches.
8. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo layer rules, package boundary enforcement
- `architecture/02_types.md`: Zod schema authoring
- `architecture/04_api_client.md`: `apiClient.patch` call shape (already used by `updatePostHandling`)
- `architecture/05_server_state.md`: TanStack Query invalidation, `useQuery`/`useInfiniteQuery` patterns
- `architecture/08_hooks.md`: action hook with optimistic update (existing `useUpdatePostHandling` unchanged)
- `architecture/07_components.md`: component authoring inside packages, FormProvider placement
- `architecture/09_forms.md`: `useForm`, `FormProvider`, `useController` without resolver
- `architecture/10_pages.md`: page component conventions (surface header, surface props, lifecycle `useEffect`)
- `architecture/13_errors.md`: error handling pattern in pages
- `architecture/15_feature_structure.md`: feature build order, layer constraints
- `architecture/19_permissions.md` + `architecture/19_permissions_local.md`: `useRole()` usage, `AuthRole` source, inline divergence vs. interface registry
- `architecture/28_surfaces.md`: surface types (`sheet`, `slide`), `useSurface`, `useSurfaceProps`
- `architecture/35_shared_packages.md §13`: surfaceOpeners callback injection pattern for cross-surface interactions
- `architecture/35_shared_packages.md §14`: `lazyWithPreload` loader functions in package `index.ts`; page is already exported via existing `loadPostHandlingPendingWarningSheetPage` — no new registration needed

### Local extensions loaded

- `architecture/19_permissions_local.md`: `useRole()` returns `{ role, hasRole, workspaceRoleName, ... }`; roles are `as const` objects in `@beyo/auth` (`AuthRole.Seller`, `AuthRole.Manager`); use `hasRole(AuthRole.Seller)` for inline divergence
- `architecture/28_surfaces_local.md`: active surface types are `slide`, `sheet`, `modal`; `drawer` excluded

### File read intent — pattern vs. relational

Permitted reads performed during planning (relational):
- `PostHandlingPendingWarningSheetPage.tsx` → confirmed existing page shape (force-complete with missing requirements list)
- `use-task-post-handling.controller.ts` → confirmed `activeStates` initial value, `openPendingWarning` call shape
- `post-handling-requirements.ts` → confirmed `PostHandlingRequirementKey` values: `"fulfillment_method"`, `"schedule"`, `"assortment"`; confirmed task-type routing logic
- `PostHandlingBottomAction.tsx` → confirmed current label "Complete - pending" and click routing
- `TaskPostHandlingSlidePage.tsx` → confirmed controller wire-up and surface props extraction
- `HomeView.tsx` → confirmed `usePostHandlingCountsQuery("pending,filled")` call, `surfaceOpeners` shape, `openTaskPostHandlingSurface` function
- `surface-ids.ts` → confirmed current types for `TaskPostHandlingPendingWarningSheetSurfaceProps`, `TaskPostHandlingSlideSurfaceProps`, `TaskPostHandlingSurfaceOpeners`
- `packages/auth/src/index.ts` + `use-role.ts` + `roles.ts` → confirmed `useRole()`, `AuthRole`, `hasRole` shape
- `CalendarRangePickerPage.tsx` → confirmed `CalendarRangePickerSurfaceProps` shape (6 fields)
- `TaskDeliveryDateField.tsx`, `TaskFulfillmentMethodField.tsx`, `packages/tasks/src/components/fields/TaskAssortmentField.tsx` → confirmed field binding names: `"scheduled_start_at"`, `"scheduled_end_at"`, `"fulfillment_method"`, `"assortment"`

### Skill selection

- Primary skill: `skills/forms/SKILL.md` (form field authoring with `useForm` + `FormProvider`)
- Trigger terms: `useFormContext`, `useController`, surface props, `useRole`
- Excluded alternatives: none

## Domain schemas consulted

- `packages/tasks/src/types.ts`: `POST_HANDLING_STATE = ["pending", "filled", "completed"]`; `TaskPostHandling.state`; `TaskListItemRaw.task.task_type`, `.return_source`, `.fulfillment_method`, `.scheduled_start_at`, `.scheduled_end_at`, `.assortment`
- `packages/tasks/src/api/update-post-handling.ts`: `UpdatePostHandlingInput.assortment?: string | null` — confirmed field already accepted by the endpoint
- `packages/auth/src/roles.ts`: `AuthRole.Seller = "seller"`, `AuthRole.Manager = "manager"`

## Implementation plan

### Step 1 — Extend `surface-ids.ts` with new type shapes

**File:** `packages/tasks/src/surface-ids.ts`

1a. Add a local helper type at the top of the file (before any exports), mirroring `CalendarRangePickerSurfaceProps` from `@beyo/task-creation`:

```ts
type CalendarRangeOpenerProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: "from" | "to";
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
};
```

1b. Replace `TaskPostHandlingPendingWarningSheetSurfaceProps` from:
```ts
export type TaskPostHandlingPendingWarningSheetSurfaceProps = {
  onConfirm?: () => void | Promise<void>;
  missingRequirements?: PostHandlingRequirement[];
};
```
To:
```ts
export type TaskPostHandlingPendingWarningSheetSurfaceProps = {
  taskId: string;
  onOpenCalendarRangePicker?: (props: CalendarRangeOpenerProps) => void;
};
```

1c. Add `openCalendarRangePicker` to `TaskPostHandlingSurfaceOpeners`:
```ts
export type TaskPostHandlingSurfaceOpeners = {
  closeSurface?: () => void;
  openTaskDetail?: (taskId: string) => void;
  openTaskActions?: (taskId: string, itemId: string | null) => void;
  openImageViewer?: (
    taskId: string,
    itemClientId: string | null,
    images: Array<{ client_id: string; image_url: string }>,
  ) => void;
  openPendingWarning?: (
    props: TaskPostHandlingPendingWarningSheetSurfaceProps,
  ) => void;
  openCalendarRangePicker?: (props: CalendarRangeOpenerProps) => void;  // NEW
};
```

1d. Add `defaultActiveStates` to `TaskPostHandlingSlideSurfaceProps`:
```ts
export type TaskPostHandlingSlideSurfaceProps = {
  surfaceOpeners?: TaskPostHandlingSurfaceOpeners;
  defaultActiveStates?: PostHandlingState[];   // NEW
};
```

> **Note:** `PostHandlingState` is already imported in this file via `"../types"`.

---

### Step 2 — Rewrite `PostHandlingPendingWarningSheetPage` as a pending revision form

**File:** `packages/tasks/src/pages/PostHandlingPendingWarningSheetPage.tsx`

Complete rewrite. The page:
- Reads `{ taskId, onOpenCalendarRangePicker }` from surface props
- Fetches the task via `useGetTaskQuery(taskId ?? "")`
- Computes `missingKeys` from `getPostHandlingMissingRequirements`
- Shows a `FormProvider`-wrapped form with only the fields relevant to the task type
- Pre-fills existing task values when the query resolves (one-time init via `useRef` guard)
- Wraps each field in a warning-styled container if its requirement key is in `missingKeys`
- Save → `updatePostHandling.mutate(...)` with only the task-type-relevant fields → `header?.requestClose()` (fire-and-forget; invalidation is handled by `useUpdatePostHandling.onSettled`)

```tsx
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useUpdatePostHandling } from "../actions/use-update-post-handling";
import { useGetTaskQuery } from "../api/use-get-task-query";
import { TaskAssortmentField } from "../components/fields/TaskAssortmentField";
import { TaskDeliveryDateField } from "../components/fields/TaskDeliveryDateField";
import { TaskFulfillmentMethodField } from "../components/fields/TaskFulfillmentMethodField";
import { getPostHandlingMissingRequirements } from "../lib/post-handling-requirements";
import type { TaskPostHandlingPendingWarningSheetSurfaceProps } from "../surface-ids";
import type { TaskFulfillmentMethod } from "../types";

// Warning container className for missing fields
const FIELD_WARNING_CLASS =
  "rounded-xl ring-2 ring-amber-400/60 bg-amber-50/40 p-3 dark:bg-amber-950/20";

type PendingRevisionFormValues = {
  fulfillment_method: TaskFulfillmentMethod | null | undefined;
  scheduled_start_at: string | null | undefined;
  scheduled_end_at: string | null | undefined;
  assortment: string | undefined;
};

export function PostHandlingPendingWarningSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, onOpenCalendarRangePicker } =
    useSurfaceProps<TaskPostHandlingPendingWarningSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updatePostHandling = useUpdatePostHandling();
  const task = taskQuery.data?.task ?? null;
  const hasInitializedRef = useRef(false);

  const form = useForm<PendingRevisionFormValues>({
    defaultValues: {
      fulfillment_method: undefined,
      scheduled_start_at: null,
      scheduled_end_at: null,
      assortment: "",
    },
  });

  // One-time pre-fill from task data once query resolves
  useEffect(() => {
    if (!task || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    form.reset({
      fulfillment_method: task.fulfillment_method ?? undefined,
      scheduled_start_at: task.scheduled_start_at ?? null,
      scheduled_end_at: task.scheduled_end_at ?? null,
      assortment: task.assortment ?? "",
    });
  }, [task, form]);

  useEffect(() => {
    header?.setTitle("Pending revision");
    header?.setActions(null);
  }, [header]);

  const missingKeys = new Set(
    task ? getPostHandlingMissingRequirements(task).map((r) => r.key) : [],
  );

  const showFulfillmentAndDelivery = task?.task_type === "pre_order";
  const showAssortment = task?.task_type === "return";

  function handleSave(): void {
    if (!taskId || !task) {
      return;
    }

    const values = form.getValues();
    header?.requestClose();

    updatePostHandling.mutate({
      taskId,
      ...(showFulfillmentAndDelivery
        ? {
            fulfillment_method: values.fulfillment_method ?? null,
            scheduled_start_at: values.scheduled_start_at ?? null,
            scheduled_end_at: values.scheduled_end_at ?? null,
          }
        : {}),
      ...(showAssortment
        ? { assortment: values.assortment?.trim() || null }
        : {}),
    });
  }

  if (taskQuery.isPending) {
    return (
      <div
        className="p-4 text-sm text-muted-foreground"
        data-testid="post-handling-pending-revision-sheet-page"
      >
        Loading…
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div
        className="flex flex-col gap-4 p-4"
        data-testid="post-handling-pending-revision-sheet-page"
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Pending revision
          </h2>
          <p className="text-sm text-muted-foreground">
            Fill in the required fields to move this task to filled.
          </p>
        </div>

        {showFulfillmentAndDelivery ? (
          <>
            <div
              className={
                missingKeys.has("fulfillment_method")
                  ? FIELD_WARNING_CLASS
                  : undefined
              }
            >
              <TaskFulfillmentMethodField />
            </div>
            <div
              className={
                missingKeys.has("schedule") ? FIELD_WARNING_CLASS : undefined
              }
            >
              <TaskDeliveryDateField
                onOpenCalendarRangePicker={onOpenCalendarRangePicker}
              />
            </div>
          </>
        ) : null}

        {showAssortment ? (
          <div
            className={
              missingKeys.has("assortment") ? FIELD_WARNING_CLASS : undefined
            }
          >
            <TaskAssortmentField />
          </div>
        ) : null}

        <button
          className="w-full rounded-2xl bg-primary py-3.5 text-md font-semibold text-primary-foreground disabled:opacity-50"
          data-testid="post-handling-revision-save-button"
          disabled={!task}
          type="button"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </FormProvider>
  );
}
```

> **Note on `FIELD_WARNING_CLASS`:** The amber ring + tinted background gives visible "this is missing" treatment without using the error color (red). Adjust the Tailwind classes to match the app's color tokens if a `warning` semantic color is defined in the design system.

> **Dependency check:** `PostHandlingPendingWarningSheetPage` now uses `FormProvider` and `useForm` from `react-hook-form`. This package is already a dependency of `@beyo/tasks` (used by field components). No new package install needed. There is NO `zodResolver` usage — all fields are optional and no validation is enforced on the form level.

---

### Step 3 — Update `use-task-post-handling.controller.ts`

**File:** `packages/tasks/src/controllers/use-task-post-handling.controller.ts`

3a. Add `initialActiveStates` to the input type:
```ts
type UseTaskPostHandlingControllerInput = {
  surfaceOpeners?: TaskPostHandlingSurfaceOpeners;
  initialActiveStates?: PostHandlingState[];   // NEW
};
```

3b. Change the `activeStates` `useState` initializer (currently hardcoded to `["pending", "filled"]`):
```ts
// Before:
const [activeStates, setActiveStates] = useState<PostHandlingState[]>([
  "pending",
  "filled",
]);

// After:
const [activeStates, setActiveStates] = useState<PostHandlingState[]>(
  initialActiveStates ?? ["pending", "filled"],
);
```

3c. Update `openPendingWarning` to pass `taskId` and thread the calendar opener:
```ts
// Before:
function openPendingWarning(
  task: TaskListItemRaw,
  instance: TaskPostHandling | null,
): void {
  surfaceOpeners?.openPendingWarning?.({
    missingRequirements: getPostHandlingMissingRequirements(task.task),
    onConfirm: () => handleComplete(task.task.client_id, instance, true),
  });
}

// After:
function openPendingWarning(
  task: TaskListItemRaw,
  _instance: TaskPostHandling | null,  // instance no longer needed — remove force-complete
): void {
  surfaceOpeners?.openPendingWarning?.({
    taskId: task.task.client_id,
    onOpenCalendarRangePicker: surfaceOpeners?.openCalendarRangePicker,
  });
}
```

> **Note:** The `instance` parameter becomes unused. Keep it in the signature (rename to `_instance`) to avoid breaking the call site in `TaskPostHandlingSlidePage.tsx` which passes it. TypeScript won't error on unused parameters prefixed with `_`.

---

### Step 4 — Update `PostHandlingBottomAction` label

**File:** `packages/tasks/src/components/PostHandlingBottomAction.tsx`

Change the label string for the pending-review state:
```ts
// Before:
? "Complete - pending"

// After:
? "Pending - revision"
```

Full label assignment after:
```ts
const label = isCompleted
  ? "Completed"
  : isPendingReview
    ? "Pending - revision"
    : "Complete";
```

---

### Step 5 — Pass `defaultActiveStates` from `TaskPostHandlingSlidePage`

**File:** `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

Change the controller instantiation to forward `defaultActiveStates` from surface props:
```ts
// Before:
const controller = useTaskPostHandlingController({
  surfaceOpeners: props.surfaceOpeners,
});

// After:
const controller = useTaskPostHandlingController({
  surfaceOpeners: props.surfaceOpeners,
  initialActiveStates: props.defaultActiveStates,
});
```

No other changes to this file.

---

### Step 6 — Add role-based logic to `HomeView`

**File:** `apps/managers-app/.../features/home/components/HomeView.tsx`

6a. Add imports at the top:
```ts
import { useRole, AuthRole } from "@beyo/auth";
import { CALENDAR_RANGE_PICKER_SURFACE_ID } from "@beyo/task-creation";
```

6b. Inside the `HomeView` component body, call `useRole`:
```ts
const { hasRole } = useRole();
const isSeller = hasRole(AuthRole.Seller);
```

6c. Make the post-handling counts query role-aware:
```ts
// Before:
const postHandlingCountsQuery = usePostHandlingCountsQuery("pending,filled");

// After:
const postHandlingCountsQuery = usePostHandlingCountsQuery(
  isSeller ? "pending" : "pending,filled",
);
```

6d. Make the count calculation role-aware:
```ts
// Before:
const postHandlingCount = postHandlingCountsQuery.data
  ? (postHandlingCountsQuery.data.pending ?? 0) +
    (postHandlingCountsQuery.data.filled ?? 0)
  : null;

// After:
const postHandlingCount = postHandlingCountsQuery.data
  ? isSeller
    ? (postHandlingCountsQuery.data.pending ?? 0)
    : (postHandlingCountsQuery.data.pending ?? 0) +
      (postHandlingCountsQuery.data.filled ?? 0)
  : null;
```

6e. In `openTaskPostHandlingSurface`, add `defaultActiveStates` and `openCalendarRangePicker` to the surface props:
```ts
function openTaskPostHandlingSurface(): void {
  surface.open(TASK_POST_HANDLING_SLIDE_SURFACE_ID, {
    defaultActiveStates: isSeller ? ["pending"] : ["pending", "filled"],  // NEW
    surfaceOpeners: {
      closeSurface: () => surface.close(TASK_POST_HANDLING_SLIDE_SURFACE_ID),
      openTaskDetail: (taskId) =>
        surface.open(TASK_DETAIL_SURFACE_ID, { taskId }),
      openTaskActions: (taskId, itemId) => {
        preloadPinNotificationsSlideSurface();
        surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
      },
      openImageViewer: (taskId, itemClientId, images) => {
        // ... existing unchanged ...
      },
      openPendingWarning: (props) => {
        surface.open(
          TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
          props satisfies TaskPostHandlingPendingWarningSheetSurfaceProps,
        );
      },
      openCalendarRangePicker: (props) => {          // NEW
        surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props);
      },
    },
  } satisfies TaskPostHandlingSlideSurfaceProps);
}
```

> **Note:** `CALENDAR_RANGE_PICKER_SURFACE_ID` from `@beyo/task-creation` is already registered in the managers app's surface provider (via `taskCreationSurfaces`). No additional registration is required.

> **Note:** The `openPendingWarning` handler in `HomeView` does NOT change — it still accepts `props` and opens the same surface ID. The controller now builds props with `{ taskId, onOpenCalendarRangePicker }` instead of `{ missingRequirements, onConfirm }`. TypeScript will enforce the new type through `TaskPostHandlingPendingWarningSheetSurfaceProps`.

---

## File change summary

| # | File | Change |
|---|---|---|
| 1 | `packages/tasks/src/surface-ids.ts` | Add `CalendarRangeOpenerProps` helper type; update `TaskPostHandlingPendingWarningSheetSurfaceProps` (`taskId` + calendar opener); add `openCalendarRangePicker` to `TaskPostHandlingSurfaceOpeners`; add `defaultActiveStates` to `TaskPostHandlingSlideSurfaceProps` |
| 2 | `packages/tasks/src/pages/PostHandlingPendingWarningSheetPage.tsx` | Complete rewrite: `FormProvider` form with `TaskFulfillmentMethodField` / `TaskDeliveryDateField` / `TaskAssortmentField`; one-time pre-fill; warning wrappers for missing fields; Save → `updatePostHandling.mutate` |
| 3 | `packages/tasks/src/controllers/use-task-post-handling.controller.ts` | Add `initialActiveStates` param; update `useState` default; update `openPendingWarning` to pass `taskId` + `onOpenCalendarRangePicker` |
| 4 | `packages/tasks/src/components/PostHandlingBottomAction.tsx` | Label: `"Complete - pending"` → `"Pending - revision"` |
| 5 | `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx` | Forward `props.defaultActiveStates` to controller |
| 6 | `apps/managers-app/.../features/home/components/HomeView.tsx` | `useRole()` + `isSeller`; role-based count query + count calculation; `defaultActiveStates` in slide props; `openCalendarRangePicker` in surface openers |

**Total: 6 files, all modified — 0 new files.**

---

## Surface registration note (§14 compliance)

The existing `loadPostHandlingPendingWarningSheetPage` loader function in `packages/tasks/src/index.ts` and the `taskPostHandlingPendingWarningSheet` lazy registration in `apps/managers-app/.../features/tasks/surfaces.ts` remain **unchanged**. The page is replaced in-place under the same exported name `PostHandlingPendingWarningSheetPage`. No new surface IDs, no new registrations, no new lazy imports needed.

---

## Risks and mitigations

- Risk: `TaskDeliveryDateField` in the revision sheet opens `CALENDAR_RANGE_PICKER_SURFACE_ID` as a nested surface from within an existing sheet. The managers app has this surface registered, but overlapping sheet surfaces may cause UX stacking issues.
  Mitigation: The calendar picker was already designed for this use case (it's opened from within `ReturnFormContent` which is inside a slide). Confirm in manual QA that the sheet → calendar surface transition works correctly.

- Risk: `form.reset()` inside a `useEffect` with a ref guard doesn't react to task data re-fetches. If the query re-fetches mid-session and returns different data, form values are stale.
  Mitigation: Since the sheet opens once per task interaction and the task detail is not expected to change during a single session, stale re-fetches within the open sheet are acceptable.

- Risk: The `isSeller` boolean is computed from `useRole()` inside `HomeView`. If the auth store hasn't resolved yet when the component mounts, `role` is `null`, `isSeller` is `false`, and the manager behavior is shown briefly before snapping to seller mode.
  Mitigation: Auth is initialized synchronously from the auth store at boot (confirmed by `AuthProvider` pattern). This race condition does not occur in practice.

- Risk: Renaming `instance` to `_instance` in `openPendingWarning` (step 3c) requires that the existing call site in `TaskPostHandlingSlidePage` still passes the argument. The page currently calls `controller.openPendingWarning(task, activeInstance)` — this still compiles fine with `_instance` in the signature.
  Mitigation: Verify with `npm run typecheck` that no type errors are introduced.

- Risk: The `CALENDAR_RANGE_PICKER_SURFACE_ID` import in `HomeView.tsx` from `@beyo/task-creation` is a new cross-feature import at the app level. If `@beyo/task-creation` is not in the `HomeView`'s transitive imports, it may require verifying the managers app's workspace dependency graph.
  Mitigation: The managers app already imports `taskCreationSurfaces` (surface registrations) from `@beyo/task-creation` at boot. A direct import of the surface ID constant adds no new dependency.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all 6 changed files
- Manual (seller role): Log in as seller → `HomeView` badge shows only pending count → open post-handling slide → default filter is "pending" only
- Manual (manager role): Log in as manager → badge shows pending + filled count → slide opens with both filters active
- Manual (label): Any `pending` post-handling task shows "Pending - revision" button (not "Complete - pending")
- Manual (pre_order revision): Press "Pending - revision" on a pre_order task → revision sheet opens → `TaskFulfillmentMethodField` and `TaskDeliveryDateField` render → missing fields have amber ring → calendar picker opens when tapping delivery date → save sends PATCH with `fulfillment_method` + `scheduled_start_at` + `scheduled_end_at`
- Manual (return revision): Press "Pending - revision" on a return task → revision sheet opens → `TaskAssortmentField` renders → save sends PATCH with `assortment`
- Manual (list update): After save, the post-handling list re-fetches and the task's state pill updates accordingly

## Review log

- Implemented on `2026-07-03`; required `npm run typecheck` passed before summary/archive handoff.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
