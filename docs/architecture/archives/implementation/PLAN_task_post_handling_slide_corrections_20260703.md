# PLAN_task_post_handling_slide_corrections_20260703

## Metadata

- Plan ID: `PLAN_task_post_handling_slide_corrections_20260703`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T13:05:05Z`
- Related issue/ticket: —
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_task_post_handling_slide_corrections_20260703.md`

## Goal and intent

- Goal: Four targeted corrections to `TaskPostHandlingSlidePage` and `TaskPostHandlingHeader` discovered after Codex implemented the role-modes/revision-form plan.
- Business/user intent: Faster perceived performance when opening the slide (preload + pre-warm queries); correct UX for completed post-handling tasks (no phantom action button; state pill always visible); visual integrity of the filter pill row (no wrapping, text truncates gracefully on small screens).
- Non-goals: No new features, no new surfaces, no new API calls beyond the pre-warming queries.

## Scope

- In scope: `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx` (corrections A, B, C) and `packages/tasks/src/components/TaskPostHandlingHeader.tsx` (correction D).
- Out of scope: controller, surface-ids, actions, HomeView, any other file.
- Assumptions:
  - `POST_HANDLING_STATE_VARIANT.completed` is `"neutral"` — confirmed (`task-detail.ts:44`).
  - `TaskListCard.bottomAction` is `React.ReactNode | undefined` — passing `undefined` hides the action strip (confirmed: only renders when `!batchMode && bottomAction`).
  - `useListPostHandlingTasksQuery` is importable inside `TaskPostHandlingSlidePage.tsx` (same package).
  - `usePreloadSurface` is exported from `@beyo/hooks` (already used in other pages within `@beyo/task-creation`).

## Clarifications required

_(none)_

## Acceptance criteria

1. When `TaskPostHandlingSlidePage` mounts, the `PostHandlingPendingWarningSheetPage` JS chunk begins downloading immediately (preload).
2. On mount, list queries for both `"pending"` and `"filled"` states fire concurrently with the default-state query, so toggling between filter pills shows cached data instantly.
3. A task whose `post_handling` array contains only `completed` instances: renders a `statePill` with the "completed" label and the `"neutral"` variant; the action button strip is absent.
4. The filter pill row in `TaskPostHandlingHeader` never wraps to a second line regardless of count label length; labels that would overflow are truncated with an ellipsis.
5. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: prefetch pattern (call query hooks with non-subscribed results to warm cache)
- `architecture/07_components.md`: conditional `ReactNode` rendering via `undefined`
- `architecture/30_dynamic_loading.md`: `usePreloadSurface` pattern; preloading a page by triggering its dynamic import
- `architecture/14_styling.md`: Tailwind flex + truncate utilities

### Local extensions loaded

- `architecture/30_dynamic_loading_local.md`: `usePreloadSurface` from `@beyo/hooks`; loader functions return `.then(m => ({ default: m.XxxPage }))`

### File read intent — pattern vs. relational

Permitted relational reads during planning:
- `TaskPostHandlingSlidePage.tsx` → confirmed current rendering logic for `activeInstance`, `statePill`, `bottomAction`
- `use-task-post-handling.controller.ts` → confirmed `resolveActiveInstance` function (returns first non-completed instance)
- `PostHandlingBottomAction.tsx` → confirmed `isCompleted = instance == null || instance.state === "completed"` guard
- `TaskListCard.tsx` → confirmed `bottomAction?: React.ReactNode` — `undefined` hides the action strip
- `TaskPostHandlingHeader.tsx` → confirmed current pill layout and label construction
- `task-detail.ts` → confirmed `POST_HANDLING_STATE_VARIANT.completed = "neutral"`
- `use-list-post-handling-tasks-query.ts` → confirmed hook exists in same package, already imported in controller

## Implementation plan

---

### Correction A — Preload `PostHandlingPendingWarningSheetPage` on slide mount

