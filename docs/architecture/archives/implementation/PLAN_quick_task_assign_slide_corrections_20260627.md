# PLAN_quick_task_assign_slide_corrections_20260627

## Metadata

- Plan ID: `PLAN_quick_task_assign_slide_corrections_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T11:48:53Z`
- Related issue/ticket: —
- Intention plan: —
- Source plan: `docs/architecture/archives/implementation/PLAN_quick_task_assign_slide_20260627.md`
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_quick_task_assign_slide_20260627.md`

## Goal and intent

- Goal: Fix two runtime bugs and close five gaps/drifts identified during the post-implementation review of `PLAN_quick_task_assign_slide_20260627`.
- Business/user intent: The quick-assign slide must auto-close when the last task is saved, must not thrash React on every render, must show the same card data the managers-app task list shows, and the home boxes must match the specified visual design.
- Non-goals: No new features; no changes to the socket-event layer; no changes to `quickTaskKeys.list` limit param (acceptable as-is); no changes to the `useScrollVisibilityContext()` pattern in `QuickTaskAssignFooter` (consistent with `TaskWorkingSectionsSlidePage` and presumed to work via the slide's ambient context).

## Scope

- In scope:
  - Bug fix: `handleSaveCompleted` stale closure — slide does not auto-close on last task.
  - Bug fix: `useMemo` / `useEffect` depend on the entire `staged` object — re-fires every render.
  - Gap: `QuickTaskListCard` missing overdue badge, return-source label, and quantity pill.
  - Gap: `QuickTaskListCard` icon lookup silently falls back to `pre_order` icon for `internal` type.
  - Gap: `QuickTaskListCard` missing `data-testid` on root element.
  - Gap: home boxes missing `data-testid`.
  - Drift: home box styling deviates from spec (missing border, wrong pill counter, icon position).

- Out of scope:
  - `quickTaskKeys.list` limit parameter — no change needed; invalidation via `quickTaskKeys.all` still works.
  - `useScrollVisibilityContext()` in footer — accepted; consistent with the existing slide pattern.
  - Playwright test creation — not part of this corrections pass.

- Assumptions:
  - `staged.navigateTo` is a stable function reference across renders (memoized inside `useStagedForm`). If it is not, the `useEffect` will still fire on every render but without causing incorrect behaviour — only unnecessary header calls. This is safe to ship.
  - `is_overdue` is not present on `TaskListItemRaw`. Overdue status is computed locally as `ready_by_at ? new Date(ready_by_at) < new Date() : false`.
  - `"border-between-border"` in the original intention is a typo for `border-border` (the existing CSS token used across the codebase).

## Clarifications required

_(none — all decisions resolved)_

## Acceptance criteria

1. Opening the quick-assign slide with exactly one pending task, assigning working sections, and saving causes the slide to close automatically.
2. No console warnings about re-renders caused by changing `useMemo`/`useEffect` deps every render.
3. `QuickTaskListCard` shows an overdue badge when `ready_by_at` is in the past, return source below the type label, and a quantity pill on seat images.
4. `QuickTaskListCard` with `task_type = "internal"` renders `Wrench` icon, not the `ShoppingBag` fallback.
5. `data-testid="quick-task-card-{taskId}"` exists on the outermost div of each rendered card.
6. `data-testid="home-quick-preorders-box"` and `data-testid="home-quick-returns-box"` exist on the home buttons.
7. Home boxes match spec: `rounded-2xl border border-border bg-card py-4 shadow-sm text-primary`, icon on the left of the label, absolutely-positioned round pill in top-right corner with `bg-primary text-card` styling.
8. `npm run typecheck` passes with zero errors across all four changed files.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: `data-testid` placement, `memo`, component props conventions
- `architecture/08_hooks.md`: stale closure pattern in `useCallback` — deps array must include all referenced variables; functional updater pattern for state-derived computations
- `architecture/14_styling.md`: Tailwind class conventions, CSS variable tokens

### File read intent

Permitted reads done prior to this plan:
- `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts` → confirmed stale closure in `handleSaveCompleted`; confirmed `tasks` is plain `useMemo` value (not ref), not accessible via functional updater
- `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx` → confirmed `staged` object in both `useMemo` and `useEffect` deps; confirmed `staged.activeStepId` and `staged.navigateTo` are the only used primitives
- `packages/task-working-sections/src/components/QuickTaskListCard.tsx` → confirmed missing fields; confirmed `return_source` is on `task.task`; confirmed `item_major_category_snapshot` on `primary_item`
- `apps/managers-app/.../features/home/components/HomeView.tsx` → confirmed missing testids; confirmed styling deviates from spec

No pattern reads needed — existing contracts cover all changes.

---

## Implementation plan

### Fix 1 — Stale `tasks.length` in `handleSaveCompleted`

**File:** `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts`

**Root cause:** `handleSaveCompleted` is called from `onSaveComplete` which is captured inside a `useMemo`. By the time `onSaveComplete` fires (after the async save), the `controller` inside the memo is the pre-state-update version — its `tasks` array still includes the removed task. Returning `tasks.length` therefore returns `N` not `N - 1`, so the "close when empty" check fails when N was 1.

**Change:** Filter out the saved task ID from the count inline, so the result is correct regardless of closure staleness.

```ts
// Before (line ~88):
function handleSaveCompleted(taskId: string): number {
  setSavingTaskId((current) => (current === taskId ? null : current));
  setSelectedTaskId((current) => (current === taskId ? null : current));
  void Promise.all([listQuery.refetch(), countsQuery.refetch()]);
  return tasks.length;
}

