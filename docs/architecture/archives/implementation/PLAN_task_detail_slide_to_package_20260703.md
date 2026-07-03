# PLAN_task_detail_slide_to_package_20260703

## Metadata

- Plan ID: `PLAN_task_detail_slide_to_package_20260703`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-03T20:00:00Z`
- Last updated at (UTC): `2026-07-03T17:12:19Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Move `TaskDetailSlidePage` and all of its local logic (flow, controller, provider) into `@beyo/tasks` so the managers app consumes the full slide from the package boundary. Prerequisites — task/item mutations, API functions, and generic UI components — are moved to their correct package homes first.
- **Business/user intent:** Every task-domain surface consumed by the managers app should come from `@beyo/tasks`, making the app a thin consumer and enabling future re-use.
- **Non-goals:** Moving `ItemQuantitySheetPage`, `ItemUpholsteryAmountSheetPage`, `TaskEditSlidePage`, or `TaskFlowRecordDetailSheetPage` to packages (those remain managers-app-local in this plan). Moving the `pendingSeatUpholsteryKeys` invalidation to packages (managers-app-specific domain).

## Scope

- **In scope:**
  - `ContentCard` and `DashedInfoGroup` → `@beyo/ui`
  - `deleteTask`, `resolveTask`, `updateTask` API functions + mutation hooks → `@beyo/tasks`
  - `createItemUpholstery`, `updateItemUpholstery` API functions → `@beyo/items`
  - `useUpdateItem`, `useUpdateItemPosition`, `useCreateItemUpholstery`, `useUpdateItemUpholstery` mutation hooks → `@beyo/tasks`
  - `UpdateTaskInput` / `UpdateTaskInputSchema` → `@beyo/tasks/types.ts`
  - 4 surface IDs (`ITEM_QUANTITY_SHEET_SURFACE_ID`, `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID`, `TASK_EDIT_SLIDE_SURFACE_ID`, `TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID`) and their prop types → `@beyo/tasks/surface-ids.ts`
  - `use-task-detail.flow.ts`, `use-task-detail.controller.ts`, `TaskDetailProvider.tsx`, `TaskDetailSlidePage.tsx` → `@beyo/tasks`
  - `loadTaskDetailSlidePage()` exported from `@beyo/tasks/index.ts`
  - Managers app `surfaces.ts` consumes new package exports; wires `loadTaskDetailSlidePage`
  - All obsolete managers app files deleted

- **Out of scope:**
  - `useSetUpholsteryQuantity` (stays in managers app — used by `ItemUpholsteryAmountSheetPage`)
  - `useUpdateItem` managers app version (stays — still used by `ItemQuantitySheetPage`)
  - Packaging upholstery-inventory or pending-upholstery features
  - `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID` / `PIN_TASK_STEP_STATES_SHEET_SURFACE_ID` (remain in managers app)
  - `preloadPinNotificationsSlideSurface` call in the detail flow (dropped — acceptable performance regression; functionality unaffected)

- **Assumptions:**
  - `@beyo/upholstery`'s `ItemUpholsteryField` is the correct component for the slide page (the managers-app local version is a stale duplicate).
  - `isUpholsteryRequirementState` from `@beyo/upholstery` is used as the type guard instead of the local `toItemUpholsteryRequirementState` helper.
  - `SurfacePropsContext` and `SurfaceHeaderContext` are already exported from `@beyo/ui` — verified.
  - `StatePill` and `ImagePlaceholder` are already exported from `@beyo/ui` — verified (used by `@beyo/upholstery/ItemUpholsteryField`).
  - If `@beyo/tasks/package.json` does not yet list `@beyo/upholstery` as a dependency, add it (needed for `upholsteryKeys.pickerLists()` in the upholstery mutation hooks).

## Clarifications required

_(none — all decisions resolved during plan authoring)_

## Acceptance criteria

1. `npm run typecheck` passes with zero errors.
2. The managers app `TaskDetailSlidePage` is no longer defined locally — it loads via `lazy(loadTaskDetailSlidePage)` from `@beyo/tasks`.
3. None of the 15 deleted files remain in the managers app.
4. All managers-app pages that still use `useUpdateItem` or `useSetUpholsteryQuantity` compile correctly against their existing local imports.
5. The task detail slide opens, loads task data, and all actions (menu, edit, position, working sections, images, flow timeline) work in a manual browser test.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query mutation pattern — `onMutate` / `onError` / `onSettled` cache snapshot/rollback
- `architecture/08_hooks.md`: Controller and flow hook shape
- `architecture/23_providers.md`: Context/provider shell pattern
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `loadXxxPage()` factory + `lazyWithPreload` for surface registration; bare `React.lazy()` is valid for route-level pages (not surfaces)
- `architecture/14_package_page_loader.md`: Package exposes `loadXxxPage()` factory; app wraps with `lazy()` or `lazyWithPreload()`

### File read intent — pattern vs. relational

