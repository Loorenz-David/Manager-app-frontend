# PLAN_task_step_events_array_and_home_invalidation_20260619

## Metadata

- Plan ID: `PLAN_task_step_events_array_and_home_invalidation_20260619`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T18:54:07Z`
- Related issue/ticket: `-`
- Intention plan: `-`

## Goal and intent

- Goal: Update four task-step socket events to consume array payloads (wire format change) and add the missing `workerWorkingSectionKeys.mine()` invalidation so section-card step counts refresh in real time.
- Business/user intent: The backend now batches step mutations and emits a single event carrying an array instead of N individual events. The workers app home screen (section cards) shows live step counts but currently does not re-fetch when steps are created, deleted, or change state, leaving stale counts visible until a manual pull-to-refresh.
- Non-goals: Changing the event routing layer (`RealtimeProvider`), modifying backend event shapes, adding optimistic UI for count updates, handling any event not in the four named below.

## Scope

- In scope:
  - `packages/realtime/src/lib/socket-types.ts` — update `ServerToClientEvents` payload types for four events to arrays
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts` — update handlers to iterate array payloads; add `workerWorkingSectionKeys.mine()` invalidation
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts` — update handlers to iterate array payloads
- Out of scope:
  - `task:step-assigned` and `task:step-state-changed` wire format (backend has NOT changed these to arrays)
  - Manager app working-section invalidation (no section-card count UI exists there)
  - Any event not in the four listed below

- Assumptions:
  - The four events whose wire format changed are exactly: `task:updated`, `task:step-deleted`, `task:state-changed`, `task:step-created`
  - `task:step-state-changed` and `task:step-assigned` remain single-object payloads
  - `workerWorkingSectionKeys.mine()` is the sole query that drives the home-screen section card counts; no other query needs to be invalidated for the card counts

## Clarifications required

_(none — all information available from source files)_

## Acceptance criteria

1. TypeScript compiles without errors after the type changes (`npm run typecheck` exits 0).
2. When a step is created in a section the worker is watching, the section card on the home screen updates its pending/active count without a manual pull-to-refresh.
3. When a step is deleted, the section card count decreases without a manual pull-to-refresh.
4. When a task state changes, the managers app task list and task detail re-fetch without duplicate invalidations.
5. When a batch of steps is created (array length > 1), only one `workerWorkingSectionKeys.mine()` invalidation is issued (deduplicated section IDs in the loop, single invalidation call after the loop).
6. `task:step-state-changed` also triggers `workerWorkingSectionKeys.mine()` invalidation (counts shift when a step moves between states; this handler stays single-object since the backend did not change its wire format).

## Contracts and skills

### Contracts loaded

- No formal architecture contracts govern socket-event handlers; the pattern is established by the existing `socket-events.ts` files.

### File read intent — pattern vs. relational

Permitted relational reads used to write this plan:
- `socket-types.ts` — exact current payload types to update
- `task_steps/socket-events.ts` (workers) — current invalidation logic to extend
- `tasks/socket-events.ts` (managers) — current invalidation logic to extend
- `task-step-keys.ts` and `working-section-keys.ts` — exact query key factories
- `working_sections/types.ts` — confirm `workerWorkingSectionKeys.mine()` drives card counts

### Skill selection

- Primary skill: none — pure surgical edits to three files
- Excluded alternatives: n/a

## Implementation plan

### Step 1 — Update `socket-types.ts`

**File:** `packages/realtime/src/lib/socket-types.ts`

Change the payload signatures for the four affected events from single objects to arrays:

```ts
// Before
"task:updated": (payload: { client_id: string }) => void;
"task:state-changed": (payload: { client_id: string; new_state: string }) => void;
"task:step-created": (payload: { client_id: string; working_section_id: string }) => void;
"task:step-deleted": (payload: { client_id: string; working_section_id: string }) => void;

