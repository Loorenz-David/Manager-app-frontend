# PLAN_tasks_view_scroll_fix_20260606

## Metadata

- Plan ID: `PLAN_tasks_view_scroll_fix_20260606`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-06T16:00:00Z`
- Last updated at (UTC): `2026-06-06T14:41:13Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Stop `TasksView`'s pull-to-refresh scroll container from shifting its top edge when the header collapses, eliminating the scroll-position disturbance that occurs on every compact/expand cycle.
- Business/user intent: When a user scrolls the task list, the header compresses to show more reading area. The current implementation animates `top` on the scroll container to follow the header height; because `top` is a layout property, every transition repositions the scroll container's top edge relative to the viewport, causing content to visibly jump.
- Non-goals: Changing `TasksHeader` collapse behaviour, changing the pull-to-refresh gesture, adding new animation logic.

## Scope

- In scope:
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TasksView.tsx` — remove the animated `top` position, fix the scroll container at `absolute inset-0`, and offset scroll content by the expanded header height.
- Out of scope:
  - `TasksHeader.tsx` — already uses `grid-template-rows` for GPU-safe collapse; no changes required.
  - `PullToRefresh.tsx` (package primitive) — API is sufficient; no changes required.
  - Any controller, provider, or query layer.
- Assumptions:
  - The expanded header height is 160 px (`top-40` = 10 rem). This matches the comment in the current source (`top-40 — expanded: type picker + search bar + pill filters (~160 px)`) and is a known constant — no runtime measurement is needed.
  - `useScrollVisibility({ mode: "relative" })` is the correct hook call for this page; the returned `isCompact` is still consumed by `TasksHeader`. Only the PullToRefresh position changes.
  - `scrollRef` is already passed as an external ref to `PullToRefresh`, so PullToRefresh does NOT auto-register its inner scroll element with any global scroll visibility provider. This behaviour is unchanged.

## Clarifications required

_(none — the change is fully bounded to `TasksView.tsx` with no ambiguous dependencies)_

## Acceptance criteria

1. `PullToRefresh` has a fixed, non-animated `className` of `"absolute inset-0"` with no `top-*` or `transition-[top]` utilities.
2. The three source constants `COMPACT_TOP`, `EXPANDED_TOP`, and `HEADER_TRANSITION` are deleted.
3. The first scroll-content wrapper inside `PullToRefresh` (`data-testid="tasks-list-scroll"`) carries `pt-40` so no task card is initially hidden behind the absolute header.
4. `isCompact` from `useScrollVisibility` is still passed to `TasksHeader` unchanged.
5. `npm run typecheck` reports zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/31_animations.md`: GPU-safe animation properties — only `transform` and `opacity` transitions on compositor thread; `top`, `margin`, `padding`, `height` are layout properties that must not be animated.
- `architecture/36_scroll_visibility.md`: how `useScrollVisibility` (local hook), `ScrollVisibilityContext`, and `useScrollVisibilityContext` are composed; when a scroll container is absolute vs. in-flow; fixed-padding offset pattern for floating headers.

### Local extensions loaded

_(none relevant to this change)_

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate

Permitted reads for this plan:
- `TasksView.tsx` — to understand the current position logic and children structure (relational: what exists).
- `TasksHeader.tsx` — to confirm expanded height and verify no changes are needed (relational: what exists).
- `PullToRefresh.tsx` — to confirm the `className` / `scrollClassName` / `scrollRef` API (relational: what exists).

Prohibited:
- Reading any unrelated component or hook to understand "how to write" animation or scroll behaviour — `31_animations.md` and `36_scroll_visibility.md` already define this.

### Skill selection

- Primary skill: UI/animation goal bundle (`31_animations.md`, `36_scroll_visibility.md`)
- Trigger terms: `transition-[top]`, `absolute inset-0`, scroll container top edge, floating header offset
- Excluded alternatives: none

## Implementation plan

### Step 1 — Remove the three position constants

In `TasksView.tsx`, delete the following three constant declarations at the top of the module (the comment block and all three `const` lines):

