# PLAN_realtime_06_task_step_socket_handlers_20260619

## Metadata

- Plan ID: `PLAN_realtime_06_task_step_socket_handlers_20260619`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T11:34:08Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_realtime_layer_shared_packages_20260619.md`

## Goal and intent

- Goal: Wire `task:step-created` and `task:step-deleted` socket events into the managers and workers apps; fix two incomplete existing handlers in both apps that miss the parent-level query invalidations required for the surfaces where step data is embedded.
- Business/user intent: Managers see step additions and removals reactively on `TaskWorkingSectionsSlidePage` without a manual refresh. Workers see new/removed steps in their section view and their dependency readiness status (`readiness_status`) updates automatically when a blocking step in another section is completed, removed, or created — without reloading the app.
- Non-goals: modifying backend payloads; adding new query hooks; any UI changes.

## Scope

- In scope:
  - `packages/realtime/src/lib/socket-types.ts` — add 2 missing events; fix 2 incorrect payload types.
  - `apps/managers-app/.../features/tasks/socket-events.ts` — add `task:step-created` + `task:step-deleted` handlers; fix `task:step-state-changed` + `task:step-assigned` to also invalidate the task detail (step data is embedded in the task detail query, not a standalone step list).
  - `apps/workers-app/.../features/task_steps/socket-events.ts` — add `task:step-created` + `task:step-deleted` handlers using the `working_section_id` from the payload for targeted section-list invalidation.
- Out of scope: registry changes (task slice already registered in both apps); UI changes; new API endpoints.
- Assumptions:
  - `TaskId` and `TaskStepId` branded types exist in `apps/managers-app/.../types/common`.
  - `WorkingSectionId` is imported from `@beyo/lib` (already the case in the workers task step key file).
  - The managers `TaskWorkingSectionsSlidePage` reads task steps from `taskQuery.data?.task_steps` (confirmed: controller calls `useGetTaskQuery(taskId)` and derives steps from `taskQuery.data?.task_steps`). There is no separate step-list query for the managers task-working-sections surface.
  - The workers section list query (`taskStepKeys.sectionList(params)`) returns `readiness_status` and `dependency_working_sections` embedded per step — so section list invalidation is sufficient to refresh the dependency UI.

## Clarifications required

None. All query key structures and surface data flows confirmed from relational reads.

## Acceptance criteria

1. `task:step-created` and `task:step-deleted` are present in `ServerToClientEvents` in `socket-types.ts` with the payloads `{ client_id: string; working_section_id: string }`.
2. `task:created` payload in `ServerToClientEvents` includes `working_section_ids: string[]`.
3. `case:participant-added` payload in `ServerToClientEvents` includes `unread_count: number`.
4. Managers `taskSocketEvents` handles `task:step-created` and `task:step-deleted`; both also invalidate `taskKeys.details()` so that the `TaskWorkingSectionsSlidePage` (which reads steps from the task detail) updates reactively.
5. Managers `task:step-state-changed` and `task:step-assigned` handlers each include an invalidation of `taskKeys.details()` (in addition to the existing `taskStepKeys.detail` invalidation).
6. Workers `taskStepSocketEvents` handles `task:step-created` and `task:step-deleted` using `taskStepKeys.sectionListsBySection(workingSectionId)` for targeted section invalidation.
7. No existing handler logic is removed — only additions and targeted additions.
8. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/21_realtime.md`: handler pattern, `SocketEventHandlers` type, `refetchType: 'active'` rule.
- `architecture/05_server_state.md`: `invalidateQueries` + `removeQueries` patterns for deletes.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`: authoritative event payloads; `client_id` on `task:step-*` events refers to the **step**, not the parent task; `working_section_id` is included in `step-created` and `step-deleted` payloads.

### Local extensions loaded

None required beyond the catalog and realtime contract.

### File read intent — pattern vs. relational

Permitted relational reads (key factory signatures already confirmed — listed for reference only):
- `apps/managers-app/.../features/tasks/api/task-keys.ts` — `taskKeys.details()`, `taskKeys.lists()`
- `apps/managers-app/.../features/tasks/subfeatures/task_steps/api/task-step-keys.ts` — `taskStepKeys.detail(id)`, `taskStepKeys.list(taskId)`
- `apps/workers-app/.../features/task_steps/api/task-step-keys.ts` — `taskStepKeys.sectionLists()`, `taskStepKeys.sectionListsBySection(sectionId)`, `taskStepKeys.userLastActive()`
- `apps/managers-app/.../features/tasks/socket-events.ts` — existing handler structure to extend

Prohibited: reading another socket handler file to understand the handler shape → use `21_realtime.md`.

### Skill selection

- Primary skill: `verify` / typecheck.
- Trigger terms: `socket, realtime, task step, dependency`.

## Implementation plan

### Step 1 — Fix and extend `ServerToClientEvents` in `@beyo/realtime`

File: `packages/realtime/src/lib/socket-types.ts`

Make three targeted changes:

**1a — Add two missing task step events** (insert after `"task:step-state-changed"` and before `"case:created"`):

```ts
"task:step-created": (payload: {
  client_id:          string;  // step client_id
  working_section_id: string;
}) => void;
"task:step-deleted": (payload: {
  client_id:          string;  // step client_id
  working_section_id: string;
}) => void;
```

**1b — Fix `task:created` payload** (currently missing `working_section_ids`):

Replace:
```ts
"task:created": (payload: { client_id: string }) => void;
```
With:
```ts
"task:created": (payload: { client_id: string; working_section_ids: string[] }) => void;
```

**1c — Fix `case:participant-added` payload** (currently missing `unread_count`):

Replace:
```ts
"case:participant-added": (payload: { client_id: string }) => void;
```
With:
```ts
"case:participant-added": (payload: { client_id: string; unread_count: number }) => void;
```

These are non-breaking: existing handlers that destructure only `client_id` continue to compile without change since the extra fields are additive.

---

### Step 2 — Update managers `features/tasks/socket-events.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`

**2a — Fix existing `task:step-state-changed` handler**

The `TaskWorkingSectionsSlidePage` reads task steps from `taskQuery.data?.task_steps` (embedded in the task detail). The existing handler only invalidates `taskStepKeys.detail(stepId)` which has no effect on the task detail surface. Add `taskKeys.details()` invalidation:

Replace the current `"task:step-state-changed"` handler with:

```ts
"task:step-state-changed": ({ client_id }, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.detail(client_id as TaskStepId),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
    refetchType: "active",
  });
},
```

**2b — Fix existing `task:step-assigned` handler**

Same reasoning — the step assignment changes `assigned_worker_id` which is displayed on the task working sections surface. Add `taskKeys.details()` invalidation:

Replace the current `"task:step-assigned"` handler with:

```ts
"task:step-assigned": ({ client_id }, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.detail(client_id as TaskStepId),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
    refetchType: "active",
  });
},
```

**2c — Add `task:step-created` handler**

The payload has the step's `client_id` and `working_section_id`, but NOT the parent `task_id`. The managers surface reads steps from `taskQuery.data?.task_steps`, so we must invalidate `taskKeys.details()` (all active task detail queries). With `refetchType: 'active'`, only the currently open task detail refetches.

```ts
"task:step-created": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.lists(),
    refetchType: "active",
  });
},
```

`taskKeys.lists()` is also invalidated because the task list may surface step counts or status indicators that change when steps are added.

**2d — Add `task:step-deleted` handler**

```ts
"task:step-deleted": ({ client_id }, { queryClient }) => {
  queryClient.removeQueries({
    queryKey: taskStepKeys.detail(client_id as TaskStepId),
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.lists(),
    refetchType: "active",
  });
},
```

The final `taskSocketEvents` object must contain all 8 handlers: `task:created`, `task:updated`, `task:deleted`, `task:state-changed`, `task:step-assigned`, `task:step-state-changed`, `task:step-created`, `task:step-deleted`. No existing handler is removed.

---

### Step 3 — Update workers `features/task_steps/socket-events.ts`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`

