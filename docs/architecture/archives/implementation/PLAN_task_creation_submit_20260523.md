# PLAN_task_creation_submit_20260523

## Metadata

- Plan ID: `PLAN_task_creation_submit_20260523`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T18:21:01Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Wire the existing task-creation staged forms (return, pre_order, internal) to the real `PUT /api/v1/tasks` endpoint. On submit, normalize form values into the backend payload, fire the mutation, apply an optimistic update to the task list stores and TanStack Query cache, and close (or reset) the slide surface.
- Business/user intent: After filling the form and tapping the final "next" button the task appears immediately in the task list without a loading delay. If the server rejects the request, the optimistic entry is rolled back cleanly.
- Non-goals: Real-time push events, server-side filtering validation, upholstery inventory lookup, step sequence ordering beyond what the form provides.

## Scope

- In scope:
  - `create-task.ts` API function (PUT /api/v1/tasks)
  - `use-create-task.ts` action hook with optimistic store injection and rollback
  - Payload normalizer lib functions for return/pre_order and internal form values
  - Store `remove` / `setOne` operations needed for rollback
  - `TaskCreationFormProvider` — add `regenerateIds()` for internal form loop
  - Wiring `onSubmit` in `ReturnFormContent`, `PreOrderFormContent`, `InternalFormContent`
  - Slide pages: close surface on success (return/pre_order), reset + step 1 on success (internal)
  - Public API exports in `index.ts`
- Out of scope:
  - Severity picker re-enable (still commented out)
  - Server-side step sequencing / dependency creation
  - Notes creation at task creation time
  - Customer de-duplication logic (backend handles find-or-create)
- Assumptions:
  - `TaskCreationFormProvider` is the single source of pre-generated client IDs; these IDs are generated at provider mount and are stable until `regenerateIds()` is called.
  - Images uploaded during form filling are already persisted to S3 and confirmed before submit; they are linked to `itemClientId` and will appear in the task list after the first server refresh.
  - `task_scalar_id: 0` is acceptable for the optimistic entry; it is replaced by the real value on invalidation.
  - The optimistic list item is prepended to the first page of every active list query, regardless of active filters. If active filters exclude it, it will disappear on the next invalidation — that is the expected behaviour (no client-side filter matching required).

## Clarifications required

_(none — all ambiguities resolved by reading implementation files)_

## Acceptance criteria

1. Submitting the return form calls `PUT /api/v1/tasks` with the correct payload and the new task card appears in the list immediately.
2. Submitting the pre_order form behaves identically to return except `task_type: 'pre_order'`.
3. Submitting the internal form appears in the list immediately, then the slide page clears the form, regenerates client IDs, and returns to step 1 — the slide remains open.
4. If the server returns an error, the optimistic task card is removed from the list and the slide stays open with the form intact.
5. TypeScript reports zero errors after all changes.

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: action hook structure, optimistic update pattern (onMutate / onError / onSettled), cache snapshot and rollback
- `architecture/05_server_state.md`: TanStack Query infinite query cache shape, `setQueriesData` / `cancelQueries`
- `architecture/04_api_client.md`: `apiClient.put` usage, `ApiEnvelopeSchema`, error shape
- `architecture/06_client_state.md`: Zustand store patterns, `.getState()` for out-of-component store writes
- `architecture/15_feature_structure.md`: file placement rules
- `architecture/09_forms.md`: `zodResolver`, RHF `handleSubmit`, `useStagedForm.onSubmit`

### Local extensions loaded

- `architecture/04_api_client_local.md`: flat string error shape (`error: "..."`) — no `field_errors`

### File read intent — pattern vs. relational