**File:** `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

The pending revision sheet is opened by user action from within this slide. To eliminate any chunk-download delay when the user presses "Pending - revision", the page should begin downloading the sheet's JS chunk as soon as the slide itself mounts.

A1. Add `usePreloadSurface` to the imports from `@beyo/hooks`:
```ts
import { usePreloadSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
```

A2. Define a module-level preload function (outside the component, alongside `resolveImageUrl`):
```ts
function preloadRevisionSheet() {
  return import("./PostHandlingPendingWarningSheetPage").then((m) => ({
    default: m.PostHandlingPendingWarningSheetPage,
  }));
}
```

A3. Inside `TaskPostHandlingSlidePage`, call it unconditionally at the top of the component body:
```ts
usePreloadSurface(preloadRevisionSheet);
```

> `usePreloadSurface` calls the function exactly once per mount (guarded internally), so there is no repeated import. The browser's module-loading cache deduplicates the actual network request with the managers app's own `lazyWithPreload` instance of the same page.

---

### Correction B — Pre-warm list queries for each non-completed filter state

**File:** `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

When the slide opens with a default filter (e.g., `"filled"` for managers), toggling to `"pending"` fires a new query and the user sees a loading state. To make switching instant, both `"pending"` and `"filled"` list queries should be running on mount regardless of the default filter.

B1. Add `useListPostHandlingTasksQuery` to the existing imports at the top of the file:
```ts
import { useListPostHandlingTasksQuery } from "../api/use-list-post-handling-tasks-query";
```

B2. Inside `TaskPostHandlingSlidePage`, after the controller is instantiated, call the hook for each individual non-completed state. The results are discarded — the call's only purpose is to populate the TanStack Query cache:

```ts
// Pre-warm list queries so filter-pill switching is instant.
// TanStack Query deduplicates these if the controller is already using the same key.
useListPostHandlingTasksQuery({ post_handling_states: "pending" });
useListPostHandlingTasksQuery({ post_handling_states: "filled" });
```

> These two calls trigger `useInfiniteQuery` subscriptions that fire immediately. When the user toggles a filter pill, the controller switches to one of these pre-warmed query keys and renders from cache rather than waiting for a network response.

> The call for the default state (e.g., `"filled"`) will overlap with the controller's own combined-state query (e.g., `"filled"` if the user's default is single). TanStack Query deduplicates by identical query key.

---

### Correction C — Completed tasks: hide action button, show statePill

**File:** `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

Currently, when a task has only completed post-handling instances, `resolveActiveInstance` returns `null`. The current code:
1. Sets `statePill = undefined` — so completed tasks show no state badge.
2. Renders `<PostHandlingBottomAction>` with `isCompleted=true` (disabled) — a visual action strip is still present even though there is nothing to do.

The corrections: always derive a `statePill` from whichever instance is available (active or completed), and only render the action strip when there is a non-completed active instance.

C1. In the `controller.tasks.map((task) => { ... })` block, replace the current `activeInstance` / `statePill` derivation:

```ts
// BEFORE:
const activeInstance = controller.resolveActiveInstance(
  task.task.post_handling,
);
const statePill = activeInstance
  ? {
      label:
        humanizeSnakeCase(activeInstance.state) ??
        activeInstance.state,
      variant:
        POST_HANDLING_STATE_VARIANT[activeInstance.state],
    }
  : undefined;

// AFTER:
const activeInstance = controller.resolveActiveInstance(
  task.task.post_handling,
);
// Fallback for completed tasks: find the completed instance so its pill is visible
const completedInstance =
  activeInstance === null
    ? (task.task.post_handling?.find((i) => i.state === "completed") ?? null)
    : null;
const displayInstance = activeInstance ?? completedInstance;
const statePill = displayInstance
  ? {
      label:
        humanizeSnakeCase(displayInstance.state) ??
        displayInstance.state,
      variant: POST_HANDLING_STATE_VARIANT[displayInstance.state],
    }
  : undefined;
```

C2. Make `bottomAction` conditional — only pass it when `activeInstance` is non-null:

```ts
// BEFORE:
<TaskListCard
  bottomAction={
    <PostHandlingBottomAction
      instance={activeInstance}
      isCompleting={...}
      taskId={...}
      onComplete={...}
      onRequestPendingWarning={...}
    />
  }
  ...
/>

// AFTER:
<TaskListCard
  bottomAction={
    activeInstance !== null ? (
      <PostHandlingBottomAction
        instance={activeInstance}
        isCompleting={controller.completingTaskId === task.task.client_id}
        taskId={task.task.client_id}
        onComplete={() =>
          void controller.handleComplete(
            task.task.client_id,
            activeInstance,
            false,
          )
        }
        onRequestPendingWarning={() =>
          controller.openPendingWarning(task, activeInstance)
        }
      />
    ) : undefined
  }
  ...
/>
```

> `TaskListCard` only renders the action strip `div` when `!batchMode && bottomAction` is truthy, so `undefined` correctly suppresses the border and the button.

---

### Correction D — Prevent pill row wrapping; truncate pill labels

**File:** `packages/tasks/src/components/TaskPostHandlingHeader.tsx`

Currently the pill row uses `flex gap-2 pb-1` with `flex-1` on each button. On narrow screens, when count labels like `"pending (142)"` are long, the `min-content` size of the button text pushes the pill wider than its equal-share allocation, potentially wrapping the row.

Fix: set `min-w-0` on each button (overrides the `min-width: auto` default so the flex item can shrink below content size), wrap the label text in a `<span>` with `truncate` (which expands to `overflow-hidden whitespace-nowrap text-ellipsis`).

D1. In the pill `<div>` container, no class changes needed — `flex` is already `nowrap` by default. Keep as-is.

D2. On each pill `<button>`, add `min-w-0` to the existing className:
```tsx
// BEFORE:
className={cn(
  "flex-1 rounded-full border px-4 py-2 text-center text-sm font-medium capitalize transition",
  ...
)}