Add the import for `WorkingSectionId`:

```ts
import type { WorkingSectionId } from "@beyo/lib";
```

**3a — Add `task:step-created` handler**

```ts
"task:step-created": ({ working_section_id }, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionListsBySection(
      working_section_id as WorkingSectionId,
    ),
    refetchType: "active",
  });
},
```

`sectionListsBySection(sectionId)` targets `["task-steps", "section-list", sectionId]` — all paginated/filtered queries for that specific section refetch. This is more targeted than `sectionLists()` and avoids unnecessary refetches in other sections.

**Note on dependency propagation:** Creating a new step in a section could theoretically affect the `readiness_status` of steps in OTHER sections (if dependency tracking is updated). However, the section list query for the affected section already contains up-to-date `readiness_status` values when it next refetches. The broad `task:step-state-changed` handler (which fires when existing steps transition) is the primary signal for cross-section dependency updates. `task:step-created` only needs to refresh the section the new step belongs to.

**3b — Add `task:step-deleted` handler**

```ts
"task:step-deleted": ({ working_section_id }, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionListsBySection(
      working_section_id as WorkingSectionId,
    ),
    refetchType: "active",
  });
},
```

The final `taskStepSocketEvents` object must contain all 4 handlers: `task:step-assigned`, `task:step-state-changed`, `task:step-created`, `task:step-deleted`. No existing handler is removed.