Permitted reads performed:
- `src/features/tasks/types.ts` — established `TaskListItemRaw`, `TaskRecord`, `TASK_TYPE`, `TASK_STATE`, `TASK_PRIORITY`, `TASK_RETURN_SOURCE`, `TASK_FULFILLMENT_METHOD`, `TASK_RETURN_METHOD`, `TASK_ITEM_LOCATION`, `ListTasksFullParams`
- `src/features/tasks/api/task-keys.ts` — verified `taskKeys.lists()`, `taskKeys.detail(id)`
- `src/features/tasks/store/tasks.store.ts` — verified `setMany`, `setTaskItemRelation`, `patch`; confirmed `remove` is missing
- `src/features/tasks/store/items.store.ts` — verified `setMany`, `patch`; confirmed `remove` is missing
- `src/features/tasks/store/task-list-images.store.ts` — verified `setForItem`, `patchImage`; confirmed `removeForItem` is missing
- `src/features/tasks/api/use-list-tasks-query.ts` — confirmed `normalizePageIntoStores` pattern; `orderedTaskIds` derives from `query.data.pages`
- `src/features/tasks/flows/use-tasks-page.flow.ts` — confirmed `orderedTaskIds` comes from `query.data?.pages` not from store; stores feed the card data lookup
- `src/features/task-creation/types.ts` — confirmed form schemas for all three types
- `src/features/task-creation/providers/TaskCreationFormProvider.tsx` — confirmed `useRef`-based IDs; confirmed `regenerateIds` is missing
- `src/features/task-creation/components/ReturnFormContent.tsx` — confirmed `onSubmit: console.log` stub; confirmed `useStagedForm` wiring point
- `src/features/task-creation/components/InternalFormContent.tsx` — confirmed same
- `src/features/items/types.ts` — confirmed `ItemDetailsFieldsSchema`, `ItemUpholsteryFieldsSchema`, `ItemIssueFieldEntry`
- `src/features/customers/types.ts` — confirmed `CustomerFieldsSchema` fields
- `src/features/working-sections/types.ts` — confirmed `WorkingSectionAssignmentSchema` (`working_section_id`, `assigned_worker_id`)
- `src/lib/client-id.ts` — confirmed `generateClientId('ExecutionTask')`, `generateClientId('Item')`, `generateClientId('Customer')`
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_route_create_task_contract_20260523.md` — full request/response shapes

### Skill selection

- Primary skill: action hook + optimistic update
- Trigger terms: `useMutation`, `onMutate`, `setQueriesData`, Zustand `.getState()`

## Implementation plan

### Step 1 — API function

**Create** `src/features/tasks/api/create-task.ts`

```ts
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

const CreateTaskResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string(), task_scalar_id: z.number().int() })
).extend({ ok: z.literal(true) });

export type CreateTaskResult = z.infer<typeof CreateTaskResponseSchema>['data'];

// Loosely typed input — the normalizers produce the exact shape.
// Using unknown here avoids duplicating a large payload schema.
export async function createTask(payload: Record<string, unknown>): Promise<CreateTaskResult> {
  const parsed = await apiClient.put('/api/v1/tasks', payload, CreateTaskResponseSchema);
  return parsed.data;
}
```

---

### Step 2 — Store rollback operations

**Modify** `src/features/tasks/store/tasks.store.ts`

Add to `TasksStoreState`:
```ts
setOne: (task: TaskRecord) => void;
remove: (taskId: string) => void;
removeRelation: (taskId: string) => void;
```

Implement in `create(...)`:
```ts
setOne: (task) =>
  set((state) => ({
    tasksById: { ...state.tasksById, [task.client_id]: task },
  })),
remove: (taskId) =>
  set((state) => {
    const { [taskId]: _removed, ...rest } = state.tasksById;
    return { tasksById: rest };
  }),
removeRelation: (taskId) =>
  set((state) => {
    const { [taskId]: _removed, ...rest } = state.taskIdToItemId;
    return { taskIdToItemId: rest };
  }),
```

**Modify** `src/features/tasks/store/items.store.ts`

Add:
```ts
setOne: (item: ItemRecord) => void;
remove: (itemId: string) => void;
```

Implement:
```ts
setOne: (item) =>
  set((state) => ({
    itemsById: { ...state.itemsById, [item.client_id]: item },
  })),
remove: (itemId) =>
  set((state) => {
    const { [itemId]: _removed, ...rest } = state.itemsById;
    return { itemsById: rest };
  }),
```

**Modify** `src/features/tasks/store/task-list-images.store.ts`

Add:
```ts
removeForItem: (itemId: string) => void;
```

Implement:
```ts
removeForItem: (itemId) =>
  set((state) => {
    const { [itemId]: _removed, ...rest } = state.imagesByItemId;
    return { imagesByItemId: rest };
  }),
