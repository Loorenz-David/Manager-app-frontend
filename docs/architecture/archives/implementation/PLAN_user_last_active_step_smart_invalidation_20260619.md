# PLAN_user_last_active_step_smart_invalidation_20260619

## Metadata

- Plan ID: `PLAN_user_last_active_step_smart_invalidation_20260619`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T19:05:50Z`
- Related issue/ticket: `-`
- Intention plan: `-`

## Goal and intent

- Goal: Replace the broad `invalidateQueries` calls on `taskStepKeys.userLastActive()` with targeted, client-id-matched logic so the active-step card on the workers home screen reacts precisely to the events that affect it — and also add `task:step-state-changed` to the array wire-format change that `PLAN_task_step_events_array_and_home_invalidation_20260619` missed.
- Business/user intent: The `userLastActive` endpoint returns rich server data (timing, user snapshots, `first_started_at`) that cannot be derived from the event payload alone. Refetching on every step or state event — regardless of whether it targets the displayed step — generates unnecessary network traffic and can cause flicker. The corrected logic gates each action behind a client_id scan, clears the cache immediately for terminal/deleted steps (no refetch needed since the server would return null anyway), and refetches only when the displayed step or its parent task was actually touched.
- Non-goals: Changing the handler for `task:step-assigned`. Changing manager-app handlers (the last-active endpoint is workers-app-only). Adding optimistic state updates to the active-step card. Handling `task:step-created` against userLastActive (a new step cannot match an already-displayed one).

## Scope

- In scope:
  - `packages/realtime/src/lib/socket-types.ts` — change `task:step-state-changed` payload from single object to array (wire format parity with the other step events)
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`:
    - Replace `task:step-state-changed` handler: array payload, smart client_id match, refetch-or-clear branch
    - Extend `task:step-deleted` handler: add smart client_id match → clear cache if the deleted step is the active step
    - Add `task:updated` handler: check task.client_id in active step → refetch if matched
    - Add `task:state-changed` handler: same as `task:updated`
- Out of scope:
  - Changes to `task:step-assigned` (single-object, no match needed — broad invalidation remains correct there)
  - Manager app socket events (this endpoint does not exist for managers)
  - `taskStepKeys.sectionLists()` or `workerWorkingSectionKeys.mine()` invalidation logic (already handled by the prerequisite plan)

- Assumptions:
  - `PLAN_task_step_events_array_and_home_invalidation_20260619` has already been applied: `task:step-created` and `task:step-deleted` are array handlers, `task:step-state-changed` has `workerWorkingSectionKeys.mine()` invalidation, and `socket-types.ts` already has `task:step-created` / `task:step-deleted` / `task:updated` / `task:state-changed` as array types.
  - `task:step-state-changed` was NOT included in that prior wire-format change and is still typed as a single object — this plan corrects that.
  - `queryClient.getQueryData<TaskStep | null>(taskStepKeys.userLastActive())` returns `undefined` when the cache is cold and `null` when the server returned null. Both falsy values mean "no active step" and the handler should do nothing.
  - The set of terminal states that cause a clear-to-null is exactly `STEP_TERMINAL_STATES` already defined in `types.ts`: `completed`, `skipped`, `failed`, `cancelled`.

## Clarifications required

_(none — all information available from source files)_

## Acceptance criteria

1. TypeScript compiles without errors (`npm run typecheck` exits 0).
2. `task:step-state-changed` is typed as `Array<{ client_id: string; new_state: string }>` in `socket-types.ts`.
3. When the backend emits `task:step-state-changed` with an item matching the displayed active step and `new_state` is non-terminal → the active-step card re-fetches automatically (no pull-to-refresh needed).
4. When `task:step-state-changed` arrives with `new_state` being terminal for the matching step → the active-step card disappears immediately without a network round-trip.
5. When `task:step-deleted` arrives and one payload item matches the displayed active step → the active-step card disappears immediately.
6. When `task:updated` or `task:state-changed` arrives with a `client_id` matching `activeStep.task.client_id` → the active-step card re-fetches (task snapshot embedded in the response becomes stale).
7. When none of the above events contain a matching `client_id` → no `userLastActive` query action is taken (no wasted refetch).

## Contracts and skills

### Contracts loaded

- No formal architecture contracts govern socket-event handlers; pattern is established by the existing `socket-events.ts` files.

### File read intent — pattern vs. relational

Permitted relational reads used to write this plan:
- `task_steps/socket-events.ts` (workers) — current handler shapes to extend
- `task_steps/api/task-step-keys.ts` — `userLastActive()` key factory
- `task_steps/api/use-user-last-active-step.ts` — confirms `TaskStep | null` generic
- `task_steps/types.ts` — `STEP_TERMINAL_STATES`, `TaskStep`, `StepState` (types used in the matching logic)
- `socket-types.ts` — current `task:step-state-changed` type to update

### Skill selection

- Primary skill: none — surgical edits to two files
- Excluded alternatives: n/a

## Implementation plan

### Step 1 — Update `socket-types.ts`

**File:** `packages/realtime/src/lib/socket-types.ts`

Change `task:step-state-changed` from single object to array (missed in the previous plan):

```ts
// Before
"task:step-state-changed": (payload: {
  client_id: string;
  new_state: string;
}) => void;

// After
"task:step-state-changed": (payload: Array<{
  client_id: string;
  new_state: string;
}>) => void;
```

All other event signatures remain unchanged.

---

### Step 2 — Update workers app `task_steps/socket-events.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`

**2a. Add imports**

At the top of the file, add the type imports needed for the cache-read pattern:

```ts
import { STEP_TERMINAL_STATES, type StepState, type TaskStep } from "./types";
```

(`workerWorkingSectionKeys` import was already added by the prerequisite plan.)

