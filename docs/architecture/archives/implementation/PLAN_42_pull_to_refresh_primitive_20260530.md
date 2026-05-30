# PLAN_42_pull_to_refresh_primitive_20260530

## Metadata

- Plan ID: `PLAN_42_pull_to_refresh_primitive_20260530`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-05-30T14:00:00Z`
- Last updated at (UTC): `2026-05-30T12:28:34Z`
- Related issue/ticket: `—`
- Intention plan: `—`

---

## Goal and intent

- **Goal:** Build a `PullToRefresh` primitive in `@beyo/ui` and wire it into every scrollable list view in the app, enabling users to manually trigger a targeted data reload by pulling down on any list.
- **Business/user intent:** The apps are PWAs with zoom disabled for better mobile UX. The browser's native reload (pull-to-refresh on Chrome Android) is a full-page reload, which is destructive. This gives users a standard mobile gesture that refetches only the queries relevant to the current view.
- **Non-goals:**
  - Real-time data streaming (WebSocket). PTR is a manual refresh only.
  - Adding PTR to detail surfaces that are not scrollable lists (e.g. conversation messages — those have infinite scroll, PTR would conflict).
  - Infinite scroll integration (load-more is handled separately in `TasksView`).

---

## Scope

- **In scope:**
  - New `PullToRefresh` primitive in `packages/ui` using `@use-gesture/react` + Framer Motion.
  - `@use-gesture/react` added as `peerDependency` to `packages/ui`.
  - `refetch` method added to 5 controllers (one package-level, four app-level).
  - PTR wired into 5 views:
    1. `CasesView` (`packages/cases`) — list query + unread counts
    2. `TasksView` (`apps/managers-app`) — tasks infinite query
    3. `WorkingSectionStepsView` (`apps/workers-app`) — steps query
    4. `WorkingSectionsHomeView` (`apps/workers-app`) — sections query
    5. `TaskDetailSlidePage` (`apps/workers-app`) — step detail + cases + unread counts

- **Out of scope:**
  - Wiring PTR to case conversation messages (`useCaseConversationMessagesQuery`). It already has `staleTime: 0` and refetches on mount; PTR would conflict with the infinite scroll gesture.
  - Mouse-drag PTR. This is touch-only (`pointer: { touch: true }` in `@use-gesture/react`).
  - Custom theming or per-view indicator styling. One spinner design for all uses.

- **Assumptions:**
  - `@use-gesture/react ^10.3.1` is already installed in both apps. It is added to `packages/ui` only as a `peerDependency` — no `npm install` needed; apps already satisfy it.
  - All target views live inside a `flex flex-col` outer container, so `className="flex-1"` on the `PullToRefresh` wrapper correctly fills available vertical space.
  - `useWorkingSectionsHomeContext()`, `useWorkingSectionStepsContext()`, and `useTaskStepDetailContext()` expose the full controller return type — no provider changes are needed for any workers-app view; adding fields to the controller type automatically makes them available via context.
  - `useCasesViewContext()` exposes the full `CasesViewController` — same pattern.
  - TanStack Query v5's `.refetch()` returns `Promise<QueryObserverResult<...>>`. The controllers wrap it in `async () => { await ... }` to return `Promise<void>`.

---

## Clarifications required

_(none — all design decisions are resolved in this plan)_

---

## Acceptance criteria

1. Pulling down on any wired list view shows a spinner indicator, holds at the spinner position while loading, then snaps back when done.
2. The gesture does NOT activate when the scroll container is not at `scrollTop === 0`.
3. The gesture does NOT conflict with `@dnd-kit` drag-and-drop (activates only at scroll top on a downward touch swipe).
4. The gesture does NOT interfere with long-press buttons (PTR requires sustained downward movement; stationary touches are filtered by `filterTaps: true`).
5. The browser's native pull-to-refresh / overscroll bounce is suppressed on the scroll container via `overscroll-behavior: none`.
6. `npm run typecheck` passes with zero errors.
7. All five views refresh correctly on gesture release past threshold.

---

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo structure, app/package boundaries
- `architecture/07_components.md`: component patterns for UI primitives
- `architecture/08_hooks.md`: controller return type conventions
- `architecture/15_feature_structure.md`: feature build order
- `architecture/31_animations.md`: Framer Motion usage (`m`, `useMotionValue`, `useTransform`, `animate`)
- `architecture/35_shared_packages.md`: package creation, `peerDependencies`, `@source` directives, `index.ts` barrel

### Local extensions loaded

- `architecture/28_surfaces_local.md`: surface types (not directly relevant but confirms sheet/slide patterns)

### File read intent — pattern vs. relational

Permitted relational reads required before implementation:
- `packages/ui/package.json` — existing `peerDependencies` (verified: `@use-gesture/react` is NOT yet listed; add it)
- `packages/ui/src/index.ts` — export order for new barrel line
- `packages/cases/src/controllers/use-cases-view.controller.ts` — what queries exist (`listQuery`, `unreadCountsQuery`); controller return shape
- `apps/managers-app/.../tasks/flows/use-tasks-page.flow.ts` — `TasksPageFlow` type; what the `query` variable is
- `apps/workers-app/.../task_steps/controllers/use-working-section-steps.controller.ts` — `query` variable; return type
- `apps/workers-app/.../working_sections/controllers/use-working-sections-home.controller.ts` — `query` variable; return type
- `apps/workers-app/.../task_steps/controllers/use-task-step-detail.controller.ts` — all queries (`query`, `taskCasesQuery`, `taskUnreadCountsQuery`)
- `packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts` — `scrollRef` type (`React.RefObject<HTMLDivElement | null>`) for compatibility check with `PullToRefresh`'s `scrollRef` prop

Prohibited pattern reads (contract covers these):
- Reading another primitive component to understand how to write this one → `07_components.md`
- Reading another `useMotionValue` hook to understand Framer Motion setup → `31_animations.md`

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`
- Trigger terms: `new primitive`, `package`, `gesture`

