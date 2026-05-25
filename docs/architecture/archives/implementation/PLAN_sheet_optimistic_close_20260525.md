# PLAN_sheet_optimistic_close_20260525

## Metadata

- Plan ID: `PLAN_sheet_optimistic_close_20260525`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-25T00:00:00Z`
- Last updated at (UTC): `2026-05-25T10:13:23Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Make all save-action bottom sheets close with the correct Vaul exit animation, and close optimistically (before the API response) with rollback-to-prefill on failure.
- Business/user intent: Pressing "Save" on an edit sheet should feel instant — the sheet slides away immediately rather than waiting for the network. On API failure the sheet re-opens with the user's data intact so they can retry.
- Non-goals: Changing the underlying mutation payload shape, adding new sheet surfaces, or touching the slide or modal surface types.

## Scope

- In scope:
  - Fix the broken close animation on `TaskScheduledDateSheetPage`, `ItemQuantitySheetPage`, `ItemUpholsteryAmountSheetPage` (currently call `surface.closeTop()` which bypasses Vaul's exit animation)
  - Switch all three pages to optimistic close: call `header.requestClose()` immediately on save press, before the mutation fires
  - Add failure recovery to all three pages: on `onError`, re-open the sheet via `useSurfaceStore.getState().open(SURFACE_ID, { ...props, prefill })` so the user's input is preserved
  - Add `onMutate` optimistic snapshot + `onError` rollback to `useUpdateTask`, `useUpdateItem`, and `useSetUpholsteryQuantity` (currently all three are missing these hooks — contract violation per `08_hooks.md`)
  - Add `taskKeys.lists()` invalidation to `useSetUpholsteryQuantity.onSettled` (currently missing)
  - Extend `TaskScheduledDateSurfaceProps`, `ItemQuantitySurfaceProps`, `ItemUpholsteryAmountSurfaceProps` in `surfaces.ts` with an optional `prefill` field

- Out of scope:
  - `TaskEditSlidePage` (slide surface, uses framer-motion `AnimatePresence` which already handles exit animation on stack removal — different mechanism)
  - Any sheet that has no save button (e.g., `TaskDetailMenuSheetPage`, `TaskFilterSheetPage`, `TaskFlowRecordDetailSheetPage`)

- Assumptions:
  - `header?.requestClose()` in `BottomSheetSurface` calls `handleClose()` which: fires `onStartClose?.()`, sets `isOpen(false)` (Vaul starts exit animation), then after 350ms calls `onClose()` which removes from the stack. This is the correct animated close path.
  - Network errors typically arrive in > 350ms, so by the time `onError` fires the animation has completed and the surface has been removed from the stack. `useSurfaceStore.getState().open(id, props)` therefore adds a fresh entry rather than updating an in-stack entry.
  - Each page retains access to `header` (from `useSurfaceHeader()`) and to its current surface props (from `useSurfaceProps()`) until the component unmounts.

## Clarifications required

None — all required files have been read and the pattern is unambiguous from contracts.

## Acceptance criteria

1. Pressing "Save" on any of the three sheet pages immediately starts the Vaul slide-down animation (not an instant disappear).
2. The sheet closes before the API response arrives (no spinner wait).
3. If the API call fails, the sheet re-opens automatically with the same input the user had entered.
4. `useUpdateTask`, `useUpdateItem`, and `useSetUpholsteryQuantity` all follow the `onMutate` → `onError` → `onSettled` lifecycle from `08_hooks.md` (snapshot + rollback + invalidate).
5. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: Action hook lifecycle (onMutate snapshot, onError rollback, onSettled invalidation); Case 2 optimistic-page-navigation failure recovery pattern adapted for surface system
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md`: `BottomSheetSurface` close contract; `requestClose` via `SurfaceHeaderContext`; optimistic surface recovery via `useSurfaceStore.getState().open()`; `sheet` surface type

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `BottomSheetSurface` uses a 350ms delayed close to preserve Vaul's spring exit. `requestClose` is the correct externally-callable animated close path.

### File read intent — pattern vs. relational

Permitted reads already done (relational — what exists):
- `src/pages/tasks/TaskScheduledDateSheetPage.tsx` — current save pattern (`onSuccess: () => surface.closeTop()`)
- `src/pages/tasks/ItemQuantitySheetPage.tsx` — same
- `src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx` — same
- `src/components/surfaces/BottomSheetSurface.tsx` — `handleClose()` and `requestClose` wiring
- `src/features/tasks/actions/use-update-task.ts` — missing `onMutate`/`onError`
- `src/features/items/actions/use-update-item.ts` — missing `onMutate`/`onError`
- `src/features/items/actions/use-set-upholstery-quantity.ts` — missing `onMutate`/`onError`, missing lists invalidation
- `src/features/tasks/surfaces.ts` — surface IDs and prop types
- `src/features/tasks/types.ts` — `TaskDetailRaw` shape (task, item, item_upholstery fields)
- `src/providers/SurfaceProvider.tsx` — `useSurfaceStore`, `SurfaceHeaderContext.requestClose`

### Skill selection

- Primary skill: direct implementation (no dedicated skill)

## Implementation plan

### Step 1 — Extend surface prop types in `src/features/tasks/surfaces.ts`

Add a `prefill` field to each of the three affected types.

```ts
export type TaskScheduledDateSurfaceProps = {
  taskId: string;
  prefill?: {
    ready_by_at: string | null;
    scheduled_start_at: string | null;
    scheduled_end_at: string | null;
  };
};

export type ItemQuantitySurfaceProps = {
  taskId: string;
  itemId: string;
  prefill?: { quantity: number };
};

export type ItemUpholsteryAmountSurfaceProps = {
  taskId: string;
  itemUpholsteryId: string;
  prefill?: { amountMeters: number | null };
};
```

### Step 2 — Fix `src/features/tasks/actions/use-update-task.ts`

Add `onMutate` (snapshot `taskKeys.detail(id)`, apply optimistic patch) and `onError` (restore snapshot). The optimistic patch spreads the input fields (minus `id`) onto `TaskDetailRaw.task`.

```ts
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,

    onMutate: async (input) => {
      const { id, ...changes } = input;
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(id));

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(id), (old) => {
        if (!old) return old;
        return { ...old, task: { ...old.task, ...changes } };
      });

      return { snapshot, id };
    },

    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(context.id), context.snapshot);
      }
    },

    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(input.id) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

