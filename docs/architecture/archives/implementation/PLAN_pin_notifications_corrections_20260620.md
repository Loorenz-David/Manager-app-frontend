# PLAN_pin_notifications_corrections_20260620

## Metadata

- Plan ID: `PLAN_pin_notifications_corrections_20260620`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-06-20T00:00:00Z`
- Last updated at (UTC): `2026-06-20T16:02:41Z`
- Related issue/ticket: `—`
- Intention plan: `—` (correction plan — no intention doc needed)
- Parent plan: `docs/architecture/archives/implementation/PLAN_pin_notifications_20260620.md`

## Goal and intent

- Goal: Correct the bugs, contract drifts, and gaps found in the review of the `PLAN_pin_notifications_20260620` implementation. No new feature work — only fixes and removals.
- Business/user intent: The task-step picker currently fails at runtime for all users. Two additional issues produce incorrect UI text and missing rollback on save errors. Remaining items are dead code and missing preload calls.
- Non-goals:
  - Implementing pagination for the task-steps-by-task query (out of scope — 50-step default is sufficient).
  - Adding new entity types or pin states.
  - Writing the Playwright tests deferred by the original implementation (separate plan required).

## Scope

- In scope: All 9 issues listed in the review. Ordered by risk below.
- Out of scope: Playwright test spec (tracked separately).
- Assumptions:
  - `npm run typecheck` is the quality gate for this correction pass (matching the original pass).
  - Removing `toPinViewModel`, `NotificationPinViewModel`, `PinFormConfig`, etc. from `@beyo/notifications` index is safe because these exports have zero consumers (confirmed by review).

## Clarifications required

_(none — all fixes are deterministic from the review and existing code)_

## Acceptance criteria

1. `npm run typecheck` passes across all packages and both apps.
2. Both apps' task-step pickers render the step list (no longer fail with Zod parse error).
3. Workers `PinTaskStepStatesSheetPage` no longer shows the raw variant token in the "Current:" label.
4. `use-save-pins` mutation has `onMutate` (snapshot + cancel) and `onError` (rollback) following `08_hooks.md`.
5. `packages/notifications/src/pins/pin-form-config.ts` deleted; `toPinViewModel` + `NotificationPinViewModel` removed from `pin-types.ts` and the index.
6. `preloadPinNotificationsSlideSurface()` is called when the task-step actions sheet (workers) and task detail menu sheet (managers) are opened.
7. Managers controller returns `pins` in its result, matching the workers shape.
8. `StepStateSchema` import and dead `TaskStepForPinState` type alias removed from `list-task-steps-by-task.ts`.
9. Managers `use-tasks-view.controller.ts` `openTaskActions` passes `itemId` so the upholstery container is populated from the task-list path too.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: query shape + `ApiEnvelopeSchema` pattern — for fixing the response schema.
- `architecture/08_hooks.md`: optimistic update + rollback pattern — for fixing `use-save-pins`.
- `architecture/30_dynamic_loading.md` (+`_local`): `usePreloadSurface` / preload call placement.
- `architecture/04_api_client.md` (+`_local`): `apiClient.get` contract (`envelope.data` maps to `body.data`).

### File read intent — pattern vs. relational

All fixes are relational reads (understanding what the existing code does) — no pattern reads needed.

---

## Implementation plan

### Fix 1 (CRITICAL) — `list-task-steps-by-task.ts`: response schema mismatch

**File:** `packages/tasks/src/api/list-task-steps-by-task.ts`

The backend returns `{ "data": { "steps_pagination": { "items": [...], "has_more": bool, "limit": int, "offset": int } } }`.
`ApiEnvelopeSchema` maps `body.data` → `envelope.data`, so `envelope.data` = `{ steps_pagination: { ... } }`.
The current schema expects a flat `{ items: [...] }` which causes a required-field Zod error on every call.

Changes:
1. Remove the unused `StepStateSchema` import (also covers Fix 8 below).
2. Remove the dead local type `export type TaskStepForPinState`.
3. Replace the `ListTaskStepsByTaskResponseSchema` with the correct nested shape:

```ts
// BEFORE
const ListTaskStepsByTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    items: z.array(TaskStepForPinSchema),
  }),
).extend({ ok: z.literal(true) });

// AFTER
const ListTaskStepsByTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    steps_pagination: z.object({
      items: z.array(TaskStepForPinSchema),
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });
```

4. Update the access path:

```ts
// BEFORE
return envelope.data.items;