---

## Implementation plan

### Step 1 — Add `@use-gesture/react` to `packages/ui` peerDependencies

**File:** `packages/ui/package.json`

Add to `peerDependencies`:
```json
"@use-gesture/react": ">=10.0.0"
```

No `npm install` needed. Both apps already have `@use-gesture/react ^10.3.1` installed.

---

### Step 2 — Create `PullToRefresh` primitive

**File (new):** `packages/ui/src/components/primitives/pull-to-refresh/PullToRefresh.tsx`

```tsx
import { useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { animate, m, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@beyo/lib";

const THRESHOLD = 80;
const INDICATOR_HEIGHT = 56;
const RESISTANCE = 0.4;

export type PullToRefreshProps = {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
  scrollClassName?: string;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
};

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  scrollClassName,
  className,
  scrollRef: externalScrollRef,
}: PullToRefreshProps): React.JSX.Element {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const activeRef = externalScrollRef ?? internalScrollRef;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullY = useMotionValue(0);

  // Indicator fades in as content pulls down, revealing the space above
  const indicatorOpacity = useTransform(
    pullY,
    [0, INDICATOR_HEIGHT * 0.5],
    [0, 1],
    { clamp: true },
  );
  const indicatorScale = useTransform(pullY, [0, INDICATOR_HEIGHT], [0.5, 1], {
    clamp: true,
  });
  // Pre-spin spinner to show pull progress before release
  const spinAngle = useTransform(pullY, [0, THRESHOLD], [0, 270]);

  const bind = useDrag(
    ({ active, movement: [, my], first, cancel }) => {
      if (disabled || isRefreshing) {
        cancel();
        return;
      }

      // Gate 1: only activate when scroll container is at the very top
      if (first && (activeRef.current?.scrollTop ?? 0) > 0) {
        cancel();
        return;
      }

      // Gate 2: only measure downward pulls
      if (my < 0) {
        cancel();
        return;
      }

      if (active) {
        // Elastic resistance reduces pull distance
        pullY.set(Math.min(my * RESISTANCE, THRESHOLD * 1.5));
      } else {
        // Released: check if past threshold
        const currentY = pullY.get();
        if (currentY >= THRESHOLD) {
          setIsRefreshing(true);
          void animate(pullY, INDICATOR_HEIGHT, {
            duration: 0.15,
            ease: "easeOut",
          });
          void Promise.resolve(onRefresh()).finally(() => {
            setIsRefreshing(false);
            void animate(pullY, 0, {
              type: "spring",
              stiffness: 300,
              damping: 30,
            });
          });
        } else {
          void animate(pullY, 0, {
            type: "spring",
            stiffness: 300,
            damping: 30,
          });
        }
      }
    },
    {
      axis: "y",
      filterTaps: true,
      pointer: { touch: true },
    },
  );

  return (
    <div
      {...bind()}
      className={cn("relative overflow-hidden", className)}
      data-testid="pull-to-refresh"
    >
      {/* Indicator: absolutely positioned at top; revealed as content shifts down */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
        style={{
          height: INDICATOR_HEIGHT,
          opacity: indicatorOpacity,
          scale: indicatorScale,
        }}
      >
        <m.div
          className="size-5 rounded-full border-2 border-muted-foreground/25 border-t-foreground"
          style={{ rotate: isRefreshing ? undefined : spinAngle }}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={
            isRefreshing
              ? { repeat: Infinity, duration: 0.7, ease: "linear" }
              : undefined
          }
          data-testid="pull-to-refresh-indicator"
        />
      </m.div>

      {/* Scroll container: shifts down to reveal indicator above */}
      <m.div
        ref={activeRef}
        className={scrollClassName}
        style={{ y: pullY }}
      >
        {children}
      </m.div>
    </div>
  );
}
```