Note: `taskKeys.detail(id)` requires `id` typed as `TaskId`. The existing `id as never` cast in the pages is already present; use the same pattern here, or adjust to match the current cast convention in the file.

### Step 3 — Fix `src/features/items/actions/use-update-item.ts`

Add `onMutate` optimistic snapshot on `taskKeys.detail(taskId)` updating `old.item` with the changed fields, and `onError` rollback.

```ts
export function useUpdateItem(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItem,

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never));

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old || !old.item) return old;
        const { id: _id, ...changes } = input;
        return { ...old, item: { ...old.item, ...changes } };
      });

      return { snapshot };
    },

    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(taskId as never), context.snapshot);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

### Step 4 — Fix `src/features/items/actions/use-set-upholstery-quantity.ts`

Add `onMutate` optimistic snapshot on `taskKeys.detail(taskId)` updating the matching entry in `old.item_upholstery`, `onError` rollback, and add `taskKeys.lists()` to `onSettled`.

```ts
export function useSetUpholsteryQuantity(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setItemUpholsteryQuantity,

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never));

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old) return old;
        return {
          ...old,
          item_upholstery: old.item_upholstery.map((entry) =>
            entry.client_id === input.itemUpholsteryId
              ? { ...entry, amount_meters: input.amount_meters }
              : entry,
          ),
        };
      });

      return { snapshot };
    },

    onError: (_err, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(taskId as never), context.snapshot);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

