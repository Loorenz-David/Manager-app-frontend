# PLAN_task_fulfillment_method_pill_and_sheet_20260703

## Metadata

- Plan ID: `PLAN_task_fulfillment_method_pill_and_sheet_20260703`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-03T04:00:00Z`
- Last updated at (UTC): `2026-07-03T10:12:28Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Add a `TaskFulfillmentMethodPill` to the `TaskScheduledDeliverySection` (visible only
  for `pre_order` tasks) that opens a package sheet page where the user taps an option to
  immediately update the task's `fulfillment_method` via `PATCH /api/v1/tasks/{id}/post-handling`.
  Also migrate the existing delivery-date endpoint from the old `/schedule` route to
  `/post-handling`.
- Business/user intent: The post-handling workflow requires `fulfillment_method` to be filled
  before a `pre_order` task can transition from `pending` to `filled`. Surfacing the field
  directly in the task detail (alongside the delivery window pill) makes the missing-info path
  obvious. Single-tap interaction avoids a Save button — the method is simple enough that
  selection is confirmation.
- Non-goals: Do not modify `TaskFulfillmentMethodField` (that component is form-bound; the sheet
  uses BoxPicker directly). Do not show the pill for `return` or `internal` tasks. Do not add
  the pill to any other page.

## Scope

- In scope:
  - **New API function** `update-post-handling.ts` — PATCH `/api/v1/tasks/{task_id}/post-handling`;
    accepts partial fields (`fulfillment_method?`, `scheduled_start_at?`, `scheduled_end_at?`,
    `assortment?`).
  - **New action hook** `use-update-post-handling.ts` — optimistic update on
    `taskKeys.detail(taskId)`; rollback on error; invalidate detail + lists + postHandling on settle.
  - **New component** `TaskFulfillmentMethodPill.tsx` — same shape as `TaskScheduledDeliveryDatePill`
    (EyebrowLabel + InfoPill + optional button wrapper).
  - **New package sheet page** `TaskFulfillmentMethodSheetPage.tsx` — reads `taskId` from
    `useSurfaceProps`; fetches current value via `useGetTaskQuery`; BoxPicker single mode;
    on tap: close surface then fire mutation.
  - **Endpoint migration** in `update-task-schedule.ts` — URL changed from `/schedule` to
    `/post-handling` (one line, no other changes to the function or its action hook).
  - **Surface registration** — new `TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID` in
    `surface-ids.ts`; registered in the managers-app `surfaces.ts`.
  - **Section prop** — `onOpenFulfillmentMethod?: () => void` added to
    `TaskScheduledDeliverySection`; pill rendered when `task.task_type === "pre_order"`.
  - **Flow** — `openFulfillmentMethodSheet` added to `use-task-detail.flow.ts`; wired from
    `TaskDetailSlidePage` to the section.
- Out of scope:
  - Refactoring `TaskFulfillmentMethodField` to work without react-hook-form.
  - Workers-app task detail.
  - `return` or `internal` task types.
  - Assortment field (separate plan).
- Assumptions:
  - `task.fulfillment_method` is confirmed in `TaskDetailRaw` at line 220 of
    `packages/tasks/src/types.ts` (`z.enum(TASK_FULFILLMENT_METHOD).nullable()`).
  - `TaskFulfillmentMethod = "pickup_at_store" | "delivery"` — exported from `types.ts`.
  - `useGetTaskQuery(taskId)` inside the sheet page hits the existing cache — no extra network
    call when the task is already loaded.
  - `TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID` does not conflict with any existing surface ID.
  - BoxPicker from `@beyo/ui` accepts `mode="single"`, `layout="grid"`, `columns={2}` —
    confirmed from `TaskFulfillmentMethodField` usage.

## Clarifications required

_(none — scope fully determined)_

## Acceptance criteria

1. A "Fulfillment" pill appears in `TaskScheduledDeliverySection` for `pre_order` tasks,
   alongside the delivery window pill.
2. Tapping the pill opens a sheet with a 2-option BoxPicker (Pickup at store / Delivery);
   tapping an option fires `PATCH /api/v1/tasks/{id}/post-handling` with `fulfillment_method`
   and closes the sheet immediately.
3. The task detail card updates optimistically to show the new method before the server responds.
4. The delivery-window save path now calls `/post-handling` instead of `/schedule` —
   `useUpdateTaskSchedule` behaviour is otherwise unchanged.