Permitted reads:
- Reading `packages/tasks/src/api/create-task.ts` to confirm `apiClient` / `ApiEnvelopeSchema` import pattern ✓
- Reading `packages/tasks/src/api/task-keys.ts` to confirm `detail(id: string)` signature ✓
- Reading existing action hooks for exact cache key shapes (relational, not pattern)

Prohibited reads:
- Reading another flow/controller to understand shape → use `architecture/08_hooks.md`
- Reading another provider to understand context shell → use `architecture/23_providers.md`

## Implementation plan

### §1 — `@beyo/ui`: Add `ContentCard` and `DashedInfoGroup`

**File 1 — CREATE `packages/ui/src/components/ContentCard.tsx`**

```tsx
export type ContentCardProps = {
  children: React.ReactNode;
  "data-testid"?: string;
};

export function ContentCard({ children, "data-testid": testId }: ContentCardProps): React.JSX.Element {
  return (
    <div
      className="flex w-full flex-col gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-4 shadow-sm"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
```

**File 2 — CREATE `packages/ui/src/components/DashedInfoGroup.tsx`**

```tsx
export type DashedInfoGroupProps = {
  children: React.ReactNode;
  "data-testid"?: string;
};

export function DashedInfoGroup({ children, "data-testid": testId }: DashedInfoGroupProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-dashed border-[var(--color-between-border)] bg-[var(--color-light-container)] divide-y divide-dashed divide-[var(--color-between-border)]"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
```

**File 3 — MODIFY `packages/ui/src/index.ts`**

Add exports:
```ts
export { ContentCard, type ContentCardProps } from "./components/ContentCard";
export { DashedInfoGroup, type DashedInfoGroupProps } from "./components/DashedInfoGroup";
```

---

### §2 — `@beyo/tasks`: Add `UpdateTaskInput` type

**File 4 — MODIFY `packages/tasks/src/types.ts`**

Add at the bottom of the file:

```ts
export const UpdateTaskInputSchema = z.object({
  id: z.string(),
  title: z.string().max(255).nullable().optional(),
  summary: z.string().max(1024).nullable().optional(),
  priority: z.enum(TASK_PRIORITY).optional(),
  ready_by_at: DateOnlySchema.nullable().optional(),
  scheduled_start_at: DateOnlySchema.nullable().optional(),
  scheduled_end_at: DateOnlySchema.nullable().optional(),
  return_method: z.enum(TASK_RETURN_METHOD).nullable().optional(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).nullable().optional(),
  return_source: z.enum(TASK_RETURN_SOURCE).nullable().optional(),
  item_location: z.enum(TASK_ITEM_LOCATION).nullable().optional(),
  customer_id: z.string().min(1).nullable().optional(),
  primary_phone_number: z.string().nullable().optional(),
  secondary_phone_number: z.string().nullable().optional(),
  primary_email: z.string().email().nullable().optional().or(z.literal("")),
  secondary_email: z.string().email().nullable().optional().or(z.literal("")),
  address: AddressSchema,
  additional_details: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
```

Note: `DateOnlySchema` and `AddressSchema` are already imported from `@beyo/lib` at the top of `types.ts`. `TASK_PRIORITY`, `TASK_RETURN_METHOD`, `TASK_FULFILLMENT_METHOD`, `TASK_RETURN_SOURCE`, `TASK_ITEM_LOCATION` are already defined in the same file. The `id` field uses plain `string` (not a branded `TaskId` — the managers-app branded type is app-local only).

---

### §3 — `@beyo/tasks`: Task API functions

**File 5 — CREATE `packages/tasks/src/api/delete-task.ts`**

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const TaskMutationResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/api/v1/tasks/${taskId}`, TaskMutationResponseSchema);
}
```

**File 6 — CREATE `packages/tasks/src/api/resolve-task.ts`**

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const TaskMutationResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

export async function resolveTask(taskId: string): Promise<void> {
  await apiClient.post(`/api/v1/tasks/${taskId}/resolve`, TaskMutationResponseSchema, {});
}
```

**File 7 — CREATE `packages/tasks/src/api/update-task.ts`**

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { UpdateTaskInput } from "../types";

const TaskMutationResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

export async function updateTask(input: UpdateTaskInput): Promise<void> {
  const { id, ...body } = input;
  await apiClient.patch(`/api/v1/tasks/${id}`, TaskMutationResponseSchema, body);
}
```

---

### §4 — `@beyo/items`: Item upholstery API functions

**File 8 — CREATE `packages/items/src/api/create-item-upholstery.ts`**

Copy directly from the managers app's `features/items/api/create-item-upholstery.ts`, replacing:
- `import { apiClient } from "@/lib/api-client"` → `import { apiClient } from "@beyo/api-client"`
- `import { ApiEnvelopeSchema } from "@/types/api"` → `import { ApiEnvelopeSchema } from "@beyo/lib"`

**File 9 — CREATE `packages/items/src/api/update-item-upholstery.ts`**

Copy from `features/items/api/update-item-upholstery.ts`, same import substitutions as above.