// AFTER:
className={cn(
  "min-w-0 flex-1 rounded-full border px-4 py-2 text-center text-sm font-medium capitalize transition",
  ...
)}
```

D3. Wrap the label text in a `<span className="block truncate">`:
```tsx
// BEFORE:
{label}

// AFTER:
<span className="block truncate">{label}</span>
```

Full corrected button block:
```tsx
<button
  aria-pressed={isActive}
  key={state}
  className={cn(
    "min-w-0 flex-1 rounded-full border px-4 py-2 text-center text-sm font-medium capitalize transition",
    isActive
      ? "border-blue-400 bg-blue-100 text-blue-700"
      : "border-slate-300 bg-card text-slate-700",
  )}
  data-testid={`task-post-handling-filter-${state}`}
  type="button"
  onClick={() => onToggleState(state)}
>
  <span className="block truncate">{label}</span>
</button>
```

> `block` is needed on the `<span>` because `truncate` requires the element to be a block-level container that establishes its own width context inside the button.

---

### Correction E — Socket events: missing counts invalidation on `task:updated`; wrong `refetchType` on `task:state-changed`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`

Two gaps in the socket event handlers mean the counts query (`usePostHandlingCountsQuery`) can remain stale even while the list updates correctly.

**Gap 1 — `task:updated` does not touch `taskKeys.postHandling()`.**

The counts query key is `taskKeys.postHandlingCounts(...)` = `["tasks", "post-handling", "counts", ...]`, which lives under the `taskKeys.postHandling()` = `["tasks", "post-handling"]` prefix. The `task:updated` handler only invalidates `taskKeys.lists()` and `taskKeys.detail(...)`, so the counts badge on the pills never refreshes when a task is updated (e.g. after the revision form saves via `update-post-handling`).

Fix: add a `taskKeys.postHandling()` invalidation to the `task:updated` handler with `refetchType: "all"` (see Gap 2 rationale below).

```ts
// BEFORE:
"task:updated": (payloads, { queryClient }) => {
  for (const { client_id } of payloads) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.detail(client_id as TaskId),
      refetchType: "active",
    });
  }
  queryClient.invalidateQueries({
    queryKey: taskKeys.lists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: quickTaskKeys.all,
    refetchType: "active",
  });
},

// AFTER:
"task:updated": (payloads, { queryClient }) => {
  for (const { client_id } of payloads) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.detail(client_id as TaskId),
      refetchType: "active",
    });
  }
  queryClient.invalidateQueries({
    queryKey: taskKeys.lists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.postHandling(),
    refetchType: "all",
  });
  queryClient.invalidateQueries({
    queryKey: quickTaskKeys.all,
    refetchType: "active",
  });
},
```

**Gap 2 — `task:state-changed` uses `refetchType: "active"` for the post-handling prefix.**

`task:state-changed` already invalidates `taskKeys.postHandling()`, so the key coverage is correct. The problem is `refetchType: "active"`: this only triggers a background refetch for queries that have active observers **at the moment the socket event fires**. If the revision sheet is open on top of the slide, the slide's `usePostHandlingCountsQuery` observer can become inactive, so the invalidation marks the query stale but does not refetch — the counts stay frozen until the slide remounts.

Using `refetchType: "all"` marks the query stale **and** schedules a refetch regardless of observer state, so the counts update as soon as any component re-subscribes (or immediately if one is still active).

```ts
// BEFORE:
queryClient.invalidateQueries({
  queryKey: taskKeys.postHandling(),
  refetchType: "active",
});

// AFTER:
queryClient.invalidateQueries({
  queryKey: taskKeys.postHandling(),
  refetchType: "all",
});
```

> The `taskKeys.lists()` invalidations in both handlers keep `refetchType: "active"` — list queries are always visible when the slide is open, so active observers are reliable and we avoid spurious refetches of large list queries in the background.

---

### Correction F — Pull-to-refresh must also refresh the counts query

**File:** `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

Currently `<PullToRefresh onRefresh={controller.refetch}>` only calls `query.refetch()` on the list (inside the controller). The `countsQuery` returned by `usePostHandlingCountsQuery` in the slide page is not included, so pulling down to refresh shows fresh list items but stale pill counts.

F1. Define a combined async handler in the component body, after `countsQuery` is declared:

```ts
async function handleRefresh() {
  await Promise.all([controller.refetch(), countsQuery.refetch()]);
}
```

F2. Pass it to `PullToRefresh`:

```tsx
// BEFORE:
onRefresh={controller.refetch}