5. `npm run typecheck` passes with zero errors.
6. The pill is absent for `return` and `internal` task types.
7. No regression to the existing delivery-date or ready-by-at flows.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md` + `01_architecture_local.md`: route and feature boundaries.
- `architecture/04_api_client.md` + `04_api_client_local.md`: `apiClient.patch` call shape,
  `ApiEnvelopeSchema` wrapper, flat error string.
- `architecture/05_server_state.md`: `useQuery` / `useInfiniteQuery` key patterns; never query
  inside a component, always use a dedicated hook.
- `architecture/08_hooks.md`: action hook pattern — `useMutation`, optimistic snapshot/rollback,
  `onSettled` invalidation, no rethrow from mutations.
- `architecture/13_errors.md`: no uncaught promise rejections; errors surface via `onError`
  rollback and `notify.error`.
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: `surface.open(id, props)` pattern;
  `useSurfaceProps` / `useSurfaceHeader` in page components; `lazyWithPreload` registration.
- `architecture/35_shared_packages.md §14`: package page exposed via a `loadXxxPage()` loader
  function in `index.ts` — never a static re-export of the page component. Codex must not
  statically export `TaskFulfillmentMethodSheetPage`.

### Local extensions loaded

- `28_surfaces_local.md`: active surface types are `slide`, `sheet`, `modal` — `drawer` excluded.

### File read intent — pattern vs. relational

Permitted reads:
- `packages/tasks/src/api/update-task-schedule.ts` — identify the one URL line to change.
- `packages/tasks/src/actions/use-update-task-schedule.ts` — understand the optimistic-update
  pattern to mirror for `use-update-post-handling.ts`.
- `packages/tasks/src/components/detail/TaskScheduledDeliveryDatePill.tsx` — understand the
  EyebrowLabel + InfoPill + button wrapper shape to mirror for `TaskFulfillmentMethodPill`.
- `packages/tasks/src/pages/TaskScheduledDeliverySheetPage.tsx` — understand the package-page
  shape (useSurfaceProps + useGetTaskQuery + action hook + close pattern) to mirror for the
  new sheet page.
- `packages/tasks/src/components/fields/TaskFulfillmentMethodField.tsx` — read the `OPTIONS`
  array and BoxPicker props to copy the exact option values, labels, and icons into the
  sheet page.
- `packages/tasks/src/surface-ids.ts` — add the new surface ID and props type alongside
  existing definitions.
- `packages/tasks/src/index.ts` — locate the correct export group for the new items.
- `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts` — understand the
  `openDeliveryDateSheet` pattern to mirror for `openFulfillmentMethodSheet`.
- `apps/managers-app/.../features/tasks/surfaces.ts` — locate where to add the new lazy
  surface registration.
- `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` — locate the
  `<TaskScheduledDeliverySection>` call site to add the new prop.

Prohibited reads:
- No other action hook to learn the mutation pattern → `08_hooks.md` covers it.
- No other provider to learn context wiring → `23_providers.md` covers it.

### Skill selection

- Primary skill: `—` (new files + surgical edits following established patterns)

## Implementation plan

### Step 1 — `packages/tasks/src/api/update-post-handling.ts` (new)

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { TaskFulfillmentMethod } from "../types";

const UpdatePostHandlingResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

export type UpdatePostHandlingInput = {
  taskId: string;
  fulfillment_method?: TaskFulfillmentMethod | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  assortment?: string | null;
};

export async function updatePostHandling({
  taskId,
  ...fields
}: UpdatePostHandlingInput) {
  return apiClient.patch(
    `/api/v1/tasks/${taskId}/post-handling`,
    UpdatePostHandlingResponseSchema,
    fields,
  );
}
```

### Step 2 — `packages/tasks/src/actions/use-update-post-handling.ts` (new)

Mirrors `use-update-task-schedule.ts`. Optimistic update spreads changed fields into
`old.task`; rollback restores the snapshot; `onSettled` invalidates:
- `taskKeys.detail(taskId)` — task detail card
- `taskKeys.lists()` — list queries (post-handling state may have changed)
- `taskKeys.postHandling()` — post-handling counts prefix

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePostHandling } from "../api/update-post-handling";
import { taskKeys } from "../api/task-keys";
import type { TaskDetailRaw } from "../types";

type UpdatePostHandlingContext = {
  snapshot: TaskDetailRaw | undefined;
  taskId: string;
};