// After:
function handleSaveCompleted(taskId: string): number {
  setSavingTaskId((current) => (current === taskId ? null : current));
  setSelectedTaskId((current) => (current === taskId ? null : current));
  void Promise.all([listQuery.refetch(), countsQuery.refetch()]);
  return tasks.filter((t) => t.task.client_id !== taskId).length;
}
```

No other changes to this file.

---

### Fix 2 — Unstable `staged` object in `useMemo` and `useEffect` deps

**File:** `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx`

**Root cause:** `useStagedForm` likely returns a new object reference on every render. Both `useMemo` and `useEffect` list `staged` as a dep, so they re-run on every render. The `useMemo` recreating `workingSectionSurfaceOpeners` every render propagates a new `surfaceOpeners` prop to `TaskWorkingSectionsProvider` every render, which recreates `handleSaveAndClose` in the working-sections controller every render.

**Change A — `useMemo` deps** (currently line ~325):

```ts
// Before:
const workingSectionSurfaceOpeners = useMemo<TaskWorkingSectionsSurfaceOpeners>(
  () => ({ ... }),
  [controller, selectedTaskId, staged],
);

// After:
const workingSectionSurfaceOpeners = useMemo<TaskWorkingSectionsSurfaceOpeners>(
  () => ({ ... }),
  [controller, selectedTaskId, staged.navigateTo],
);
```

**Change B — `useEffect` deps** (currently line ~353):

```ts
// Before:
}, [controller.taskTypeLabel, header, staged]);