// AFTER:
onRefresh={handleRefresh}
```

> `Promise.all` fires both refetches concurrently so pull-to-refresh doesn't serialize them.

---

## File change summary

| # | File | Corrections | Change type |
|---|---|---|---|
| 1 | `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx` | A, B, C, F | Modified |
| 2 | `packages/tasks/src/components/TaskPostHandlingHeader.tsx` | D | Modified |
| 3 | `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts` | E | Modified |

**Total: 3 files modified — 0 new files.**

---

## Consolidated diff for `TaskPostHandlingSlidePage.tsx`

Corrections A, B, C, and F all apply to this single file. Complete change sequence within the component:

```tsx
// Imports — add usePreloadSurface (A) and useListPostHandlingTasksQuery (B)
import { usePreloadSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { useListPostHandlingTasksQuery } from "../api/use-list-post-handling-tasks-query";

// Module-level (A) — add after resolveImageUrl function
function preloadRevisionSheet() {
  return import("./PostHandlingPendingWarningSheetPage").then((m) => ({
    default: m.PostHandlingPendingWarningSheetPage,
  }));
}

// Inside component body — add after controller + countsQuery are declared
usePreloadSurface(preloadRevisionSheet);                                   // A
useListPostHandlingTasksQuery({ post_handling_states: "pending" });        // B
useListPostHandlingTasksQuery({ post_handling_states: "filled" });         // B

// Combined refresh handler — fires list + counts concurrently on pull-to-refresh (F)
async function handleRefresh() {
  await Promise.all([controller.refetch(), countsQuery.refetch()]);
}

// Pass to PullToRefresh (F)
// BEFORE: onRefresh={controller.refetch}
// AFTER:
onRefresh={handleRefresh}

// Inside map — replace activeInstance/statePill block (C1)
const activeInstance = controller.resolveActiveInstance(task.task.post_handling);
const completedInstance =
  activeInstance === null
    ? (task.task.post_handling?.find((i) => i.state === "completed") ?? null)
    : null;
const displayInstance = activeInstance ?? completedInstance;
const statePill = displayInstance
  ? {
      label: humanizeSnakeCase(displayInstance.state) ?? displayInstance.state,
      variant: POST_HANDLING_STATE_VARIANT[displayInstance.state],
    }
  : undefined;

// Inside map — make bottomAction conditional (C2)
bottomAction={
  activeInstance !== null ? (
    <PostHandlingBottomAction ... />
  ) : undefined
}
```

---

## Risks and mitigations

- Risk: Pre-warming "pending" and "filled" list queries always fires both, even when the user's default already covers one of them. On slow connections this means 2 extra requests on slide open.
  Mitigation: Acceptable — these are cheap list queries (limit 25) that run on an intentional user action. The controller's own query fires simultaneously; they share the connection pool.

- Risk: `useListPostHandlingTasksQuery` results from correction B are subscribed but unused, leaking a TanStack Query observer.
  Mitigation: TanStack Query manages subscription lifecycle via React component unmount. When the slide unmounts, all three query observers are automatically unsubscribed. No leak.

- Risk: For a task whose `post_handling` array is null or empty, both `activeInstance` and `completedInstance` are `null`. `displayInstance` is null and `statePill` is `undefined`. The action strip is hidden. This is correct behavior (edge case: task was added to the list without a post-handling instance).
  Mitigation: No change needed — the existing `statePill = undefined` path is preserved for this case.

- Risk: `block truncate` on the pill `<span>` might interact unexpectedly with `text-center` on the button if the `<span>` width doesn't match the button's width.
  Mitigation: `block` makes the span fill the button's content box (100% width), so `text-center` remains effective via the button's inherited text-align. `truncate` only activates when content overflows, leaving short labels centered normally.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in all three changed files
- Manual (preload): Open post-handling slide → open browser Network tab → confirm `PostHandlingPendingWarningSheetPage` chunk appears in network requests immediately (before pressing any action button)
- Manual (pre-warm): Open slide → switch filter pill → confirm no loading spinner (instant switch from cached data)
- Manual (completed tasks): Filter to include "completed" → verify completed task cards show a "completed" neutral badge and no action button strip
- Manual (pill truncation): Resize browser to narrow viewport or simulate counts with long numbers → confirm pills stay on one row; long labels end in `…`
- Manual (socket counts): With two browser tabs open on the post-handling slide, complete or update a task on one tab → confirm the pill counts on the other tab update without manual refresh
- Manual (socket list): Same two-tab scenario → confirm completed tasks disappear from the active list on the other tab
- Manual (pull-to-refresh): Pull down on the post-handling slide → confirm both the task list AND the pill counts refresh (counts badge should reflect server state after release)

## Review log

_(empty — awaiting Codex execution)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