No registry changes are needed — the task slice is already registered in both apps' `socket-registry.ts`.

---

### Step 4 — Typecheck

Run from the monorepo root:

```
npm run typecheck
```

Must pass with zero errors across `packages/realtime`, `apps/managers-app`, and `apps/workers-app`.

Verify that the existing `@beyo/cases` handler for `case:participant-added` still compiles after the payload type update (it destructures only `{ client_id }` and ignores `unread_count` — this is valid TypeScript).

## Risks and mitigations

- Risk: Invalidating `taskKeys.details()` (all task details) on `task:step-created/deleted/state-changed/assigned` is broader than targeting a single task. Managers with multiple tasks open simultaneously would refetch all open task details.
  Mitigation: `refetchType: 'active'` ensures only currently rendered detail views refetch; the managers app is unlikely to have more than one task detail surface open simultaneously. The backend payload does not include `task_id` for step events — targeted invalidation is impossible without it.

- Risk: Workers `sectionListsBySection(working_section_id)` invalidation misses cross-section dependency updates on `task:step-created`.
  Mitigation: Accepted. The dependency system reacts to step state transitions (existing `task:step-state-changed` handler invalidates all `sectionLists()`). Step creation triggers an initial state of `pending` — it does not unblock existing steps in other sections. If a newly created step becomes a dependency blocker, it only matters once it moves to a terminal/active state, at which point `task:step-state-changed` fires and does the broader invalidation.

- Risk: `task:step-deleted` in workers does not remove the deleted step from cache (only invalidates the section list).
  Mitigation: The section list query returns a flat list without per-step cache entries. The `sectionListsBySection` invalidation causes the section list to refetch, which naturally excludes the deleted step in the response.

## Validation plan

- `npm run typecheck`: zero errors.
- Manual smoke test (managers): open `TaskWorkingSectionsSlidePage` for a task; from another browser session, trigger a step state change; confirm the slide page updates the step state pill without a manual refresh.
- Manual smoke test (workers): open the working section steps view; from a managers session, add or remove a step from that section; confirm the step appears or disappears in the workers view without a refresh.
- Dependency system check: have two sections where B depends on A; open the workers section B view while section A's step is still pending; from another session, complete section A's step; confirm the dependency warning on section B's step clears automatically.

## Review log

- `2026-06-19` author: initial draft.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