```
// top-[60px]  — compact: only the search bar is visible (~60 px)
// top-40      — expanded: type picker + search bar + pill filters (~160 px)
const COMPACT_TOP = "top-[60px]";
const EXPANDED_TOP = "top-40";
const HEADER_TRANSITION = "transition-[top] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]";
```

**Why:** These constants implement the `top` transition that disturbs the scroll container edge. Removing them eliminates the source of the layout animation.

### Step 2 — Fix the PullToRefresh container to `absolute inset-0`

Replace the `PullToRefresh` opening tag's `className` prop:

Before:
```tsx
<PullToRefresh
  className={cn(
    "absolute inset-x-0 bottom-0",
    HEADER_TRANSITION,
    isCompact ? COMPACT_TOP : EXPANDED_TOP,
  )}
```

After:
```tsx
<PullToRefresh
  className="absolute inset-0"
```

**Why:** `absolute inset-0` anchors the scroll container to all four edges of the parent, permanently. It no longer follows the header height. The header floats above the scroll container on `z-10`; the header's own `grid-template-rows` animation is compositor-safe and changes only the header's internal height, never the scroll container's edges.

Remove the `cn` import if it is no longer used elsewhere in the file after this change.

### Step 3 — Add expanded-header offset to scroll content

The PullToRefresh scroll container now starts at `top-0`, placing the content behind the absolute header unless we offset it. Add `pt-40` to the outermost content wrapper inside PullToRefresh:

Before:
```tsx
<div data-testid="tasks-list-scroll">
```

After:
```tsx
<div className="pt-40" data-testid="tasks-list-scroll">
```

**Why:** `pt-40` = 160 px = the expanded header height. This pushes all scroll content below the header on initial render. When the header collapses (60 px), the 160 px top padding in scroll coordinates ensures no content is hidden — the user sees a small gap above the first card which disappears once they scroll down. Because the scroll container never moves its top edge, there is no jump.

**Note on `pt-2`:** The inner `tasks-list` div currently has `pt-2` for a small top cushion between the header and the first card. Keep it in place; the combined effect is 160 + 8 = 168 px from the scroll container's top, which visually places the first card ~8 px below the header bottom edge.

### Step 4 — Verify `isCompact` and `useScrollVisibility` are unchanged

Confirm that `useScrollVisibility({ mode: "relative" })` is still called and `isCompact` is still passed to `TasksHeader`. The only variable consumed by `PullToRefresh` is now gone (no position logic), so the only remaining consumer of `isCompact` is `TasksHeader`. No changes to the hook call or props.

## Risks and mitigations

- Risk: `cn` import becomes unused after removing the `className={cn(...)}` call from PullToRefresh.
  Mitigation: Check whether `cn` is used elsewhere in `TasksView.tsx` after the edit. If not, remove the import. TypeScript / ESLint will catch this if missed.

- Risk: The 160 px fixed offset is derived from the visual design constant (`top-40`) in the source comment, not from a runtime measurement. If the expanded header height changes in the future, this constant must be updated manually.
  Mitigation: The offset is a single `pt-40` Tailwind class on one div. The source comment above the deleted constants documents the 160 px value. Document the same fact in the remaining code — but do not add a comment unless the value would surprise a future reader. Tailwind class `pt-40` is transparent in meaning.

- Risk: The gap between the compact header and the first task card (100 px of padding above the first item when the header is at 60 px) may appear as dead space if a user scrolls back to the very top while the header is still compact.
  Mitigation: This is an acceptable UX trade-off. `useScrollVisibility({ mode: "relative" })` will re-expand the header once the user scrolls upward past the threshold, so the gap is transient. The alternative — animating `paddingTop` — is also a layout property and causes the same class of problem.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual mobile test — task list page: scroll down → header compresses, scroll container does not jump; scroll up → header re-expands, list is still readable; pull to refresh gesture still functions.
- `npx playwright test --project=mobile`: existing task-list specs pass without regression.

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