// After
"task:updated": (payload: Array<{ client_id: string }>) => void;
"task:state-changed": (payload: Array<{ client_id: string; new_state: string }>) => void;
"task:step-created": (payload: Array<{ client_id: string; working_section_id: string }>) => void;
"task:step-deleted": (payload: Array<{ client_id: string; working_section_id: string }>) => void;
```

All other event signatures remain unchanged.

---

### Step 2 — Update workers app `task_steps/socket-events.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`

**2a. Add import for `workerWorkingSectionKeys`**

```ts
import { workerWorkingSectionKeys } from "@/features/working_sections/api/working-section-keys";
```

**2b. Replace `task:step-created` handler**

Current (single-object, no home invalidation):
```ts
"task:step-created": ({ working_section_id }, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionListsBySection(working_section_id as WorkingSectionId),
    refetchType: "active",
  });
},
```

Replacement (array, deduped section IDs, adds home invalidation):
```ts
"task:step-created": (payloads, { queryClient }) => {
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

**2c. Replace `task:step-deleted` handler**

Current (single-object, no home invalidation):
```ts
"task:step-deleted": ({ working_section_id }, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionListsBySection(working_section_id as WorkingSectionId),
    refetchType: "active",
  });
},
```

Replacement (array, deduped section IDs, adds home invalidation):
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

**2d. Extend `task:step-state-changed` handler** (wire format unchanged — single object, but missing home invalidation)

Add one invalidation call at the end:
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
  queryClient.invalidateQueries({                          // ← add
    queryKey: workerWorkingSectionKeys.mine(),             // ← add
    refetchType: "active",                                 // ← add
  });                                                      // ← add
},
```

---

### Step 3 — Update managers app `tasks/socket-events.ts`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`

**3a. Replace `task:updated` handler**

Current (single-object destructure):
```ts
"task:updated": ({ client_id }, { queryClient }) => {
  const taskId = client_id as TaskId;
  queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId), refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "active" });
},
```

Replacement (array, per-item detail invalidation, one list invalidation):
```ts
"task:updated": (payloads, { queryClient }) => {
  for (const { client_id } of payloads) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.detail(client_id as TaskId),
      refetchType: "active",
    });
  }
  queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "active" });
},
```

**3b. Replace `task:state-changed` handler**

Current (single-object destructure):
```ts
"task:state-changed": ({ client_id }, { queryClient }) => {
  const taskId = client_id as TaskId;
  queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId), refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "active" });
},
```

Replacement (array):
```ts
"task:state-changed": (payloads, { queryClient }) => {
  for (const { client_id } of payloads) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.detail(client_id as TaskId),
      refetchType: "active",
    });
  }
  queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "active" });
},
```

**3c. Replace `task:step-created` handler**

Current (uses `_payload`, body has no per-item logic):
```ts
"task:step-created": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({ queryKey: taskKeys.details(), refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "active" });
},
```

Replacement (rename `_payload` to `_payloads` to match new array type; body unchanged):
```ts
"task:step-created": (_payloads, { queryClient }) => {
  queryClient.invalidateQueries({ queryKey: taskKeys.details(), refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "active" });
},
```

**3d. Replace `task:step-deleted` handler**

Current (single-object destructure for `removeQueries`):
```ts
"task:step-deleted": ({ client_id }, { queryClient }) => {
  queryClient.removeQueries({ queryKey: taskStepKeys.detail(client_id as TaskStepId) });
  queryClient.invalidateQueries({ queryKey: taskKeys.details(), refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "active" });
},
```

Replacement (array, per-item removeQueries):
```ts
"task:step-deleted": (payloads, { queryClient }) => {
  for (const { client_id } of payloads) {
    queryClient.removeQueries({ queryKey: taskStepKeys.detail(client_id as TaskStepId) });
  }
  queryClient.invalidateQueries({ queryKey: taskKeys.details(), refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: "active" });
},
```

---

### Step 4 — Typecheck

Run `npm run typecheck` from the monorepo root. All four updated handlers must satisfy the updated `SocketEventHandlers` type derived from `ServerToClientEvents`.

## Risks and mitigations

- Risk: If the backend is still sending single objects for any of the four events during a partial rollout, the handlers will receive a non-array and crash silently.
  Mitigation: Coordinate with backend on rollout timing; the type change is a single commit that goes live together with the backend deploy.

- Risk: TypeScript `SocketEventHandlers` type is derived from `ServerToClientEvents`, so the type change propagates automatically. Any handler not yet updated will surface a TS error on typecheck, making regressions visible before merging.
  Mitigation: Run `npm run typecheck` as the final step; do not merge with errors.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test (workers app): create a step in section A from the manager app while the workers home screen is visible → section A card count increments without pull-to-refresh
- Manual smoke test (workers app): delete a step → card count decrements
- Manual smoke test (managers app): update a task → task detail and list re-fetch

## Review log

_(empty)_

## Lifecycle transition

- Current state: `archived`
- Next state: `-`
- Transition owner: `Codex`