// After:
}, [controller.taskTypeLabel, header, staged.activeStepId, staged.navigateTo]);
```

The `useEffect` body already uses `staged.activeStepId` and `staged.navigateTo` — these are the only `staged` properties referenced. Using them as individual deps is correct.

No other changes to the `useMemo` or `useEffect` bodies.

---

### Fix 3 — `QuickTaskListCard` missing display fields, broken icon map, missing root testid

**File:** `packages/task-working-sections/src/components/QuickTaskListCard.tsx`

Four targeted additions to the existing component:

#### 3a — Import `Wrench` from `lucide-react` and `LucideIcon` type

```ts
import { Calendar, MoreHorizontal, RotateCcw, ShoppingBag, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
```

#### 3b — Fix icon map and derive icon with safe fallback

Replace the two-entry `TASK_TYPE_ICON` const and the ternary lookup with:

```ts
const TASK_TYPE_ICON: Record<string, LucideIcon> = {
  pre_order: ShoppingBag,
  return: RotateCcw,
  internal: Wrench,
};

// Inside the component:
const TypeIcon = TASK_TYPE_ICON[task.task.task_type] ?? ShoppingBag;
```

Remove the old ternary `const TypeIcon = task.task.task_type === "return" ? ...`.

Also fix `typeLabel` the same way — add a full map:

```ts
const TASK_TYPE_LABEL: Record<string, string> = {
  pre_order: "Pre-order",
  return: "Return",
  internal: "Internal",
};

// Inside the component:
const typeLabel = TASK_TYPE_LABEL[task.task.task_type] ?? task.task.task_type;
```

Remove the old `const typeLabel = ...` ternary.

#### 3c — Add computed `isOverdue`, `returnSourceLabel`, and `quantityPillLabel`

Add these derivations inside the component body (after existing derivations):

```ts
const isOverdue = task.task.ready_by_at
  ? new Date(task.task.ready_by_at) < new Date()
  : false;

const RETURN_SOURCE_LABEL: Record<string, string> = {
  after_purchase: "After purchase",
  before_purchase: "Before purchase",
  store_return: "Store return",
};
const returnSourceLabel = task.task.return_source
  ? (RETURN_SOURCE_LABEL[task.task.return_source] ?? null)
  : null;

const quantityPillLabel =
  task.primary_item?.item_major_category_snapshot?.toLowerCase() === "seat"
    ? `#${task.primary_item.quantity}`
    : null;
```

> `RETURN_SOURCE_LABEL` is a local constant inside the component (not exported) since it is not shared elsewhere in the package.

#### 3d — Add root `data-testid`

Add `data-testid={`quick-task-card-${taskId}`}` to the outermost `<div>` (currently `<div className="overflow-hidden rounded-2xl shadow-sm">`):

```tsx
<div
  className="overflow-hidden rounded-2xl shadow-sm"
  data-testid={`quick-task-card-${taskId}`}
>
```

#### 3e — Render new fields in JSX

**Quantity pill on image** — inside the image button, after the `<img>` / `<ImagePlaceholder>`:

```tsx
{quantityPillLabel ? (
  <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
    {quantityPillLabel}
  </span>
) : null}
```

Make the image button `className` include `relative` (it already needs to be `relative` to position the pill) — add `relative` if not already there.

**Return source label** — inside the type row, append after `{typeLabel}`:

```tsx
<span className="truncate">
  {typeLabel}
  {returnSourceLabel ? ` · ${returnSourceLabel}` : ""}
</span>
```

**Overdue badge** — append inside the ready-by date row, after `<span>{readyByLabel}</span>`:

```tsx
{isOverdue ? (
  <span className="ml-1 inline-flex items-center rounded-md bg-[#8f3a33] px-2 py-0.5 text-[11px] font-medium text-white">
    Overdue
  </span>
) : null}
```

This matches the same `bg-[#8f3a33]` overdue badge used in the managers-app `TaskListCard`.

---

### Fix 4 — HomeView: add `data-testid` and correct styling per spec

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx`

Replace the two `<button>` elements inside the `<div className="grid grid-cols-2 gap-3">` entirely. The corrected design follows the spec: `rounded-2xl border border-border bg-card py-4 px-4 shadow-sm text-primary`, icon on the **left** side of the label, absolutely-positioned full-round pill counter in the **top-right corner** with `bg-primary text-card`.

**Pre-orders box:**

```tsx
<button
  className="relative flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm text-primary w-full"
  data-testid="home-quick-preorders-box"
  type="button"
  onClick={() => openQuickAssignSurface("pre_order")}
>
  {preOrderCount !== null && preOrderCount > 0 ? (
    <span className="absolute -top-2 -right-2 flex min-w-5 h-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-card">
      {formatCompactCount(preOrderCount)}
    </span>
  ) : null}
  <ShoppingBag aria-hidden="true" className="size-5 shrink-0" />
  <span className="text-sm font-medium">Pre-orders</span>
</button>
```

**Returns box:**

```tsx
<button
  className="relative flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm text-primary w-full"
  data-testid="home-quick-returns-box"
  type="button"
  onClick={() => openQuickAssignSurface("return")}
>
  {returnCount !== null && returnCount > 0 ? (
    <span className="absolute -top-2 -right-2 flex min-w-5 h-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-card">
      {formatCompactCount(returnCount)}
    </span>
  ) : null}
  <RotateCcw aria-hidden="true" className="size-5 shrink-0" />
  <span className="text-sm font-medium">Returns</span>
</button>
```

The pill is hidden when count is 0 or null (avoids showing "0" pill on load). `formatCompactCount` is already imported. No new imports needed.

---

## File summary

| # | File | Action | Fixes |
|---|---|---|---|
| 1 | `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts` | Modified — one-line change in `handleSaveCompleted` | Bug 1 (stale count) |
| 2 | `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx` | Modified — two dep arrays | Bug 2 (render thrash) |
| 3 | `packages/task-working-sections/src/components/QuickTaskListCard.tsx` | Modified — icon map, overdue badge, return source, quantity pill, root testid | Gaps 3-6 |
| 4 | `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx` | Modified — box markup rewrite | Gap 7, Drift 8 |

**Total: 0 new files, 4 modified files**

---

## Risks and mitigations

- Risk: `staged.navigateTo` is not a stable function reference inside `useStagedForm`. If it changes on every render, the `useMemo` and `useEffect` would still re-fire every render (unchanged from current behaviour — no regression).
  Mitigation: Acceptable fallback. The logic remains correct; only performance is affected if this is the case.

- Risk: Overdue computation uses `new Date()` at render time. If the component re-renders at midnight, a task's overdue status could flip mid-session.
  Mitigation: This is the same behaviour as other overdue displays in the app. Not worth a timer refresh.

- Risk: `RETURN_SOURCE_LABEL` defined as a local constant inside `QuickTaskListCard` function body — recreated on every render.
  Mitigation: Move it to module scope (outside the component) to make it a singleton. Define above the component function.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all 4 files
- Manual test — auto-close: open Pre-orders with 1 pending task → assign working sections → save → slide must close automatically
- Manual test — card fields: task card with `return_source = "after_purchase"` and overdue `ready_by_at` must show "After purchase" sub-label and "Overdue" badge; seat item card must show `#N` quantity pill
- Manual test — icon: find or create an `internal` task and confirm it shows the wrench icon if it appears in the list
- Manual test — home box design: boxes show icon left + label + absolute pill counter in top-right corner with `bg-primary` styling
- Manual test — testids: verify `data-testid` attributes exist on card roots and home buttons via browser DevTools

## Review log

_(empty — plan not yet reviewed)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