export function useUpdatePostHandling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePostHandling,
    onMutate: async ({ taskId, ...fields }): Promise<UpdatePostHandlingContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
      );

      queryClient.setQueryData<TaskDetailRaw>(
        taskKeys.detail(taskId as never),
        (old) => {
          if (!old) return old;
          return { ...old, task: { ...old.task, ...fields } };
        },
      );

      return { snapshot, taskId };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(
          taskKeys.detail(context.taskId as never),
          context.snapshot,
        );
      }
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(input.taskId as never),
      });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.postHandling() });
    },
  });
}
```

### Step 3 — `packages/tasks/src/components/detail/TaskFulfillmentMethodPill.tsx` (new)

Mirrors `TaskScheduledDeliveryDatePill` (EyebrowLabel + InfoPill + optional button wrapper).
No imports from lucide — the pill content is text only.

```ts
const FULFILLMENT_METHOD_LABEL: Record<string, string> = {
  pickup_at_store: "Pickup at store",
  delivery: "Delivery",
};
```

Props:
```ts
type TaskFulfillmentMethodPillProps = {
  fulfillmentMethod: TaskFulfillmentMethod | null;
  onPress?: () => void;
};
```

Render:
- EyebrowLabel: `"Fulfillment"`
- `label = FULFILLMENT_METHOD_LABEL[fulfillmentMethod ?? ""] ?? "—"`
- InfoPill with the label
- When `onPress` provided: wrap in a `button` with `data-testid="task-fulfillment-method-pill"`

### Step 4 — `packages/tasks/src/pages/TaskFulfillmentMethodSheetPage.tsx` (new)

Package sheet page (§14). Do NOT statically export from `index.ts` — only the loader.

```ts
import { useEffect } from "react";
import { Store as StoreIcon, Truck as TruckIcon } from "lucide-react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker } from "@beyo/ui";

import { useGetTaskQuery } from "../api/use-get-task-query";
import { useUpdatePostHandling } from "../actions/use-update-post-handling";
import type { TaskFulfillmentMethodSheetSurfaceProps } from "../surface-ids";
import type { TaskFulfillmentMethod } from "../types";

const OPTIONS = [
  { value: "pickup_at_store", label: "Pickup at store", icon: StoreIcon,
    testId: "task-fulfillment-method-pickup-at-store-option" },
  { value: "delivery", label: "Delivery", icon: TruckIcon,
    testId: "task-fulfillment-method-delivery-option" },
];

export function TaskFulfillmentMethodSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskFulfillmentMethodSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updatePostHandling = useUpdatePostHandling();
  const currentValue = taskQuery.data?.task.fulfillment_method ?? null;

  useEffect(() => {
    header?.setTitle("Fulfillment method");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="px-4 py-4" data-testid="task-fulfillment-method-sheet-page">
      <BoxPicker
        columns={2}
        data-testid="task-fulfillment-method-picker"
        layout="grid"
        mode="single"
        options={OPTIONS}
        value={currentValue}
        visualVariant="default"
        onValueChange={(value) => {
          if (!taskId || !value) {
            return;
          }

          header?.requestClose();
          updatePostHandling.mutate({
            taskId,
            fulfillment_method: value as TaskFulfillmentMethod,
          });
        }}
      />
    </div>
  );
}
```

Close-before-mutate pattern: the sheet closes immediately; the optimistic update in
`useUpdatePostHandling` reflects the new value in the pill before the server responds.

### Step 5 — `packages/tasks/src/api/update-task-schedule.ts` (modified)

One-line change — update URL only:

```ts
// before
`/api/v1/tasks/${taskId}/schedule`

// after
`/api/v1/tasks/${taskId}/post-handling`
```

The function signature, input type, and `use-update-task-schedule.ts` action hook are unchanged.

### Step 6 — `packages/tasks/src/surface-ids.ts` (modified)

Add after existing surface IDs:

```ts
export const TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID =
  "task-fulfillment-method-sheet";