```

---

### Step 3 — Payload normalizers

**Create** `src/features/task-creation/lib/normalize-task-form-payload.ts`

This file exports two functions. Both return `Record<string, unknown>` (the raw API payload object).

```ts
import type { ReturnFormValues, InternalFormValues } from '../types';

type BaseIds = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
};

// Shared: maps customer fields to flat task-level customer fields
function buildCustomerFields(customer: ReturnFormValues['customer']) {
  return {
    customer_display_name: customer.display_name?.trim() || undefined,
    primary_phone_number: customer.primary_phone_number?.trim() || undefined,
    primary_email: customer.primary_email?.trim() || undefined,
    customer_address:
      customer.address?.street?.trim()
        ? {
            line1: customer.address.street,
            city: customer.address.city || undefined,
            postal_code: customer.address.postal_code || undefined,
            country: customer.address.country || undefined,
          }
        : undefined,
  };
}

// Shared: maps item details fields to the nested item object
function buildItemFields(
  item: ReturnFormValues['item'],
  itemClientId: string,
) {
  const hasAnyItemData =
    item.article_number?.trim() ||
    item.sku?.trim() ||
    item.designer?.trim() ||
    item.item_category_id ||
    item.item_position?.trim() ||
    (item.quantity != null && item.quantity !== 1);

  if (!hasAnyItemData) return undefined;

  return {
    client_id: itemClientId,
    article_number: item.article_number?.trim() || undefined,
    sku: item.sku?.trim() || undefined,
    item_category_id: item.item_category_id || undefined,
    quantity: item.quantity ?? 1,
    designer: item.designer?.trim() || undefined,
    item_position: item.item_position?.trim() || undefined,
    item_currency: item.item_currency || undefined,
  };
}

// Shared: maps item_issues entries
function buildIssueFields(issues: ReturnFormValues['item_issues']) {
  if (!issues.length) return undefined;
  return issues.map((entry) => ({
    issue_type_id: entry.issue_id,
    issue_severity_id: entry.issue_severity_id || undefined,
  }));
}

// Shared: maps item_upholstery fields
function buildUpholsteryFields(upholstery: ReturnFormValues['item_upholstery']) {
  if (!upholstery.upholstery_client_id) return undefined;
  return {
    upholstery_id: upholstery.upholstery_client_id,
    source: 'internal' as const,
    amount_meters: upholstery.upholstery_amount_meters ?? undefined,
  };
}

export function normalizeReturnFormPayload(
  values: ReturnFormValues,
  ids: BaseIds,
  taskType: 'return' | 'pre_order' = 'return',
): Record<string, unknown> {
  const itemFields = buildItemFields(values.item, ids.itemClientId);
  const issueFields = buildIssueFields(values.item_issues);
  const upholsteryFields = buildUpholsteryFields(values.item_upholstery);

  return {
    client_id: ids.taskClientId,
    task_type: taskType,
    state: 'pending',
    priority: 'normal',
    return_source: values.return_source || undefined,
    fulfillment_method: values.fulfillment_method || undefined,
    scheduled_start_at: values.scheduled_start_at || undefined,
    scheduled_end_at: values.scheduled_end_at || undefined,
    ready_by_at: values.ready_by_at || undefined,
    additional_details: values.additional_details?.trim()
      ? { text: values.additional_details.trim() }
      : undefined,
    ...buildCustomerFields(values.customer),
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    ...(upholsteryFields ? { item_upholstery: upholsteryFields } : {}),
  };
}

