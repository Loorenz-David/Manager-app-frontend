# PLAN_task_list_card_state_pill_override_20260703

## Metadata

- Plan ID: `PLAN_task_list_card_state_pill_override_20260703`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T09:29:21Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: (1) Add an optional `statePill` override prop to `TaskListCard` so callers can display a
  domain-specific state instead of the task lifecycle state. Wire the post-handling slide page to
  pass the post-handling instance state per card. (2) Add `taskKeys.postHandling()` invalidation
  to the `task:state-changed` socket handler so the post-handling list and counts refresh when a
  task transitions to `ready` (which is when a post-handling record is auto-created).
- Business/user intent: On the post-handling worklist every task is in state `ready` — the task
  state pill is meaningless noise. The post-handling instance state (`pending` / `filled` /
  `completed`) is the relevant signal. Separately, when a `return` or `pre_order` task hits
  `ready` the counts badge on Home must update without a manual refresh.
- Non-goals: Do not change the default pill behaviour for any other consumer of `TaskListCard`.
  Do not touch `PostHandlingBottomAction`, filter-pill rendering, or the `task:updated` handler
  (that handler's post-handling invalidation is covered by the corrections plan Stage 4).

## Scope

- In scope:
  - New `POST_HANDLING_STATE_VARIANT` map in `packages/tasks/src/lib/task-detail.ts`.
  - Optional `statePill` prop on `TaskListCard` that, when provided, supersedes the internally
    derived `stateLabel` / `stateVariant`.
  - `TaskPostHandlingSlidePage` computes and passes `statePill` from the active post-handling
    instance per card.
  - `task:state-changed` socket handler: add `taskKeys.postHandling()` invalidation (covers both
    the post-handling list and counts prefix).
- Out of scope:
  - Workers-app task list cards.
  - Any other slide or sheet page that renders `TaskListCard`.
  - Adding a `statePill` override to `QuickTaskListCard` (already deleted, replaced by
    `TaskListCard`).
  - `task:updated` handler (handled separately in corrections plan Stage 4).
- Assumptions:
  - `PostHandlingState` is already exported from `packages/tasks/src/types.ts` (confirmed at
    line 182).
  - `humanizeSnakeCase` is already exported from `packages/tasks/src/lib/task-detail.ts` and
    produces correct title-case for single words (`"pending"` → `"Pending"`).
  - `StatePillVariant` is already imported by `TaskListCard` from `@beyo/ui`.
  - `taskKeys.postHandling()` already exists in `packages/tasks/src/api/task-keys.ts` (confirmed).
  - `task:created` already invalidates `taskKeys.postHandling()` — `task:state-changed` needs
    the same treatment.

## Clarifications required

_(none — scope is fully determined)_

## Acceptance criteria

1. `TaskListCard` accepts an optional `statePill?: { label: string; variant: StatePillVariant }`
   prop; when absent the existing task-state derivation is unchanged.
2. In the post-handling slide each card's `StatePill` shows the post-handling instance state:
   `pending` → amber "Pending", `filled` → green "Filled", `completed` → grey "Completed".
3. When `activeInstance` is `null` (no post-handling record on the task), no `statePill` override
   is passed and the card falls back to the task state pill normally.
4. `npm run typecheck` passes with zero errors.
5. No other consumer of `TaskListCard` is affected (prop is optional, default behaviour preserved).
6. When a `return` or `pre_order` task transitions to `ready`, the `task:state-changed` socket
   event invalidates `taskKeys.postHandling()`, causing the post-handling counts query and list
   query to refetch if active.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: `TaskListCard` lives in a shared package; the prop
  interface must remain additive (optional, no default value change).
- `architecture/05_server_state.md`: `taskKeys.postHandling()` is used as a prefix invalidation
  key — no new queries introduced.

### Local extensions loaded

- `task_system/frontend_contract_goal_mapping_guide.md`: reading `TaskListCard` and `task-detail`
  is a legitimate relational read (understanding existing return shapes and variant maps).

### File read intent — pattern vs. relational

Permitted reads:
- `packages/tasks/src/components/TaskListCard.tsx` — understand current prop interface and render.
- `packages/tasks/src/lib/task-detail.ts` — understand existing `TASK_STATE_VARIANT` pattern to
  mirror for `POST_HANDLING_STATE_VARIANT`.
- `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx` — understand current `activeInstance`
  derivation and `<TaskListCard>` call site.
- `apps/managers-app/.../features/tasks/socket-events.ts` — understand existing handler shape and
  confirm `taskKeys.postHandling()` is not already present in `task:state-changed`.

### Skill selection

- Primary skill: `—` (surgical file edits, no new files)

## Implementation plan

### Step 1 — `packages/tasks/src/lib/task-detail.ts`

Add the post-handling state → variant map immediately after `TASK_PRIORITY_VARIANT`:

```ts
import type { PostHandlingState } from "../types";   // add to existing type imports

export const POST_HANDLING_STATE_VARIANT: Record<PostHandlingState, StatePillVariant> = {
  pending: "warning",
  filled: "success",
  completed: "neutral",
};
```

No other changes to this file.

### Step 2 — `packages/tasks/src/components/TaskListCard.tsx`

Add the optional override prop to `TaskListCardProps`:

```ts
statePill?: { label: string; variant: StatePillVariant };
```

Destructure it in the component function alongside the existing props.

In the render, replace the hardcoded derivation at the `<StatePill>` call site with:

```tsx
<StatePill
  label={statePill?.label ?? stateLabel}
  variant={statePill?.variant ?? stateVariant}
/>
```

The local variables `stateLabel` and `stateVariant` remain; they are just shadowed when
`statePill` is provided.

### Step 3 — `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

Add imports at the top of the file:

```ts
import {
  humanizeSnakeCase,
  POST_HANDLING_STATE_VARIANT,
} from "../lib/task-detail";
```

Inside the `controller.tasks.map(...)` block, immediately after `activeInstance` is derived,
compute the override pill:

```tsx
const statePill = activeInstance
  ? {
      label: humanizeSnakeCase(activeInstance.state) ?? activeInstance.state,
      variant: POST_HANDLING_STATE_VARIANT[activeInstance.state],
    }
  : undefined;
```

Pass `statePill={statePill}` to `<TaskListCard>`.

### Step 4 — `apps/managers-app/.../features/tasks/socket-events.ts`

In the `"task:state-changed"` handler, after the existing `taskKeys.lists()` invalidation, add:

```ts
queryClient.invalidateQueries({
  queryKey: taskKeys.postHandling(),
  refetchType: "active",
});
```

`taskKeys.postHandling()` = `[...taskKeys.all, "post-handling"]`. Because TanStack Query uses
prefix matching, this single call covers both the post-handling list (`useListPostHandlingTasksQuery`)
and the counts query (`usePostHandlingCountsQuery`) without enumerating their individual params.

Do NOT touch the `task:updated` handler in this plan — that is Step 4 of the approved
`PLAN_task_post_handling_page_corrections_20260703`.

## Risks and mitigations

- Risk: other callers of `TaskListCard` accidentally receive a `statePill` from a refactor.
  Mitigation: prop is optional and defaults to `undefined`; existing callers pass nothing, so
  fall-through to the task-state derivation is guaranteed.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke: open the post-handling slide — each card shows the post-handling state pill
  (amber Pending / green Filled) instead of the green "Ready" task state pill.
- Manual smoke: change a `return` or `pre_order` task to `ready` state from another session —
  the Home "Post-handling" badge count increments without a manual page refresh.

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `Claude`