**Visual mechanic:**
- The outer `div` is `relative overflow-hidden`. Its height is set by the consumer via `className`.
- The indicator is `position: absolute` at the top of the outer container — it is always there but hidden (opacity=0) at rest.
- The content (`m.div`) shifts down as the user pulls, revealing the space above where the indicator sits.
- `overflow-hidden` on the outer clips the bottom of the content when it shifts down.

**Conflict avoidance:**
- `pointer: { touch: true }`: the gesture is touch-only. Mouse-based `@dnd-kit` events do not trigger it.
- `filterTaps: true`: stationary long presses are not interpreted as pulls.
- Gate 1 (`scrollTop > 0`): if the scroll container is not at the top, `cancel()` is called on the first frame. The browser handles normal scroll.
- `overscroll-behavior: none` on the scroll container (applied via `scrollClassName` by the consumer — see each view's wiring step below) prevents the browser's native PTR bubble/bounce effect.

---

### Step 3 — Create barrel for the primitive

**File (new):** `packages/ui/src/components/primitives/pull-to-refresh/index.ts`

```ts
export { PullToRefresh } from "./PullToRefresh";
export type { PullToRefreshProps } from "./PullToRefresh";
```

---

### Step 4 — Export from `packages/ui/src/index.ts`

**File:** `packages/ui/src/index.ts`

Add after the `phone-input` export line and before `scroll-visibility`:

```ts
export * from "./components/primitives/pull-to-refresh";
```

The resulting export block (surrounding context):
```ts
export * from "./components/primitives/phone-input";
export * from "./components/primitives/pull-to-refresh";   // ADD THIS
export * from "./components/primitives/scroll-visibility";
```

---

### Step 5 — Cases package: add `refetch` to controller and wire `CasesView`

#### 5a. `packages/cases/src/controllers/use-cases-view.controller.ts`

**Add `refetch` to the `CasesViewController` type:**
```ts
export type CasesViewController = {
  newGroup: CasesGroup;
  activeGroup: CasesGroup;
  resolvingGroup: CasesGroup;
  resolvedGroup: CasesGroup;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  openCase: (caseClientId: CaseId) => void;
  openFilters: () => void;
  activeFilterCount: number;
  unreadCounts: Record<string, number>;
  typingByCaseId: Record<string, string>;
  refetch: () => Promise<void>;              // ADD
};
```

**Add the `refetch` implementation inside `useCasesViewController`** (after the `openFilters` function, before the `return`):
```ts
async function refetch(): Promise<void> {
  await Promise.all([listQuery.refetch(), unreadCountsQuery.refetch()]);
}
```

**Add `refetch` to the return object:**
```ts
return {
  // ... existing fields ...
  refetch,
};
```

#### 5b. `packages/cases/src/components/CasesView.tsx`

Add `useRef` import and `PullToRefresh` import:
```ts
import { useRef } from "react";
import { PullToRefresh, SearchBar } from "@beyo/ui";
```

Add `scrollRef` inside `CasesView`:
```ts
const scrollRef = useRef<HTMLDivElement>(null);
```

Replace the existing scroll `div`:
```tsx
// BEFORE:
<div className="flex-1 overflow-y-auto px-4 pb-[calc(var(--safe-bottom,0)+5rem)] pt-4">
  <div className="flex flex-col gap-6">
    {/* groups */}
  </div>
</div>

// AFTER:
<PullToRefresh
  className="flex-1"
  scrollClassName="overflow-y-auto overscroll-y-none px-4 pb-[calc(var(--safe-bottom,0)+5rem)] pt-4"
  scrollRef={scrollRef}
  onRefresh={controller.refetch}
>
  <div className="flex flex-col gap-6">
    {/* groups — unchanged */}
  </div>
</PullToRefresh>
```

Note: `overscroll-y-none` (Tailwind) sets `overscroll-behavior-y: none` on the scroll container to suppress the browser's native PTR/bounce.

---

### Step 6 — Managers app `TasksView`: add `refetch` to flow and wire view

#### 6a. `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-tasks-page.flow.ts`

**Add `refetch` to `TasksPageFlow` type:**
```ts
export type TasksPageFlow = {
  cards: TaskCardViewModel[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;     // ADD
};
```

**In `useTasksPageFlow`, after `const { query, loadMore } = useListTasksQuery(params)`, add:**
```ts
async function refetch(): Promise<void> {
  await query.refetch();
}
```

**Add `refetch` to the return object:**
```ts
return {
  cards,
  isLoading: query.isLoading,
  isFetchingMore: query.isFetchingNextPage,
  hasMore: query.hasNextPage ?? false,
  loadMore,
  refetch,        // ADD
};
```

#### 6b. `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TasksView.tsx`

Add `PullToRefresh` import:
```ts
import { PullToRefresh } from "@beyo/ui";
```

Replace the inner scroll `div` (the one with `ref={scrollRef}`):
```tsx
// BEFORE:
<div
  ref={scrollRef}
  className="relative flex-1 overflow-x-hidden overflow-y-auto"
  data-testid="tasks-list-scroll"
>
  {/* content */}
</div>

// AFTER:
<PullToRefresh
  className="flex-1"
  scrollClassName="relative overflow-x-hidden overflow-y-auto overscroll-y-none"
  scrollRef={scrollRef}
  onRefresh={controller.refetch}
>
  <div data-testid="tasks-list-scroll">
    {/* content — unchanged */}
  </div>
</PullToRefresh>
```

Important: `scrollRef` is already declared in `TasksView` (`const scrollRef = useRef<HTMLDivElement>(null)`) and is used by the existing `useEffect` that listens for scroll to toggle `isCompact` / `isScrolled`. Passing `scrollRef` to `PullToRefresh` attaches it to the `m.div` scroll container, so the existing `useEffect` continues to work correctly.

The `data-testid="tasks-list-scroll"` moves from the `div` with `ref={scrollRef}` to the inner wrapper since the scroll container is now the `m.div` created by `PullToRefresh`. If any test selects by `tasks-list-scroll`, it now selects the inner wrapper div instead of the scroll div — verify selector intent is preserved.

---

### Step 7 — Workers app `WorkingSectionStepsView`: add `refetch` to controller and wire view

#### 7a. `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-working-section-steps.controller.ts`

**Add `refetch` to `WorkingSectionStepsController` type:**
```ts
export type WorkingSectionStepsController = {
  steps: TaskStepCardViewModel[];
  nonTerminalCounts: NonTerminalStepCounts;
  isPending: boolean;
  isError: boolean;
  hasMore: boolean;
  search: string;
  setSearch: (value: string) => void;
  refetch: () => Promise<void>;    // ADD
  handleTransition: (...) => void;
  handleOpenTaskActions: (...) => void;
  handleOpenTaskDetail: (...) => void;
  handleOpenImageViewer: (...) => void;
  isTransitioning: boolean;
  transitioningStepId: TaskStepId | null;
};
```

**In `useWorkingSectionStepsController`, after `const query = useWorkingSectionStepsQuery(...)`, add:**
```ts
async function refetch(): Promise<void> {
  await query.refetch();
}
```

**Add to return object:**
```ts
return {
  // ... existing fields ...
  refetch,
};
```

#### 7b. `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/WorkingSectionStepsView.tsx`

Add imports:
```ts
import { useRef } from "react";
import { PullToRefresh } from "@beyo/ui";  // add to existing @beyo/ui imports
```

Add `refetch` to destructured context and add `scrollRef`:
```ts
const {
  steps,
  nonTerminalCounts,
  isPending,
  isError,
  search,
  setSearch,
  refetch,                  // ADD
  handleTransition,
  handleOpenTaskActions,
  handleOpenTaskDetail,
  handleOpenImageViewer,
  transitioningStepId,
} = useWorkingSectionStepsContext();

const scrollRef = useRef<HTMLDivElement>(null);  // ADD
```

Replace the scroll `div`:
```tsx
// BEFORE:
<div className="flex-1 overflow-y-auto">
  {/* content */}
</div>

// AFTER:
<PullToRefresh
  className="flex-1"
  scrollClassName="overflow-y-auto overscroll-y-none"
  scrollRef={scrollRef}
  onRefresh={refetch}
>
  {/* content — unchanged */}
</PullToRefresh>
```

---

### Step 8 — Workers app `WorkingSectionsHomeView`: add `refetch` to controller and wire view

#### 8a. `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/controllers/use-working-sections-home.controller.ts`

**Add `refetch` to `WorkingSectionsHomeController` type:**
```ts
export type WorkingSectionsHomeController = {
  sections: WorkingSectionViewModel[];
  isPending: boolean;
  isError: boolean;
  refetch: () => Promise<void>;    // ADD
};
```

**In `useWorkingSectionsHomeController`, after `const query = useWorkerWorkingSectionsQuery()`, add:**
```ts
async function refetch(): Promise<void> {
  await query.refetch();
}
```

**Add to return:**
```ts
return {
  sections,
  isPending: query.isPending,
  isError: query.isError,
  refetch,    // ADD
};
```

#### 8b. `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/components/WorkingSectionsHomeView.tsx`

Add imports:
```ts
import { useRef } from "react";
import { PullToRefresh } from "@beyo/ui";  // add
```

Add `refetch` to destructured context and `scrollRef`:
```ts
const { sections, isPending, isError, refetch } = useWorkingSectionsHomeContext();
const scrollRef = useRef<HTMLDivElement>(null);
```

Replace the scroll `div`:
```tsx
// BEFORE:
<div className="flex-1 overflow-y-auto">
  {/* content */}
</div>

// AFTER:
<PullToRefresh
  className="flex-1"
  scrollClassName="overflow-y-auto overscroll-y-none"
  scrollRef={scrollRef}
  onRefresh={refetch}
>
  {/* content — unchanged */}
</PullToRefresh>
```

---

### Step 9 — Workers app `TaskDetailSlidePage`: add `refetch` to controller and wire page

#### 9a. `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

**Add `refetch` to `TaskStepDetailController` type** (add after `transitioningStepId`):
```ts
export type TaskStepDetailController = {
  // ... existing fields ...
  transitioningStepId: TaskStepId | null;
  refetch: () => Promise<void>;    // ADD
};
```

**In `useTaskStepDetailController`, add after the queries are declared** (after `taskUnreadCountsQuery`):
```ts
async function refetch(): Promise<void> {
  await Promise.all([
    query.refetch(),
    taskCasesQuery.refetch(),
    taskUnreadCountsQuery.refetch(),
  ]);
}
```

**Add to return object:**
```ts
return {
  // ... existing fields ...
  transitioningStepId: pendingStepId ?? null,
  refetch,    // ADD
};
```

#### 9b. `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`

Add `PullToRefresh` to the `@beyo/ui` import:
```ts
import { ContentCard, PullToRefresh, useScrollVisibility } from "@beyo/ui";
```

In `TaskDetailSlidePageContent`, `scrollRef` already comes from `useScrollVisibility()`. Pass it to `PullToRefresh`:
```tsx
// BEFORE:
<div
  ref={scrollRef}
  className="flex-1 overflow-y-auto pb-[calc(var(--safe-bottom,0)+5.5rem)]"
  data-testid="task-detail-slide-page"
>
  {/* content */}
</div>

// AFTER:
<PullToRefresh
  className="flex-1"
  scrollClassName="overflow-y-auto overscroll-y-none pb-[calc(var(--safe-bottom,0)+5.5rem)]"
  scrollRef={scrollRef}
  onRefresh={controller.refetch}
>
  <div data-testid="task-detail-slide-page">
    {/* content — unchanged */}
  </div>
</PullToRefresh>
```

**How `scrollRef` compatibility works:** `useScrollVisibility` creates `const scrollRef = useRef<HTMLDivElement>(null)` and attaches a `scroll` event listener to `scrollRef.current` in a `useEffect`. `PullToRefresh` accepts `scrollRef?: React.RefObject<HTMLDivElement | null>` and attaches it to the inner `m.div` scroll container. When the component mounts:
1. React mounts — `m.div` is created and `scrollRef.current` is set.
2. `useScrollVisibility`'s `useEffect` fires — finds `scrollRef.current` and attaches the scroll listener.

Both `PullToRefresh`'s scroll position check and `useScrollVisibility`'s listener use the same element. No conflicts.

---

## Risks and mitigations

- **Risk:** `touchAction` conflict between `useDrag` and `@dnd-kit` when a draggable item is at the top of a scrollable list.
  **Mitigation:** Gate 1 (`scrollTop > 0`) and `filterTaps: true` prevent unintended PTR. `pointer: { touch: true }` means PTR doesn't react to mouse-based DnD. Touch-based `@dnd-kit` drag activates after a distance/delay constraint — by that time, the initial gesture direction is already established. In practice, DnD items are mid-list and the user is not at `scrollTop === 0` when dragging. If a future conflict is reported, add a `disabled` prop driven by `useDndContext().active !== null` in the consuming view.

- **Risk:** `m.div` as scroll container causes layout regressions in views with sticky children or `position: absolute` elements inside the scroll area.
  **Mitigation:** Framer Motion's `m.div` is a regular `div` with CSS transform applied. `overflow-y: auto` on the `m.div` creates a scroll container as normal. Absolutely positioned children are positioned relative to the nearest positioned ancestor, which is the outer `PullToRefresh` wrapper (already `position: relative`). Verify visually in the workers app that the `TaskDetailSlidePage`'s fixed bottom action button (`absolute inset-x-0 bottom-0`) still renders correctly — it is sibling to the `PullToRefresh`, not inside it, so it is unaffected.

- **Risk:** `overscroll-y-none` applied via `scrollClassName` prevents native scroll momentum on iOS (momentum scrolling under `overscroll-behavior: none`).
  **Mitigation:** `overscroll-behavior: none` affects the bounce/PTR behavior, NOT `-webkit-overflow-scrolling: touch` (momentum scroll). Momentum scroll is controlled by `overflow-y: auto` + `-webkit-overflow-scrolling: touch`. These are independent. iOS Safari respects both without conflict.

- **Risk:** The Framer Motion `animate()` function import is not available from the `framer-motion` version.
  **Mitigation:** `animate()` has been available as a standalone function since Framer Motion v6. The apps use `^12.x`. Safe to use.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all packages and apps.
- Manual device test (iPhone/Android PWA):
  - `CasesView`: pull down → spinner appears → release → network request fires → spinner snaps back.
  - `TasksView`: pull down → scroll compact header is NOT toggled → spinner → request fires → snap back.
  - `WorkingSectionStepsView`: at scroll top, pull → works. At mid-scroll, pull → does NOT trigger PTR.
  - `WorkingSectionsHomeView`: pull → works.
  - `TaskDetailSlidePage`: pull → steps query + cases query refetch. The fixed bottom "Complete task" button remains correctly positioned after the PTR snap-back animation.
- DnD regression check: in `TasksView` or any DnD surface, drag-and-drop of a card at the top of the list should not accidentally trigger PTR.

---

## Review log

_(empty — awaiting implementation)_

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `copilot`