// AFTER
return envelope.data.steps_pagination.items;
```

Note: `has_more` / pagination UI is not implemented in this pass — the default limit (50) is sufficient for the pin picker. The schema field is included for correctness; the returned array is still just the items.

---

### Fix 2 (HIGH) — `use-save-pins.ts`: add optimistic update + rollback

**File:** `packages/notifications/src/actions/use-save-pins.ts`

The `useMutation` currently has only `onSettled`. Per `08_hooks.md` the action hook must cancel in-flight queries, snapshot previous data, apply optimistic state (or at minimum lock the UI), and restore on error.

For a diff-based batch save the optimistic shape is: replace the cached `pins` list with the desired selections, then rollback to the snapshot on any failure.

Add `onMutate` and `onError`:

```ts
onMutate: async (input) => {
  await queryClient.cancelQueries({
    queryKey: pinKeys.byMajor(input.major_client_entity_id),
  });
  const previousPins = queryClient.getQueryData(
    pinKeys.byMajor(input.major_client_entity_id),
  );
  return { previousPins };
},
onError: (_error, input, context) => {
  if (context?.previousPins !== undefined) {
    queryClient.setQueryData(
      pinKeys.byMajor(input.major_client_entity_id),
      context.previousPins,
    );
  }
},
// keep onSettled as-is (invalidate on both success and error to sync server truth)
```

The mutation context type must be inferred correctly — `useMutation` generic should be `useMutation<..., ..., SavePinsInput, { previousPins: unknown }>`.

---

### Fix 3 (HIGH) — Workers `PinTaskStepStatesSheetPage`: remove raw variant token from label

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/PinTaskStepStatesSheetPage.tsx` line 53

Remove the `({STEP_STATE_VARIANT[currentState]})` fragment — it renders the internal variant name (e.g. `"warning"`) as user-visible text. Keep only `humanizeStepState(currentState)`.

```tsx
// BEFORE
<p className="text-xs text-muted-foreground">
  Current: {humanizeStepState(currentState)} (
  {STEP_STATE_VARIANT[currentState]})
</p>

// AFTER
<p className="text-xs text-muted-foreground">
  Current: {humanizeStepState(currentState)}
</p>
```

Also remove the now-unused `STEP_STATE_VARIANT` import if it is no longer used elsewhere in this file.

---

### Fix 4 (MEDIUM) — Delete `pin-form-config.ts` and its public exports

**Files:**
- Delete: `packages/notifications/src/pins/pin-form-config.ts`
- Edit: `packages/notifications/src/index.ts` — remove the three lines exporting `PinEntityConfig`, `PinFormConfig`, `PinStateOption`.

The file defines a shared config descriptor that neither app consumes. Apps use their own hardcoded state arrays in their controllers. Dead public API in a shared package.

---

### Fix 5 (MEDIUM) — Remove `toPinViewModel` and `NotificationPinViewModel` from `pin-types.ts` and index

**Files:**
- `packages/notifications/src/pins/pin-types.ts`: remove the `NotificationPinViewModel` type alias and the `toPinViewModel` function (lines 138–177).
- `packages/notifications/src/index.ts`: remove `toPinViewModel` from function exports and `NotificationPinViewModel` from type exports.

Neither is called anywhere — both apps call `parseConditionsToStates` directly in `buildInitialSelections`. These are zero-consumer exports from a shared package.

---

### Fix 6 (MEDIUM) — Add `preloadPinNotificationsSlideSurface` calls

Per `30_dynamic_loading_local.md`, surfaces should be preloaded when the parent surface that contains the trigger is opened, so the lazy bundle is already loaded by the time the user taps the button.

**Workers** — `apps/workers-app/.../features/task_steps/controllers/use-working-section-steps.controller.ts`

In `handleOpenTaskActions` (the callback that opens `TASK_STEP_ACTIONS_SHEET_SURFACE_ID`), add a preload call before `openSurface`:

```ts
// at the top of the file, import:
import { preloadPinNotificationsSlideSurface } from "../surfaces";

// inside handleOpenTaskActions:
const handleOpenTaskActions = useCallback(
  (stepId: TaskStepId, taskId: TaskId, itemId: string | null) => {
    preloadPinNotificationsSlideSurface();          // add this line
    openSurface(TASK_STEP_ACTIONS_SHEET_SURFACE_ID, {
      stepId,
      taskId,
      itemId,
    } as TaskStepActionsSheetSurfaceProps);
  },
  [openSurface],
);
```

**Managers** — `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts`