---

**2b. Replace `task:step-state-changed` handler**

Current (after prerequisite plan — single-object payload, broad invalidation):
```ts
"task:step-state-changed": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionLists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.userLastActive(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: workerWorkingSectionKeys.mine(),
    refetchType: "active",
  });
},
```

Replacement (array payload, smart userLastActive logic, section list and home invalidation preserved):
```ts
"task:step-state-changed": (payloads, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionLists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: workerWorkingSectionKeys.mine(),
    refetchType: "active",
  });

  const activeStep = queryClient.getQueryData<TaskStep | null>(
    taskStepKeys.userLastActive(),
  );
  if (activeStep) {
    const match = payloads.find((p) => p.client_id === activeStep.client_id);
    if (match) {
      if (STEP_TERMINAL_STATES.has(match.new_state as StepState)) {
        queryClient.setQueryData(taskStepKeys.userLastActive(), null);
      } else {
        queryClient.invalidateQueries({
          queryKey: taskStepKeys.userLastActive(),
          refetchType: "active",
        });
      }
    }
  }
},
```

Key points:
- The broad `userLastActive()` invalidation is removed — it is replaced by the conditional block.
- `sectionLists()` and `workerWorkingSectionKeys.mine()` invalidation are preserved (no change from prerequisite plan).
- `getQueryData` returns `undefined` when cold, `null` when server returned null — both are falsy, so the `if (activeStep)` guard handles both correctly.

---

**2c. Extend `task:step-deleted` handler**

Current (after prerequisite plan — array, section + home invalidation):
```ts
"task:step-deleted": (payloads, { queryClient }) => {
  const sectionIds = [...new Set(payloads.map((p) => p.working_section_id))];
  for (const id of sectionIds) {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionListsBySection(id as WorkingSectionId),
      refetchType: "active",
    });
  }
  queryClient.invalidateQueries({
    queryKey: workerWorkingSectionKeys.mine(),
    refetchType: "active",
  });
},
```

Replacement (same as above + cache-clear if active step was deleted):
```ts
"task:step-deleted": (payloads, { queryClient }) => {
  const sectionIds = [...new Set(payloads.map((p) => p.working_section_id))];
  for (const id of sectionIds) {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.sectionListsBySection(id as WorkingSectionId),
      refetchType: "active",
    });
  }
  queryClient.invalidateQueries({
    queryKey: workerWorkingSectionKeys.mine(),
    refetchType: "active",
  });

  const activeStep = queryClient.getQueryData<TaskStep | null>(
    taskStepKeys.userLastActive(),
  );
  if (activeStep && payloads.some((p) => p.client_id === activeStep.client_id)) {
    queryClient.setQueryData(taskStepKeys.userLastActive(), null);
  }
},
```

---

**2d. Add `task:updated` handler**

This is a new handler in the workers app (does not exist today). Position it after `task:step-deleted`:

```ts
"task:updated": (payloads, { queryClient }) => {
  const activeStep = queryClient.getQueryData<TaskStep | null>(
    taskStepKeys.userLastActive(),
  );
  if (
    activeStep &&
    payloads.some((p) => p.client_id === activeStep.task.client_id)
  ) {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.userLastActive(),
      refetchType: "active",
    });
  }
},
```

---

**2e. Add `task:state-changed` handler**

New handler, same logic as `task:updated` (the task state is embedded in the active-step response and becomes stale when the task changes state):

```ts
"task:state-changed": (payloads, { queryClient }) => {
  const activeStep = queryClient.getQueryData<TaskStep | null>(
    taskStepKeys.userLastActive(),
  );
  if (
    activeStep &&
    payloads.some((p) => p.client_id === activeStep.task.client_id)
  ) {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.userLastActive(),
      refetchType: "active",
    });
  }
},
```

---

### Step 3 — Typecheck

Run `npm run typecheck` from the monorepo root. The `task:step-state-changed` handler signature must satisfy the updated array type from Step 1. The two new handlers (`task:updated`, `task:state-changed`) must satisfy the array types already set by the prerequisite plan.

## Risks and mitigations

- Risk: `getQueryData` returns `undefined` (cold cache) when the user has not yet loaded the home screen. The `if (activeStep)` guard handles this — `undefined` is falsy, so no action is taken. Correct behavior.
  Mitigation: already covered by the guard pattern.

- Risk: If `task:step-state-changed` is still emitting single objects during a backend partial rollout, the handler will receive `[object]` instead of an array and the `payloads.find(...)` call will iterate over the characters of the string — silently producing no match. The cache will not be cleared.
  Mitigation: Coordinate backend deploy timing. The type change makes the mismatch visible at TypeScript compile time if the backend type stubs are kept in sync.

- Risk: `task:step-state-changed` previously always invalidated `userLastActive()`. After this change, it only does so when the client_id matches. If another worker's step change affects the current user's active step indirectly (rare edge case), the active step card could be stale until the next manual refresh.
  Mitigation: The described cases in the spec (state-changed, deleted, task-updated) cover all direct-affect paths. Indirect affects (e.g. dependency resolution) are not in scope.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test: open workers home screen with an active step card visible. From the manager app, change the step state to `paused` → card re-fetches and shows paused state without pull-to-refresh.
- Manual smoke test: from manager app, complete the step → active step card disappears immediately.
- Manual smoke test: from manager app, delete the step → active step card disappears immediately.
- Manual smoke test: from manager app, update the task (e.g. change priority) → active step card re-fetches and shows updated task snapshot.
- Manual smoke test: from manager app, change a DIFFERENT step's state → active step card does not flicker or refetch.

## Review log

_(empty)_

## Lifecycle transition

- Current state: `archived`
- Next state: `-`
- Transition owner: `Codex`