export function normalizeInternalFormPayload(
  values: InternalFormValues,
  ids: BaseIds,
): Record<string, unknown> {
  const itemFields = buildItemFields(values.item, ids.itemClientId);
  const issueFields = buildIssueFields(values.item_issues);
  const upholsteryFields = buildUpholsteryFields(values.item_upholstery);

  // Collect all step assignments into the steps array
  const steps: Record<string, unknown>[] = [
    ...values.working_section_assignments.map((a) => ({
      working_section_id: a.working_section_id,
      worker_id: a.assigned_worker_id || undefined,
    })),
    ...(values.needs_cleaning_assignment
      ? [
          {
            working_section_id: values.needs_cleaning_assignment.working_section_id,
            worker_id: values.needs_cleaning_assignment.assigned_worker_id || undefined,
          },
        ]
      : []),
    ...(values.oiling_treatment_assignment
      ? [
          {
            working_section_id: values.oiling_treatment_assignment.working_section_id,
            worker_id: values.oiling_treatment_assignment.assigned_worker_id || undefined,
          },
        ]
      : []),
  ];

  return {
    client_id: ids.taskClientId,
    task_type: 'internal',
    state: 'pending',
    priority: 'normal',
    ready_by_at: values.ready_by_at || undefined,
    additional_details: values.additional_details?.trim()
      ? { text: values.additional_details.trim() }
      : undefined,
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    ...(upholsteryFields ? { item_upholstery: upholsteryFields } : {}),
    ...(steps.length > 0 ? { steps } : {}),
  };
}
```

---

### Step 4 — `use-create-task` action hook

**Create** `src/features/tasks/actions/use-create-task.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryKey } from '@tanstack/react-query';

import { useItemsStore } from '../store/items.store';
import { useTaskListImagesStore } from '../store/task-list-images.store';
import { useTasksStore } from '../store/tasks.store';
import { taskKeys } from '../api/task-keys';
import { createTask } from '../api/create-task';
import type { TaskListItemRaw } from '../types';

// Builds a minimal TaskListItemRaw for the optimistic entry.
// All unknown numeric values use 0; enums use narrowest valid value.
function buildOptimisticListItem(payload: Record<string, unknown>): TaskListItemRaw {
  const taskClientId = payload.client_id as string;
  const itemPayload = payload.item as Record<string, unknown> | undefined;
  const itemClientId = (itemPayload?.client_id as string | undefined) ?? null;
  const now = new Date().toISOString();

  return {
    task: {
      client_id: taskClientId,
      task_scalar_id: 0,
      task_type: (payload.task_type as TaskListItemRaw['task']['task_type']) ?? 'return',
      priority: (payload.priority as TaskListItemRaw['task']['priority']) ?? 'normal',
      state: 'pending',
      title: (itemPayload?.designer as string | null) ?? null,
      summary: null,
      return_source: (payload.return_source as TaskListItemRaw['task']['return_source']) ?? null,
      item_location: null,
      return_method: null,
      fulfillment_method:
        (payload.fulfillment_method as TaskListItemRaw['task']['fulfillment_method']) ?? null,
      additional_details: (payload.additional_details as Record<string, unknown> | null) ?? null,
      ready_by_at: (payload.ready_by_at as string | null) ?? null,
      scheduled_start_at: (payload.scheduled_start_at as string | null) ?? null,
      scheduled_end_at: (payload.scheduled_end_at as string | null) ?? null,
      customer_id: null,
      primary_phone_number: (payload.primary_phone_number as string | null) ?? null,
      secondary_phone_number: null,
      primary_email: (payload.primary_email as string | null) ?? null,
      secondary_email: null,
      address: null,
      created_at: now,
      updated_at: null,
      closed_at: null,
      is_deleted: false,
      deleted_at: null,
    },
    primary_item: itemClientId
      ? {
          client_id: itemClientId,
          article_number: (itemPayload?.article_number as string | null) ?? null,
          sku: (itemPayload?.sku as string | null) ?? null,
          state: 'pending',
          item_category_id: (itemPayload?.item_category_id as string | null) ?? null,
          quantity: (itemPayload?.quantity as number | null) ?? 1,
          designer: (itemPayload?.designer as string | null) ?? null,
          height_in_cm: null,
          width_in_cm: null,
          depth_in_cm: null,
          item_value_minor: null,
          item_cost_minor: null,
          item_currency: (itemPayload?.item_currency as string | null) ?? null,
          item_position: (itemPayload?.item_position as string | null) ?? null,
          external_id: null,
          external_url: null,
          external_source: null,
          external_order_id: null,
          item_category_snapshot: null,
          item_major_category_snapshot: null,
        }
      : null,
    item_images: [],
  };
}