Note: `useSetUpholsteryQuantity` lives in `src/features/items/actions/` but uses `taskKeys` (imported from `@/features/tasks/api/task-keys`). Also import `TaskDetailRaw` from `@/features/tasks/types`.

### Step 5 — Fix `src/pages/tasks/TaskScheduledDateSheetPage.tsx`

Replace the `onSuccess: () => surface.closeTop()` pattern with:
1. Read `prefill` from `useSurfaceProps<TaskScheduledDateSurfaceProps>()`
2. Seed `useForm` defaults from `prefill` if present, otherwise from query data (existing `hasResetRef` logic stays for query-data seeding)
3. In `handleSave`: capture the form values snapshot, call `header?.requestClose()` immediately (optimistic close), then fire `updateTask.mutate()` with `onError` to re-open the sheet with prefill
4. Remove `useSurface` import (no longer needed)

```ts
const { taskId, prefill } = useSurfaceProps<TaskScheduledDateSurfaceProps>();

const form = useForm<ScheduleForm>({
  defaultValues: prefill ?? {
    ready_by_at: null,
    scheduled_start_at: null,
    scheduled_end_at: null,
  },
});

// Existing hasResetRef logic seeds from query data, but only once and only when no prefill:
useEffect(() => {
  if (taskQuery.isPending || hasResetRef.current || prefill) return;
  hasResetRef.current = true;
  form.reset({
    ready_by_at: formatLocalDateISO(task?.ready_by_at ?? null),
    scheduled_start_at: formatLocalDateISO(task?.scheduled_start_at ?? null),
    scheduled_end_at: formatLocalDateISO(task?.scheduled_end_at ?? null),
  });
}, [form, prefill, task, taskQuery.isPending]);

function handleSave(values: ScheduleForm) {
  if (!task) return;

  const input = {
    id: (taskId ?? '') as never,
    title: task.title ?? null,
    summary: task.summary ?? null,
    priority: task.priority,
    ready_by_at: values.ready_by_at as never,
    scheduled_start_at: values.scheduled_start_at as never,
    scheduled_end_at: values.scheduled_end_at as never,
    return_method: task.return_method ?? undefined,
    fulfillment_method: task.fulfillment_method ?? undefined,
    return_source: task.return_source ?? undefined,
    item_location: task.item_location ?? undefined,
    customer_id: task.customer_id ?? undefined,
    primary_phone_number: task.primary_phone_number ?? undefined,
    secondary_phone_number: task.secondary_phone_number ?? undefined,
    primary_email: task.primary_email ?? undefined,
    secondary_email: task.secondary_email ?? undefined,
    address: task.address ?? null,
    additional_details: task.additional_details ?? null,
  };

  // Optimistic close — fire animation immediately, don't wait for API
  header?.requestClose();

  updateTask.mutate(input, {
    onError: () => {
      useSurfaceStore.getState().open(TASK_SCHEDULED_DATE_SHEET_SURFACE_ID, {
        taskId,
        prefill: values,
      } satisfies TaskScheduledDateSurfaceProps);
    },
  });
}
```

Remove the `useSurface` hook call and its import. Import `useSurfaceStore` from `@/providers/SurfaceProvider` and `TASK_SCHEDULED_DATE_SHEET_SURFACE_ID` + `TaskScheduledDateSurfaceProps` from `@/features/tasks/surfaces`.

### Step 6 — Fix `src/pages/tasks/ItemQuantitySheetPage.tsx`

Same pattern:

1. Read `prefill` from `useSurfaceProps<ItemQuantitySurfaceProps>()`
2. Initialize `quantity` state from `prefill?.quantity` if present; otherwise use query data (existing `useEffect` sync stays but skips when prefill is present)
3. On Save: call `header?.requestClose()` immediately, then `updateItem.mutate(...)` with `onError` re-opening the sheet with `prefill: { quantity }`
4. Remove `useSurface` import