export type TaskFulfillmentMethodSheetSurfaceProps = {
  taskId: string;
};
```

### Step 7 — `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx` (modified)

Add `onOpenFulfillmentMethod?: () => void` to `TaskScheduledDeliverySectionProps`.

Import `TaskFulfillmentMethodPill`.

Inside the JSX, after `TaskScheduledDeliveryDatePill`, add:

```tsx
{task.task_type === "pre_order" ? (
  <TaskFulfillmentMethodPill
    fulfillmentMethod={task.fulfillment_method}
    onPress={onOpenFulfillmentMethod}
  />
) : null}
```

`task.fulfillment_method` is confirmed in `TaskDetailRaw.task` (line 220 of `types.ts`).

### Step 8 — `packages/tasks/src/index.ts` (modified)

Add alongside existing detail-component exports:

```ts
export { TaskFulfillmentMethodPill } from "./components/detail/TaskFulfillmentMethodPill";
```

Add alongside existing action exports:

```ts
export { useUpdatePostHandling } from "./actions/use-update-post-handling";
```

Add alongside existing surface-ID re-exports:

```ts
export {
  TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  TaskFulfillmentMethodSheetSurfaceProps,
} from "./surface-ids";
```

Add loader function (§14 — never statically export the page):

```ts
export function loadTaskFulfillmentMethodSheetPage() {
  return import("./pages/TaskFulfillmentMethodSheetPage").then((module) => ({
    default: module.TaskFulfillmentMethodSheetPage,
  }));
}
```

### Step 9 — `apps/managers-app/.../features/tasks/surfaces.ts` (modified)

Add import at top:

```ts
import {
  TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID,
  loadTaskFulfillmentMethodSheetPage,
} from "@beyo/tasks";
```

Add lazy component:

```ts
const taskFulfillmentMethodSheet = lazyWithPreload(loadTaskFulfillmentMethodSheetPage);
```

Register in `taskSurfaces`:

```ts
[TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: taskFulfillmentMethodSheet.Component,
},
```

Re-export the ID and props type for use in the flow:

```ts
export {
  TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID,
} from "@beyo/tasks";
export type {
  TaskFulfillmentMethodSheetSurfaceProps,
} from "@beyo/tasks";
```

### Step 10 — `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts` (modified)

Add import:

```ts
import { TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID } from "../surfaces";
```

Add to the returned object:

```ts
openFulfillmentMethodSheet: () =>
  surface.open(TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID, { taskId }),
```

Place alongside `openDeliveryDateSheet`.

### Step 11 — `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` (modified)

Add `onOpenFulfillmentMethod` prop to `<TaskScheduledDeliverySection>`:

```tsx
<TaskScheduledDeliverySection
  onOpenDeliveryDate={controller.openDeliveryDateSheet}
  onOpenFulfillmentMethod={controller.openFulfillmentMethodSheet}
  taskDetail={controller.taskDetail}
/>
```

No other changes to this file.

## Risks and mitigations

- Risk: `/post-handling` endpoint rejects `scheduled_start_at`/`scheduled_end_at` from the
  migrated delivery-date action if the backend does not support these fields there.
  Mitigation: HANDOFF confirms `/post-handling` accepts `scheduled_start_at` and
  `scheduled_end_at` (see handoff §"Post-handling route accepts any subset of").
- Risk: Optimistic update in `use-update-post-handling` spreads arbitrary fields into `old.task`.
  If a field name does not exist on `TaskDetailRaw.task`, TypeScript may error.
  Mitigation: the input type is constrained to `UpdatePostHandlingInput` fields, all of which
  are confirmed in `TaskDetailRaw.task`.
- Risk: `task.fulfillment_method` accessed in `TaskScheduledDeliverySection` but not yet
  guaranteed by the component's `TaskDetailRaw` type.
  Mitigation: `TaskDetailRaw` at line 220 of `types.ts` includes `fulfillment_method: z.enum(...).nullable()` — confirmed.
- Risk: `BoxPicker` in the sheet page may not initialise with the correct pre-selected value
  if `useGetTaskQuery` is still loading.
  Mitigation: when `taskQuery.isPending`, `currentValue` is `null` — BoxPicker renders with
  no selection, which is acceptable. No loading skeleton needed (task data is almost certainly
  cached since the user opened this from the task detail slide).

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke: open a `pre_order` task detail — "Fulfillment" pill appears next to delivery
  window.
- Manual smoke: tap the pill → sheet opens with BoxPicker.
- Manual smoke: tap an option → sheet closes immediately; pill updates to the new label.
- Manual smoke: open a `return` task — no Fulfillment pill shown.
- Manual smoke: change delivery window on a `pre_order` task — server now receives the request
  at `/post-handling` (verify via network tab).

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `Claude`