**File 10 — MODIFY `packages/items/src/index.ts`**

Add:
```ts
export { createItemUpholstery, type CreateItemUpholsteryInput } from "./api/create-item-upholstery";
export { updateItemUpholstery, type UpdateItemUpholsteryInput } from "./api/update-item-upholstery";
```

---

### §5 — `@beyo/tasks`: Task mutation hooks

**File 11 — CREATE `packages/tasks/src/actions/use-delete-task.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTask } from "../api/delete-task";
import { taskKeys } from "../api/task-keys";

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSettled: (_data, _error, taskId) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.removeQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}
```

**File 12 — CREATE `packages/tasks/src/actions/use-resolve-task.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveTask } from "../api/resolve-task";
import { taskKeys } from "../api/task-keys";

export function useResolveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveTask,
    onSettled: (_data, _error, taskId) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**File 13 — CREATE `packages/tasks/src/actions/use-update-task.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask } from "../api/update-task";
import { taskKeys } from "../api/task-keys";
import type { TaskDetailRaw, UpdateTaskInput } from "../types";

type UpdateTaskContext = { snapshot: TaskDetailRaw | undefined };

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onMutate: async (input: UpdateTaskInput): Promise<UpdateTaskContext> => {
      const { id, ...changes } = input;
      const detailKey = taskKeys.detail(id);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(detailKey);
      queryClient.setQueryData<TaskDetailRaw>(detailKey, (old) => {
        if (!old) return old;
        return { ...old, task: { ...old.task, ...changes } };
      });
      return { snapshot };
    },
    onError: (_error, input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(input.id), context.snapshot);
      }
    },
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(input.id) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

---

### §6 — `@beyo/tasks`: Item-in-task-context mutation hooks

These hooks live in `@beyo/tasks` (not `@beyo/items`) because they are always called with a `taskId` context and optimistically update `TaskDetailRaw` in the task detail query cache.

**File 14 — CREATE `packages/tasks/src/actions/use-update-item.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItem } from "@beyo/items";
import { taskKeys } from "../api/task-keys";
import type { TaskDetailRaw } from "../types";

export function useUpdateItem(taskId: string) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId);
  return useMutation({
    mutationFn: updateItem,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(detailKey);
      queryClient.setQueryData<TaskDetailRaw>(detailKey, (old) => {
        if (!old?.item) return old;
        const { id: _id, ...changes } = input;
        return { ...old, item: { ...old.item, ...changes } };
      });
      return { snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(detailKey, context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**File 15 — CREATE `packages/tasks/src/actions/use-update-item-position.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItemPositions } from "@beyo/items";
import { taskKeys } from "../api/task-keys";
import type { TaskDetailRaw } from "../types";

type Input = { id: string; item_position: string | null };