```ts
const { taskId, itemId, prefill } = useSurfaceProps<ItemQuantitySurfaceProps>();
const [quantity, setQuantity] = useState(prefill?.quantity ?? item?.quantity ?? 0);

// Only sync from query when there was no prefill
useEffect(() => {
  if (prefill !== undefined) return;
  setQuantity(item?.quantity ?? 0);
}, [item?.quantity, prefill]);

// In the save button onClick:
header?.requestClose();
updateItem.mutate(
  { id: itemId as never, quantity },
  {
    onError: () => {
      useSurfaceStore.getState().open(ITEM_QUANTITY_SHEET_SURFACE_ID, {
        taskId,
        itemId,
        prefill: { quantity },
      } satisfies ItemQuantitySurfaceProps);
    },
  },
);
```

### Step 7 — Fix `src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx`

Same pattern:

1. Read `prefill` from `useSurfaceProps<ItemUpholsteryAmountSurfaceProps>()`
2. Initialize `amountMeters` state: prefer `prefill?.amountMeters` if present, otherwise `resolvedAmount`
3. Add `prefill` guard to the `useEffect` that syncs `amountMeters` from query data
4. On Save: call `header?.requestClose()` immediately, then `setUpholsteryQuantity.mutate(...)` with `onError` re-opening with `prefill: { amountMeters }`
5. Remove `useSurface` import

```ts
const { taskId, itemUpholsteryId, prefill } = useSurfaceProps<ItemUpholsteryAmountSurfaceProps>();
const [amountMeters, setAmountMeters] = useState<number | null>(
  prefill !== undefined ? prefill.amountMeters : resolvedAmount,
);

// Only sync from query when there was no prefill
useEffect(() => {
  if (prefill !== undefined) return;
  setAmountMeters(upholstery?.activeRequirement?.amount_meters ?? upholstery?.amount_meters ?? null);
}, [prefill, upholstery?.activeRequirement?.amount_meters, upholstery?.amount_meters]);

// In the save button onClick:
header?.requestClose();
setUpholsteryQuantity.mutate(
  { itemUpholsteryId: upholstery.client_id, amount_meters: amountMeters ?? 0 },
  {
    onError: () => {
      useSurfaceStore.getState().open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
        taskId,
        itemUpholsteryId,
        prefill: { amountMeters },
      } satisfies ItemUpholsteryAmountSurfaceProps);
    },
  },
);
```

## Risks and mitigations

- Risk: `requestClose()` starts the 350ms animation, but a very fast network error (< 350ms, e.g. offline-mode instant rejection) triggers `onError` while the surface is still in the stack. `open()` detects it as already-open and updates props in-place; after 350ms the animation completes and the surface is removed. The user sees a re-open but the prefill data is correct.
  Mitigation: This is an acceptable edge case for rare fast failures (offline). No additional handling needed.

- Risk: `header` may be `null` if the page renders outside a `BottomSheetSurface` (direct URL navigation fallback). `header?.requestClose()` is already guarded with optional chaining so it's a no-op; the mutation still fires. The sheet would not close at all in this case, but sheets of these types are never opened via URL.
  Mitigation: No action needed.

- Risk: `useSetUpholsteryQuantity` imports `taskKeys` and `TaskDetailRaw` from the tasks feature. This crosses feature boundaries in the actions layer.
  Mitigation: This import already exists in the current file (`taskKeys` is already there). Adding `TaskDetailRaw` follows the same existing pattern.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test -- --grep "TaskScheduledDate|ItemQuantity|ItemUpholstery"`: all existing tests pass
- Manual: open Task Detail → tap scheduled date field → sheet opens → tap Save → sheet animates closed immediately without waiting → task detail reflects updated date
- Manual: open Task Detail → tap item quantity field → sheet opens → tap Save → sheet animates closed → detail updates
- Manual: simulate offline → tap Save → sheet closes → re-opens with original value preserved

## Review log

- `2026-05-25` Claude: authored

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: user