type CreateTaskContext = {
  listQueriesSnapshot: [QueryKey, unknown][];
  taskClientId: string;
  itemClientId: string | null;
};

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createTask(payload),

    onMutate: async (payload): Promise<CreateTaskContext> => {
      const taskClientId = payload.client_id as string;
      const itemClientId =
        ((payload.item as Record<string, unknown> | undefined)?.client_id as string | undefined) ??
        null;

      // Cancel in-flight list queries to avoid a stale refetch overwriting optimistic data
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot all active list queries for rollback
      const listQueriesSnapshot = queryClient.getQueriesData<unknown>({
        queryKey: taskKeys.lists(),
      });

      // Build optimistic list item
      const optimisticItem = buildOptimisticListItem(payload);

      // Inject into every active list query's first page
      queryClient.setQueriesData<InfiniteData<{ items: TaskListItemRaw[]; has_more: boolean; limit: number; offset: number }>>(
        { queryKey: taskKeys.lists() },
        (old) => {
          if (!old) return old;
          const firstPage = old.pages[0];
          if (!firstPage) return old;
          return {
            ...old,
            pages: [
              { ...firstPage, items: [optimisticItem, ...firstPage.items] },
              ...old.pages.slice(1),
            ],
          };
        },
      );

      // Push directly into the Zustand stores (required because the flow reads from stores, not query cache)
      useTasksStore.getState().setOne(optimisticItem.task);
      if (optimisticItem.primary_item) {
        useItemsStore.getState().setOne(optimisticItem.primary_item);
        useTasksStore.getState().setTaskItemRelation(taskClientId, optimisticItem.primary_item.client_id);
      }

      return { listQueriesSnapshot, taskClientId, itemClientId };
    },

    onError: (_err, _payload, context) => {
      if (!context) return;

      // Restore query cache from snapshot
      for (const [key, data] of context.listQueriesSnapshot) {
        queryClient.setQueryData(key, data);
      }

      // Remove optimistic entries from stores
      useTasksStore.getState().remove(context.taskClientId);
      useTasksStore.getState().removeRelation(context.taskClientId);
      if (context.itemClientId) {
        useItemsStore.getState().remove(context.itemClientId);
        useTaskListImagesStore.getState().removeForItem(context.itemClientId);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

---

### Step 5 — `TaskCreationFormProvider` — add `regenerateIds`

**Modify** `src/features/task-creation/providers/TaskCreationFormProvider.tsx`

Change `useRef`-based IDs to `useState` and expose `regenerateIds`:

```ts
type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  regenerateIds: () => void;
};

// In the provider body:
const [taskClientId, setTaskClientId] = useState(() => generateClientId('ExecutionTask'));
const [itemClientId, setItemClientId] = useState(() => generateClientId('Item'));
const [customerClientId, setCustomerClientId] = useState(() => generateClientId('Customer'));

function regenerateIds() {
  setTaskClientId(generateClientId('ExecutionTask'));
  setItemClientId(generateClientId('Item'));
  setCustomerClientId(generateClientId('Customer'));
}

// Pass all four into context value:
{ taskClientId, itemClientId, customerClientId, regenerateIds }
```

---

### Step 6 — Wire `ReturnFormContent` submit

**Modify** `src/features/task-creation/components/ReturnFormContent.tsx`

Replace the `console.log` stub in `onSubmit` with a real mutation call.

Add imports:
```ts
import { useCreateTask } from '@/features/tasks';
import { useSurface } from '@/hooks/use-surface';
import { normalizeReturnFormPayload } from '../lib/normalize-task-form-payload';
import { TASK_CREATION_RETURN_SURFACE_ID } from '../surfaces';
```

Inside `ReturnFormContent`:
```ts
const { taskClientId, itemClientId, customerClientId } = useTaskCreationFormContext();
const createTask = useCreateTask();
const surface = useSurface();
```

Replace `onSubmit` stub:
```ts
onSubmit: () =>
  form.handleSubmit((values) => {
    const payload = normalizeReturnFormPayload(
      values,
      { taskClientId, itemClientId, customerClientId },
      'return',
    );
    createTask.mutate(payload, {
      onSuccess: () => surface.close(TASK_CREATION_RETURN_SURFACE_ID),
    });
  })(),
```

Also disable the advance button while the mutation is pending by passing `isSubmitting={createTask.isPending}` to `StagedForm`. Check the `StagedForm` props — if it has an `isSubmitting` prop, use it; otherwise add `disabled={createTask.isPending}` to the submit button rendered by `StagedForm`.

---

### Step 7 — Wire `PreOrderFormContent` submit

**Modify** `src/features/task-creation/components/PreOrderFormContent.tsx`

Identical to Step 6 except:
- Import `TASK_CREATION_PRE_ORDER_SURFACE_ID`
- Pass `'pre_order'` as the `taskType` argument to `normalizeReturnFormPayload`
- Close `TASK_CREATION_PRE_ORDER_SURFACE_ID` on success

---

### Step 8 — Wire `InternalFormContent` submit

**Modify** `src/features/task-creation/components/InternalFormContent.tsx`

Add imports:
```ts
import { useCreateTask } from '@/features/tasks';
import { normalizeInternalFormPayload } from '../lib/normalize-task-form-payload';
```

Inside `InternalFormContent`:
```ts
const { taskClientId, itemClientId, customerClientId, regenerateIds } = useTaskCreationFormContext();
const createTask = useCreateTask();
```

Replace `onSubmit` stub:
```ts
onSubmit: () =>
  form.handleSubmit((values) => {
    const payload = normalizeInternalFormPayload(
      values,
      { taskClientId, itemClientId, customerClientId },
    );
    createTask.mutate(payload, {
      onSuccess: () => {
        // Internal task: keep slide open, reset form, regenerate IDs, return to step 1
        const defaultValues: InternalFormValues = {
          item: {
            designer: '',
            article_number: '',
            sku: '',
            quantity: 1,
            item_position: '',
            item_currency: undefined,
            item_category_id: undefined,
            major_category: undefined,
          },
          item_upholstery: { upholstery_client_id: null, upholstery_amount_meters: null },
          item_issues: [],
          needs_cleaning_assignment: null,
          oiling_treatment_assignment: null,
          working_section_assignments: [],
          ready_by_at: null,
          additional_details: '',
        };
        form.reset(defaultValues);
        regenerateIds();
        staged.navigateTo('item');
      },
    });
  })(),
```

---

### Step 9 — Public API exports

**Modify** `src/features/tasks/index.ts`

Add:
```ts
export { useCreateTask } from './actions/use-create-task';
```

**Modify** `src/features/task-creation/index.ts`

Add:
```ts
export { normalizeReturnFormPayload, normalizeInternalFormPayload } from './lib/normalize-task-form-payload';
```

---

## Risks and mitigations

- Risk: `StagedForm` has no `isSubmitting` prop and blocks navigation internally — mutation fires but UI gives no feedback.
  Mitigation: Read `StagedForm`'s props type before implementing Step 6. If no such prop exists, add a local `disabled` flag via a `useEffect` on `createTask.isPending` and disable the advance button with an available prop.

- Risk: `queryClient.setQueriesData` TypeScript overload may require exact generic typing for the infinite query.
  Mitigation: Use `as any` only on the updater argument if the overload cannot be satisfied; add a comment explaining the cast.

- Risk: `staged.navigateTo` may not exist on `useStagedForm` return.
  Mitigation: Read `useStagedForm` return type. If the method is named differently (e.g. `goTo`, `jumpTo`), use the correct name. If unavailable, use `staged.back()` repeated or check if the staged form exposes a reset method.

- Risk: On rollback, removing from stores but not immediately re-fetching could leave a stale UI state if the network is slow.
  Mitigation: `onSettled` always invalidates, so the refetch will correct any residual inconsistency.

- Risk: Internal form `regenerateIds` triggers a re-render of `EntityImagesProvider` with a new `entityClientId`. The old image uploads associated with the old `itemClientId` remain in S3 but are orphaned (no task/item was created since the form was reset after successful creation, not failed creation).
  Mitigation: Acceptable — images are already confirmed and linked to the successfully-created item's `itemClientId`. The new `itemClientId` starts fresh for the next item. Orphaned pre-creation images (if any) are a storage concern, not a UX concern.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep "use-create-task"`: action hook unit tests (if written)
- Manual: open return form → fill item step → advance → fill customer step → advance → fill task step → advance (submit) → task card appears instantly in list → network response arrives → list re-fetches with real task_scalar_id
- Manual: repeat above with network throttled to Slow 3G — confirm optimistic card holds during the slow request
- Manual: submit with invalid `item_category_id` → server returns error → optimistic card disappears → slide stays open

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