In `openMenu()` (the function that opens `TASK_ACTIONS_SHEET_SURFACE_ID` from the task detail), add a preload call:

```ts
// at the top, import:
import { preloadPinNotificationsSlideSurface } from "../surfaces";

// in openMenu:
openMenu: () => {
  preloadPinNotificationsSlideSurface();          // add this line
  surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
},
```

---

### Fix 7 (MINOR) — Managers controller: add `pins` to returned shape

**File:** `apps/managers-app/.../features/tasks/controllers/use-pin-notifications.controller.ts`

Add `pins: pinsQuery.data?.pins ?? []` to the return object to match the workers controller shape:

```ts
return {
  taskId,
  itemId,
  pins: pinsQuery.data?.pins ?? [],   // add this line
  isHydrating: pinsQuery.isLoading,
  ...
};
```

---

### Fix 8 (MINOR) — `list-task-steps-by-task.ts`: dead import + type alias

Handled as part of Fix 1 above (removing `StepStateSchema` import and the `TaskStepForPinState` type alias in the same edit).

---

### Fix 9 (MINOR) — Managers `use-tasks-view.controller.ts`: `openTaskActions` missing `itemId`

**File:** `apps/managers-app/.../features/tasks/controllers/use-tasks-view.controller.ts`

`openTaskActions(taskId)` opens the task actions sheet without `itemId`. This means the upholstery container in the pin form will show "No upholstery entry" when the sheet is opened from the task list, even when the task has an item.

The controller needs access to the item id for the task. Check what data is available at the call site — if `itemId` is not available in `use-tasks-view.controller.ts`, change the function signature to accept it and update every call site that invokes `openTaskActions`:

```ts
// BEFORE
function openTaskActions(taskId: string): void {
  useSurfaceStore.getState().open(TASK_ACTIONS_SHEET_SURFACE_ID, {
    taskId,
  } satisfies TaskActionsSurfaceProps);
}

// AFTER
function openTaskActions(taskId: string, itemId: string | null): void {
  useSurfaceStore.getState().open(TASK_ACTIONS_SHEET_SURFACE_ID, {
    taskId,
    itemId,
  } satisfies TaskActionsSurfaceProps);
}
```

Update all call sites that invoke `openTaskActions` to pass `itemId`. If `itemId` is not available at those call sites, this fix requires reading the task data at the call site — investigate and resolve accordingly before coding.

---

## Build order

Execute fixes in this order to minimise cascading type errors:

1. Fix 1 + Fix 8 (schema + dead import — `@beyo/tasks` only, isolated)
2. Fix 4 + Fix 5 (delete dead exports — `@beyo/notifications` only, isolated)
3. Fix 3 (single-line JSX change — isolated)
4. Fix 7 (controller shape — isolated)
5. Fix 9 (controller + call-site change — check call sites first)
6. Fix 2 (action hook mutation — depends on nothing changed above)
7. Fix 6 (preload calls — import from surfaces, add one line each file)
8. `npm run typecheck` — full pass

## Risks and mitigations

- Risk: ~~Fix 1 uncovers that the backend actually does NOT wrap in `steps_pagination`~~ — CONFIRMED by david (2026-06-20): backend returns `{ steps_pagination: { items: [...], limit, offset, has_more } }`. Fix 1 is correct; do not revert.

- Risk: Fix 4 / Fix 5 break a consumer added after the review snapshot.
  Mitigation: Run `grep -r "PinFormConfig\|toPinViewModel\|NotificationPinViewModel" apps packages` before deleting to confirm zero consumers.

- Risk: Fix 9 call sites for `openTaskActions` don't have `itemId` available in scope.
  Mitigation: Investigate the call site data before coding. If `itemId` is genuinely unavailable (task-list context only has `taskId`), document the gap and leave `itemId: null` explicitly rather than silently missing.

- Risk: Fix 2 generic typing for `useMutation` context causes TypeScript errors.
  Mitigation: Type the mutation explicitly: `useMutation<void, Error, SavePinsInput, { previousPins: ListPinsResponse | undefined }>`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all packages and both apps.
- Manual smoke: open pin notifications from a task step (workers) → step list renders → select states → submit → reopen → selections hydrated.
- Manual smoke: open pin notifications from task detail menu (managers) → same flow.

## Review log

- `2026-06-20` `claude`: Authored from code review findings. No clarifications required from david.
- `2026-06-20` `david`: Confirmed backend response shape — `steps_pagination` wrapper is correct. Fix 1 stands as written.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