export function useUpdateItemPosition(taskId: string) {
  const queryClient = useQueryClient();
  const detailKey = taskKeys.detail(taskId);
  return useMutation({
    mutationFn: ({ id, item_position }: Input) =>
      updateItemPositions([{ client_id: id, item_position }]),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(detailKey);
      queryClient.setQueryData<TaskDetailRaw>(detailKey, (old) => {
        if (!old?.item) return old;
        return { ...old, item: { ...old.item, item_position: input.item_position } };
      });
      return { snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(detailKey, context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**File 16 — CREATE `packages/tasks/src/actions/use-create-item-upholstery.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createItemUpholstery } from "@beyo/items";
import { upholsteryKeys } from "@beyo/upholstery";
import { itemUpholsteryKeys, taskKeys } from "../api/task-keys";

// Note: @beyo/tasks/package.json must list "@beyo/upholstery" as a dependency.
// upholsteryKeys.pickerLists() is included to keep the picker cache fresh.
// pendingSeatUpholsteryKeys is managers-app-specific and intentionally excluded here.

export function useCreateItemUpholstery(taskId: string, itemId: string | null = null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      if (itemId) {
        void queryClient.invalidateQueries({ queryKey: itemUpholsteryKeys.byItem(itemId) });
      }
    },
  });
}
```

**File 17 — CREATE `packages/tasks/src/actions/use-update-item-upholstery.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItemUpholstery } from "@beyo/items";
import { upholsteryKeys } from "@beyo/upholstery";
import { itemUpholsteryKeys, taskKeys } from "../api/task-keys";

export function useUpdateItemUpholstery(taskId: string, itemId: string | null = null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      if (itemId) {
        void queryClient.invalidateQueries({ queryKey: itemUpholsteryKeys.byItem(itemId) });
      }
    },
  });
}
```

**Important:** `itemUpholsteryKeys` is currently exported from `packages/tasks/src/api/task-keys.ts` (it's already in `@beyo/tasks`). If it lives in a different module, adjust the import path accordingly.

---

### §7 — `@beyo/tasks`: Surface ID additions

**File 18 — MODIFY `packages/tasks/src/surface-ids.ts`**

Add the following constants and types. These surface IDs are used by the flow to open managers-app-registered surfaces (the page components remain in the managers app; only the ID strings move to the package):

```ts
export const ITEM_QUANTITY_SHEET_SURFACE_ID = "item-quantity-sheet";
export const ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID = "item-upholstery-amount-sheet";
export const TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID = "task-flow-record-detail-sheet";
export const TASK_EDIT_SLIDE_SURFACE_ID = "task-edit-slide";

export type ItemQuantitySurfaceProps = {
  taskId: string;
  itemId: string;
  prefill?: { quantity: number };
};

export type ItemUpholsteryAmountSurfaceProps = {
  taskId: string;
  itemUpholsteryId: string;
  showQuantityChangedWarning?: boolean;
  prefill?: { amountMeters: number | null };
};

export type TaskFlowRecordDetailSurfaceProps = {
  taskId: string;
  flowRecordId: string;
};

export type TaskEditSurfaceProps = {
  taskId: string;
};
```

---

### §8 — `@beyo/tasks`: `use-task-detail.flow.ts`

**File 19 — CREATE `packages/tasks/src/flows/use-task-detail.flow.ts`**

Move the logic from `apps/.../features/tasks/flows/use-task-detail.flow.ts`. Key changes:

- Replace `import { useSurface } from "@/hooks/use-surface"` → use `useSurfaceStore.getState()` directly from `@beyo/ui`; remove `useSurface` entirely.
- Replace all `surface.open(...)` calls → `useSurfaceStore.getState().open(...)`
- Remove `import { preloadPinNotificationsSlideSurface, ... } from "../surfaces"` — the `preloadPinNotificationsSlideSurface()` call in `openMenu` is **dropped** (acceptable performance regression).
- Import surface IDs from `"../surface-ids"` (package-local) and `@beyo/task-working-sections`.
- `preloadWorkingSectionWorkerPickerSurface` is imported from `@beyo/working-sections`.
- `TASK_ACTIONS_SHEET_SURFACE_ID`, `TASK_READY_BY_AT_SHEET_SURFACE_ID`, etc. already in `"../surface-ids"`.
- New IDs `ITEM_QUANTITY_SHEET_SURFACE_ID`, `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID`, `TASK_EDIT_SLIDE_SURFACE_ID`, `TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID` are now also in `"../surface-ids"`.

```ts
import { useMemo } from "react";
import { useSurfaceStore } from "@beyo/ui";
import { preloadWorkingSectionWorkerPickerSurface } from "@beyo/working-sections";
import {
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  type TaskWorkingSectionsSurfaceOpeners,
  type TaskWorkingSectionsSurfaceProps,
} from "@beyo/task-working-sections";
import {
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_ASSORTMENT_SHEET_SURFACE_ID,
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
  TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID,
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
} from "../surface-ids";

export function useTaskDetailFlow(taskId: string, itemId: string | null) {
  const surfaceOpeners = useMemo<TaskWorkingSectionsSurfaceOpeners>(() => ({
    closeSlide: () =>
      useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID),
    closeDiscardSheet: () =>
      useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID),
    openDiscardChangesSheet: (props) =>
      useSurfaceStore.getState().open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, props),
    reopenSlideAfterError: (props) =>
      useSurfaceStore.getState().open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, props),
    preloadWorkerPickerSurface: preloadWorkingSectionWorkerPickerSurface,
  }), []);

  return {
    openMenu: () => {
      // preloadPinNotificationsSlideSurface removed — managers-app-only surface
      useSurfaceStore.getState().open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
    },
    openReadyByAtSheet: () =>
      useSurfaceStore.getState().open(TASK_READY_BY_AT_SHEET_SURFACE_ID, { taskId }),
    openAssortmentSheet: () =>
      useSurfaceStore.getState().open(TASK_ASSORTMENT_SHEET_SURFACE_ID, { taskId }),
    openFulfillmentMethodSheet: () =>
      useSurfaceStore.getState().open(TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID, { taskId }),
    openDeliveryDateSheet: () =>
      useSurfaceStore.getState().open(TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID, { taskId }),
    openEditTask: () =>
      useSurfaceStore.getState().open(TASK_EDIT_SLIDE_SURFACE_ID, { taskId }),
    openWorkingSectionsSlide: () =>
      useSurfaceStore.getState().open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, {
        taskId,
        surfaceOpeners,
      } satisfies TaskWorkingSectionsSurfaceProps),
    openQuantitySheet: () => {
      if (!itemId) return;
      useSurfaceStore.getState().open(ITEM_QUANTITY_SHEET_SURFACE_ID, { taskId, itemId });
    },
    openUpholsteryAmountSheet: (itemUpholsteryId: string) =>
      useSurfaceStore.getState().open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
        taskId,
        itemUpholsteryId,
      }),
    openFlowRecord: (flowRecordId: string) =>
      useSurfaceStore.getState().open(TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID, {
        taskId,
        flowRecordId,
      }),
  };
}

export type TaskDetailFlow = ReturnType<typeof useTaskDetailFlow>;
```

Note: `surfaceOpeners` `useMemo` has an empty dependency array because all references inside are stable (module-level constants and `useSurfaceStore.getState()` is always fresh).

---

### §9 — `@beyo/tasks`: `use-task-detail.controller.ts`

**File 20 — CREATE `packages/tasks/src/controllers/use-task-detail.controller.ts`**

```ts
import { useQueryClient } from "@tanstack/react-query";
import { useSurfaceStore } from "@beyo/ui";
import { ITEM_POSITION_SHEET_SURFACE_ID } from "@beyo/items";
import {
  getTaskTitle,
  itemUpholsteryKeys,
  taskFlowRecordKeys,
  taskKeys,
} from "../api/task-keys";
import { useGetTaskQuery } from "../api/use-get-task-query";
import { useDeleteTask } from "../actions/use-delete-task";
import { useResolveTask } from "../actions/use-resolve-task";
import { useUpdateTask } from "../actions/use-update-task";
import { useUpdateItem } from "../actions/use-update-item";
import { useUpdateItemPosition } from "../actions/use-update-item-position";
import { useCreateItemUpholstery } from "../actions/use-create-item-upholstery";
import { useUpdateItemUpholstery } from "../actions/use-update-item-upholstery";
import { useTaskDetailFlow } from "../flows/use-task-detail.flow";
```

The controller body is identical to the managers-app version with these import substitutions only. The `openPositionSheet` function uses `useSurfaceStore.getState().open(...)` and `useSurfaceStore.getState().open(...)` instead of `useSurface()` and `useSurfaceStore.getState()`. Specifically:

- Replace `import { useSurface } from "@/hooks/use-surface"` → removed; use `useSurfaceStore.getState()` inline.
- Replace `import { useSurfaceStore } from "@/providers/SurfaceProvider"` → `import { useSurfaceStore } from "@beyo/ui"`.
- Replace `import { useCreateItemUpholstery } from "@/features/items/actions/use-create-item-upholstery"` → `from "../actions/use-create-item-upholstery"` (etc. for all item actions).
- Replace `import { useDeleteTask } from "@/features/tasks/actions/use-delete-task"` → `from "../actions/use-delete-task"` (etc.).
- Replace `import { useGetTaskQuery } from "@beyo/tasks"` → `from "../api/use-get-task-query"`.
- Replace `import { getTaskTitle, itemUpholsteryKeys, taskFlowRecordKeys } from "@beyo/tasks"` → from local relative paths inside the package.

**Important:** `getTaskTitle` is in `lib/task-detail.ts`, `itemUpholsteryKeys` is in `api/item-upholstery-keys.ts` (or whichever file holds it), `taskFlowRecordKeys` is in `api/task-flow-record-keys.ts` — use the actual relative paths.

The `openPositionSheet` callback uses `useSurfaceStore.getState().open(...)` instead of `surface.open(...)`:

```ts
function openPositionSheet() {
  if (!itemId) return;

  function savePosition(position: string | null) {
    updateItemPosition.mutate(
      { id: itemId as string, item_position: position },
      {
        onError: () => {
          useSurfaceStore.getState().open(ITEM_POSITION_SHEET_SURFACE_ID, {
            itemId,
            initialPosition: position,
            onSave: savePosition,
          });
        },
      },
    );
  }

  useSurfaceStore.getState().open(ITEM_POSITION_SHEET_SURFACE_ID, {
    itemId,
    initialPosition: taskQuery.data?.item?.item_position ?? null,
    onSave: savePosition,
  });
}
```

Export:
```ts
export type TaskDetailController = ReturnType<typeof useTaskDetailController>;
```

---

### §10 — `@beyo/tasks`: `TaskDetailProvider.tsx`

**File 21 — CREATE `packages/tasks/src/providers/TaskDetailProvider.tsx`**

Identical to the managers-app version with import paths changed:
- `useTaskDetailController` → from `"../controllers/use-task-detail.controller"`
- `TaskDetailController` → from `"../controllers/use-task-detail.controller"`

```tsx
import { createContext, useContext, type ReactNode } from "react";
import {
  useTaskDetailController,
  type TaskDetailController,
} from "../controllers/use-task-detail.controller";

const TaskDetailContext = createContext<TaskDetailController | null>(null);

export function TaskDetailProvider({
  taskId,
  children,
}: {
  taskId: string;
  children: ReactNode;
}): React.JSX.Element {
  const controller = useTaskDetailController(taskId);
  return (
    <TaskDetailContext.Provider value={controller}>
      {children}
    </TaskDetailContext.Provider>
  );
}

export function useTaskDetailContext(): TaskDetailController {
  const context = useContext(TaskDetailContext);
  if (context === null) {
    throw new Error("useTaskDetailContext must be used inside TaskDetailProvider");
  }
  return context;
}
```

---

### §11 — `@beyo/tasks`: `TaskDetailSlidePage.tsx`

**File 22 — CREATE `packages/tasks/src/pages/TaskDetailSlidePage.tsx`**

Key substitutions from the managers-app version:

| Managers app import | Package import |
|---|---|
| `import { ContentCard, DashedInfoGroup } from "@/components/primitives"` | `import { ContentCard, DashedInfoGroup } from "@beyo/ui"` |
| `import { ItemUpholsteryField } from "@/features/items"` | `import { ItemUpholsteryField, isUpholsteryRequirementState } from "@beyo/upholstery"` |
| `import { TaskDetailProvider, useTaskDetailContext } from "@/features/tasks/providers/TaskDetailProvider"` | `import { TaskDetailProvider, useTaskDetailContext } from "../providers/TaskDetailProvider"` |
| `import { useSurfaceHeader } from "@/hooks/use-surface-header"` | `import { SurfaceHeaderContext } from "@beyo/ui"` + `const header = useContext(SurfaceHeaderContext)` |
| `import { useSurface } from "@/hooks/use-surface"` | Not needed — surface is never called in the page content component itself |
| `import { useSurfaceProps } from "@/hooks/use-surface-props"` | `import { SurfacePropsContext } from "@beyo/ui"` + `useContext(SurfacePropsContext)` |
| `import { preloadTaskNoteUnreadViewerSurface, preloadTaskNotesSheetSurface, type TaskDetailSurfaceProps } from "@/features/tasks/surfaces"` | `lazyWithPreload` from `@beyo/ui` + loaders from `@beyo/task-notes` (see below) |
| `import { TaskDetailSurfaceProps } from "@/features/tasks/surfaces"` | `import { type TaskDetailSurfaceProps } from "../surface-ids"` |

**Preload handles** — create at module-level (stable references for `usePreloadSurface`):
```ts
import { lazyWithPreload } from "@beyo/ui";
import { loadTaskNotesSheetPage, loadTaskNoteUnreadViewerPage } from "@beyo/task-notes";

const _taskNotesSheet = lazyWithPreload(loadTaskNotesSheetPage);
const _taskNoteUnreadViewer = lazyWithPreload(loadTaskNoteUnreadViewerPage);
const preloadTaskNotesSheet = _taskNotesSheet.preload;
const preloadTaskNoteUnreadViewer = _taskNoteUnreadViewer.preload;
```

**`toItemUpholsteryRequirementState` helper** — replace with `isUpholsteryRequirementState` from `@beyo/upholstery`:
```ts
function toRequirementState(value: string | null) {
  return isUpholsteryRequirementState(value) ? value : null;
}
```

**`TaskDetailSlidePage` (outer shell)**:
```tsx
export function TaskDetailSlidePage(): React.JSX.Element {
  const { taskId } = useContext(SurfacePropsContext) as Partial<TaskDetailSurfaceProps>;

  if (!taskId) {
    return (
      <div className="p-6 text-sm text-muted-foreground" data-testid="task-detail-slide">
        Task id is missing.
      </div>
    );
  }

  return (
    <div className="h-full bg-background" data-testid="task-detail-slide">
      <TaskDetailProvider taskId={taskId}>
        <TaskDetailSlidePageContent />
      </TaskDetailProvider>
    </div>
  );
}
```

**`TaskDetailSlidePageContent` (inner component)** — identical to managers-app version with substitutions above applied. The `renderUpholsteryField` prop passed to `TaskUpholsterySection` uses `ItemUpholsteryField` from `@beyo/upholstery`:

```tsx
renderUpholsteryField={({ disabled, onChange, requirementState, testId, value }) => (
  <ItemUpholsteryField
    disabled={disabled}
    onChange={onChange}
    requirementState={toRequirementState(requirementState)}
    testId={testId}
    value={value}
  />
)}
```

---

### §12 — `@beyo/tasks`: `index.ts` additions

**File 23 — MODIFY `packages/tasks/src/index.ts`**

Add all new exports:

```ts
// Types
export { UpdateTaskInputSchema, type UpdateTaskInput } from "./types";

// APIs
export { deleteTask } from "./api/delete-task";
export { resolveTask } from "./api/resolve-task";
export { updateTask } from "./api/update-task";

// Task mutation hooks
export { useDeleteTask } from "./actions/use-delete-task";
export { useResolveTask } from "./actions/use-resolve-task";
export { useUpdateTask } from "./actions/use-update-task";

// Item-in-task mutation hooks
export { useUpdateItem } from "./actions/use-update-item";
export { useUpdateItemPosition } from "./actions/use-update-item-position";
export { useCreateItemUpholstery } from "./actions/use-create-item-upholstery";
export { useUpdateItemUpholstery } from "./actions/use-update-item-upholstery";

// Surface IDs
export {
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_EDIT_SLIDE_SURFACE_ID,
} from "./surface-ids";
export type {
  ItemQuantitySurfaceProps,
  ItemUpholsteryAmountSurfaceProps,
  TaskFlowRecordDetailSurfaceProps,
  TaskEditSurfaceProps,
} from "./surface-ids";

// Flow, controller, provider
export { useTaskDetailFlow, type TaskDetailFlow } from "./flows/use-task-detail.flow";
export { useTaskDetailController, type TaskDetailController } from "./controllers/use-task-detail.controller";
export { TaskDetailProvider, useTaskDetailContext } from "./providers/TaskDetailProvider";

// Page loader
export function loadTaskDetailSlidePage() {
  return import("./pages/TaskDetailSlidePage").then((m) => ({
    default: m.TaskDetailSlidePage,
  }));
}
```

---

### §13 — Managers app: `surfaces.ts`

**File 24 — MODIFY `apps/.../features/tasks/surfaces.ts`**

Changes:
1. Remove local declarations for `ITEM_QUANTITY_SHEET_SURFACE_ID`, `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID`, `TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID`, `TASK_EDIT_SLIDE_SURFACE_ID` and their prop types — they are now imported from `@beyo/tasks`.
2. Add these to the existing `from "@beyo/tasks"` import block.
3. Add them to the `export { ... } from "@beyo/tasks"` block at the bottom.
4. Replace the local `function loadTaskDetailSlidePage()` with `loadTaskDetailSlidePage` imported from `@beyo/tasks`.
5. Change `const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage)` to use the imported function.

The `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID`, `PinNotificationsSlideSurfaceProps`, `PIN_TASK_STEP_STATES_SHEET_SURFACE_ID`, `PinTaskStepStatesSheetSurfaceProps` remain defined locally in `surfaces.ts`.

---

### §14 — Managers app: `features/tasks/index.ts`

**File 25 — MODIFY `apps/.../features/tasks/index.ts`**

The current `export * from "@beyo/tasks"` already re-exports `TaskDetailProvider` and `useTaskDetailContext` once those are in the package. Remove the explicit local re-exports of those:

```ts
// REMOVE these two lines:
export { TaskDetailProvider, useTaskDetailContext } from "./providers/TaskDetailProvider";
```

After deletion of `TaskDetailProvider.tsx`, these are covered by `export * from "@beyo/tasks"`.

---

### §15 — Managers app: `features/items/index.ts`

**File 26 — MODIFY `apps/.../features/items/index.ts`**

Remove exports for actions/API files being deleted:
- Remove: `export { useCreateItemUpholstery } from './actions/use-create-item-upholstery'`
- Remove: `export { useUpdateItemUpholstery } from './actions/use-update-item-upholstery'`

Keep: all other exports including `useUpdateItem`, `useSetUpholsteryQuantity`.

---

### §16 — Managers app: delete obsolete files

Delete the following 15 files:

**Task feature — flows, controllers, providers, page:**
- `apps/.../features/tasks/flows/use-task-detail.flow.ts`
- `apps/.../features/tasks/controllers/use-task-detail.controller.ts`
- `apps/.../features/tasks/providers/TaskDetailProvider.tsx`
- `apps/.../pages/tasks/TaskDetailSlidePage.tsx`

**Task feature — actions:**
- `apps/.../features/tasks/actions/use-delete-task.ts`
- `apps/.../features/tasks/actions/use-resolve-task.ts`
- `apps/.../features/tasks/actions/use-update-task.ts`

**Task feature — API:**
- `apps/.../features/tasks/api/delete-task.ts`
- `apps/.../features/tasks/api/resolve-task.ts`
- `apps/.../features/tasks/api/update-task.ts`

**Items feature — actions (only-in-controller mutations):**
- `apps/.../features/items/actions/use-update-item-position.ts`
- `apps/.../features/items/actions/use-create-item-upholstery.ts`
- `apps/.../features/items/actions/use-update-item-upholstery.ts`

**Items feature — API:**
- `apps/.../features/items/api/create-item-upholstery.ts`
- `apps/.../features/items/api/update-item-upholstery.ts`

---

## File summary

| # | Operation | Path |
|---|---|---|
| 1 | CREATE | `packages/ui/src/components/ContentCard.tsx` |
| 2 | CREATE | `packages/ui/src/components/DashedInfoGroup.tsx` |
| 3 | MODIFY | `packages/ui/src/index.ts` |
| 4 | MODIFY | `packages/tasks/src/types.ts` |
| 5 | CREATE | `packages/tasks/src/api/delete-task.ts` |
| 6 | CREATE | `packages/tasks/src/api/resolve-task.ts` |
| 7 | CREATE | `packages/tasks/src/api/update-task.ts` |
| 8 | CREATE | `packages/items/src/api/create-item-upholstery.ts` |
| 9 | CREATE | `packages/items/src/api/update-item-upholstery.ts` |
| 10 | MODIFY | `packages/items/src/index.ts` |
| 11 | CREATE | `packages/tasks/src/actions/use-delete-task.ts` |
| 12 | CREATE | `packages/tasks/src/actions/use-resolve-task.ts` |
| 13 | CREATE | `packages/tasks/src/actions/use-update-task.ts` |
| 14 | CREATE | `packages/tasks/src/actions/use-update-item.ts` |
| 15 | CREATE | `packages/tasks/src/actions/use-update-item-position.ts` |
| 16 | CREATE | `packages/tasks/src/actions/use-create-item-upholstery.ts` |
| 17 | CREATE | `packages/tasks/src/actions/use-update-item-upholstery.ts` |
| 18 | MODIFY | `packages/tasks/src/surface-ids.ts` |
| 19 | CREATE | `packages/tasks/src/flows/use-task-detail.flow.ts` |
| 20 | CREATE | `packages/tasks/src/controllers/use-task-detail.controller.ts` |
| 21 | CREATE | `packages/tasks/src/providers/TaskDetailProvider.tsx` |
| 22 | CREATE | `packages/tasks/src/pages/TaskDetailSlidePage.tsx` |
| 23 | MODIFY | `packages/tasks/src/index.ts` |
| 24 | MODIFY | `apps/.../features/tasks/surfaces.ts` |
| 25 | MODIFY | `apps/.../features/tasks/index.ts` |
| 26 | MODIFY | `apps/.../features/items/index.ts` |
| 27 | DELETE | `apps/.../pages/tasks/TaskDetailSlidePage.tsx` |
| 28 | DELETE | `apps/.../features/tasks/flows/use-task-detail.flow.ts` |
| 29 | DELETE | `apps/.../features/tasks/controllers/use-task-detail.controller.ts` |
| 30 | DELETE | `apps/.../features/tasks/providers/TaskDetailProvider.tsx` |
| 31 | DELETE | `apps/.../features/tasks/actions/use-delete-task.ts` |
| 32 | DELETE | `apps/.../features/tasks/actions/use-resolve-task.ts` |
| 33 | DELETE | `apps/.../features/tasks/actions/use-update-task.ts` |
| 34 | DELETE | `apps/.../features/tasks/api/delete-task.ts` |
| 35 | DELETE | `apps/.../features/tasks/api/resolve-task.ts` |
| 36 | DELETE | `apps/.../features/tasks/api/update-task.ts` |
| 37 | DELETE | `apps/.../features/items/actions/use-update-item-position.ts` |
| 38 | DELETE | `apps/.../features/items/actions/use-create-item-upholstery.ts` |
| 39 | DELETE | `apps/.../features/items/actions/use-update-item-upholstery.ts` |
| 40 | DELETE | `apps/.../features/items/api/create-item-upholstery.ts` |
| 41 | DELETE | `apps/.../features/items/api/update-item-upholstery.ts` |

**Total: 22 new/modified + 15 deleted = 41 file operations**

Full managers app paths use prefix:
`apps/managers-app/ManagerBeyo-app-managers/src/`

---

## Risks and mitigations

- **Risk:** `@beyo/tasks/package.json` does not yet list `@beyo/upholstery` as a dependency — `upholsteryKeys.pickerLists()` import in §6 hooks would fail.
  **Mitigation:** Before creating files in §6, check `packages/tasks/package.json`. If `@beyo/upholstery` is absent, add it. If adding the dependency is blocked by circular imports, remove `upholsteryKeys.pickerLists()` from the package mutation hooks (accept that the upholstery picker list won't invalidate on create/update — it will still refresh on next navigation or socket event).

- **Risk:** `getTaskTitle`, `itemUpholsteryKeys`, `taskFlowRecordKeys` are re-exported from `@beyo/tasks/index.ts` — a package controller importing from its own index creates a circular barrel. **Mitigation:** In the controller, import these from their actual source paths (e.g., `"../lib/task-detail"`, `"../api/item-upholstery-keys"`, `"../api/task-flow-record-keys"`) rather than from `"@beyo/tasks"`.

- **Risk:** Managers-app pages (`ItemQuantitySheetPage`, `ItemUpholsteryAmountSheetPage`) still import from `@/features/items` — these must not be affected by the `features/items/index.ts` change.
  **Mitigation:** Only remove the two specific exports listed in §15; verify `useUpdateItem` and `useSetUpholsteryQuantity` remain in the barrel.

- **Risk:** `pendingSeatUpholsteryKeys.all` invalidation is dropped from the package mutations. After a user creates/updates an upholstery, the pending seat count and list may show stale data until the next socket event or manual refresh.
  **Mitigation:** Accepted trade-off — documented in plan. The managers-app versions of these mutations (being deleted) are no longer the execution path; the package versions are simpler by design.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual browser test: open task detail slide → verify all sections render, all action buttons open correct sheets/slides
- Manual browser test: create upholstery on a seat task → verify task detail refreshes and upholstery section updates

## Review log

- Implemented in `@beyo/tasks` / `@beyo/items`; managers app rewired to consume the package slide loader and migrated surface contracts.
- Validation completed with `npm run typecheck` passing.
- Summary written: `docs/architecture/implemented_summaries/SUMMARY_PLAN_task_detail_slide_to_package_20260703.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
