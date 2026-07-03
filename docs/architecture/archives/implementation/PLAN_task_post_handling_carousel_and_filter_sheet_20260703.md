# PLAN_task_post_handling_carousel_and_filter_sheet_20260703

## Metadata

- Plan ID: `PLAN_task_post_handling_carousel_and_filter_sheet_20260703`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T15:32:29Z`
- Related issue/ticket: —
- Intention plan: (inline — intention provided in conversation)

## Goal and intent

- Goal: Replace the multi-select post-handling filter pills with a two-tab carousel (pending left, filled right), add a filter sheet for the "completed" state accessed via a filter button on the search bar, and wire all three query modes (carousel, search, completed) into the controller.
- Business/user intent: Managers need a cleaner UX that defaults to "filled" tasks and lets them swipe between pending/filled without accidentally mixing states. The "completed" state is an optional advanced filter behind a sheet, keeping it out of the main flow.
- Non-goals: changing the `PostHandlingBottomAction` component; adding pagination to the filter sheet; altering the socket invalidation strategy.

## Scope

- In scope:
  - Rework `use-task-post-handling.controller.ts` — tab model, direction, three query modes
  - Rework `TaskPostHandlingHeader.tsx` — single-select pills, filter button
  - Rework `TaskPostHandlingSlidePage.tsx` — `AnimatePresence` carousel body + single-list fallback
  - New `TaskPostHandlingFilterSheetPage.tsx` — BoxPicker for completed filter
  - Update `surface-ids.ts` — new filter sheet surface ID + props; rename `defaultActiveStates → defaultTab`
  - Update `index.ts` — export new surface ID + load function
  - Update managers-app `surfaces.ts` — register filter sheet surface
  - Update managers-app `HomeView.tsx` — use `defaultTab` prop
- Out of scope: workers-app wiring (post-handling slide is managers-only), changing the pending warning sheet, altering real-time socket events.
- Assumptions:
  - `@beyo/ui` `BoxPicker` accepts generic value type and `mode="multiple"` is fine for a single-option on/off toggle (consistent with `UpholsteryProviderFilterSheetPage` pattern).
  - `useSurfaceStore.getState().open()` can be called from within the `@beyo/tasks` controller for the filter sheet (same cross-package pattern used by upholstery).
  - `AnimatePresence` and `m` are from `framer-motion` (used identically to `UpholsteryPickerSlidePage`).
  - `transitions.slide` from `@beyo/lib` is used for carousel animation (same as upholstery picker).

## Clarifications required

_(none — all behavior is fully specified in the intention)_

## Acceptance criteria

1. Entering the slide always shows exactly two pills: **pending** and **filled**. Only one can be active at a time.
2. Managers default to the **filled** tab; sellers default to **pending**.
3. Tapping a tab animates the body left/right like the upholstery carousel (Framer Motion `AnimatePresence` + `m.div` with `direction`-driven variants).
4. While the search bar has input, both pills are visually disabled and a combined `pending,filled` query is used; the body shows a flat list.
5. The search bar renders a filter button. Tapping it opens `TaskPostHandlingFilterSheetPage` as a bottom sheet.
6. Inside the filter sheet, a BoxPicker lets the user toggle the "completed" state on/off. Changing the selection immediately updates the parent page (via `onApply` callback).
7. When the completed filter is active: pills are disabled, the body shows completed tasks. If search is also active, the completed query includes `q`.
8. Deactivating the completed filter restores the carousel/search mode.
9. `npm run typecheck` reports zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo package boundaries, feature layering
- `architecture/02_types.md`: Zod schema discipline, `PostHandlingState` tuple
- `architecture/05_server_state.md`: `useInfiniteQuery` / `keepPreviousData` shape
- `architecture/08_hooks.md`: controller return shape, action hook pattern
- `architecture/15_feature_structure.md`: package file layout
- `architecture/28_surfaces.md`: surface registration, `useSurfaceProps`, sheet type
- `architecture/31_animations.md`: `AnimatePresence` + `m.div` carousel pattern
- `architecture/35_shared_packages.md §13`: `useSurfaceStore.getState().open()` from within a package
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` for new sheet

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types = `slide`, `sheet`, `modal` — `drawer` excluded
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` path = `@beyo/ui`

### File read intent — pattern vs. relational

Permitted reads taken during planning:
- `UpholsteryPickerSlidePage.tsx` — to confirm `AnimatePresence` + `m.div` + `bodyVariants` shape (relational: what exists)
- `use-upholstery-picker.controller.ts` — to confirm `direction` state and `FILTER_INDEXES` pattern (relational: what exists)
- `UpholsteryProviderFilterSheetPage.tsx` — to confirm BoxPicker + `onApply` callback pattern (relational: what exists)
- `upholstery/src/surfaces.ts` — to confirm `lazyWithPreload` registration pattern (relational: what exists)
- `packages/tasks/src/types.ts` — entity names, `POST_HANDLING_STATE`, `PostHandlingState` type, `TaskListItemRaw`, `ListTasksFullParams`
- `packages/tasks/src/surface-ids.ts` — existing surface IDs and `TaskPostHandlingSlideSurfaceProps` shape
- `packages/tasks/src/controllers/use-task-post-handling.controller.ts` — existing controller shape
- `apps/.../features/tasks/surfaces.ts` — existing managers-app surface registry
- `apps/.../features/home/components/HomeView.tsx` — `defaultActiveStates` call site

### Skill selection

- Primary skill: no dedicated skill required — this is a component + controller rework within `@beyo/tasks`
- Trigger terms: `animation`, `transition`, `AnimatePresence`, `surface`, `sheet`, `BoxPicker`
- Excluded alternatives: `code-review` — not applicable at plan stage

## Implementation plan

### Step 1 — Update `packages/tasks/src/surface-ids.ts`

Add:
```ts
export const TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID =
  "task-post-handling-filter-sheet";

export type TaskPostHandlingFilterSheetSurfaceProps = {
  isCompletedFilterActive: boolean;
  onApply: (completed: boolean) => void;
};
```

Change `TaskPostHandlingSlideSurfaceProps`:
```ts
// Before:
defaultActiveStates?: PostHandlingState[];

// After:
defaultTab?: "pending" | "filled";
```

### Step 2 — Rework `packages/tasks/src/controllers/use-task-post-handling.controller.ts`

**Input type change:**
```ts
type UseTaskPostHandlingControllerInput = {
  surfaceOpeners?: TaskPostHandlingSurfaceOpeners;
  initialTab?: "pending" | "filled";  // was initialActiveStates
};
```

**New state:**
```ts
const TAB_INDEXES: Record<"pending" | "filled", number> = { pending: 0, filled: 1 };

const [activeTab, setActiveTab] = useState<"pending" | "filled">(
  initialTab ?? "pending",
);
const previousTabIndexRef = useRef(TAB_INDEXES[initialTab ?? "pending"]);
const [direction, setDirection] = useState<1 | -1>(1);
const [completedFilterActive, setCompletedFilterActive] = useState(false);
// q, debouncedQ remain unchanged
```

**Derived state:**
```ts
const isSearchActive = debouncedQ.trim().length > 0;
const isPillsDisabled = isSearchActive || completedFilterActive;
const mode = completedFilterActive
  ? "completed"
  : isSearchActive
    ? "search"
    : "carousel";
```

**Queries — always mount both per-tab queries (cache prewarm + carousel data):**
```ts
const { query: pendingQueryRaw, loadMore: pendingLoadMore } =
  useListPostHandlingTasksQuery({ post_handling_states: "pending" });

const { query: filledQueryRaw, loadMore: filledLoadMore } =
  useListPostHandlingTasksQuery({ post_handling_states: "filled" });
```

**Conditional queries:**
```ts
const searchParams = useMemo(
  () => ({ post_handling_states: "pending,filled", q: debouncedQ }),
  [debouncedQ],
);
const { query: searchQueryRaw, loadMore: searchLoadMore } =
  useListPostHandlingTasksQuery(searchParams, {
    enabled: mode === "search",
  });

const completedParams = useMemo(
  () => ({
    post_handling_states: "completed",
    ...(debouncedQ ? { q: debouncedQ } : {}),
  }),
  [debouncedQ],
);
const { query: completedQueryRaw, loadMore: completedLoadMore } =
  useListPostHandlingTasksQuery(completedParams, {
    enabled: mode === "completed",
  });
```

> **Note on `useListPostHandlingTasksQuery` signature**: The existing hook does not accept an `options` second argument. Add an optional `options?: { enabled?: boolean }` parameter and thread it into `useInfiniteQuery`. This is a one-line change to `api/use-list-post-handling-tasks-query.ts`.

**Per-pane task arrays:**
```ts
const pendingTasks = useMemo(
  () => pendingQueryRaw.data?.pages.flatMap((p) => p.items) ?? [],
  [pendingQueryRaw.data],
);
const filledTasks = useMemo(
  () => filledQueryRaw.data?.pages.flatMap((p) => p.items) ?? [],
  [filledQueryRaw.data],
);
const singleTasks = useMemo(() => {
  if (mode === "search")
    return searchQueryRaw.data?.pages.flatMap((p) => p.items) ?? [];
  if (mode === "completed")
    return completedQueryRaw.data?.pages.flatMap((p) => p.items) ?? [];
  return [];
}, [mode, searchQueryRaw.data, completedQueryRaw.data]);
```

**`setTab` with direction:**
```ts
function setTab(tab: "pending" | "filled"): void {
  const nextIndex = TAB_INDEXES[tab];
  const previousIndex = previousTabIndexRef.current;
  if (nextIndex !== previousIndex) {
    setDirection(nextIndex > previousIndex ? 1 : -1);
    previousTabIndexRef.current = nextIndex;
  }
  setActiveTab(tab);
}
```

**`openFilterSheet`:**
```ts
function openFilterSheet(): void {
  useSurfaceStore.getState().open(
    TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID,
    {
      isCompletedFilterActive: completedFilterActive,
      onApply: setCompletedFilterActive,
    } satisfies TaskPostHandlingFilterSheetSurfaceProps,
  );
}
```

**`handleComplete` — check across both panes:**
```ts
const remainingActionable = [...pendingTasks, ...filledTasks].filter(
  (task) =>
    task.task.client_id !== taskId &&
    resolveActiveInstance(task.task.post_handling) !== null,
).length;
```

**`refetch`:**
```ts
async function refetch(): Promise<void> {
  if (mode === "search") await searchQueryRaw.refetch();
  else if (mode === "completed") await completedQueryRaw.refetch();
  else await Promise.all([pendingQueryRaw.refetch(), filledQueryRaw.refetch()]);
}
```

**`isBackgroundLoading`:**
```ts
const isBackgroundLoading =
  mode === "search"
    ? searchQueryRaw.isFetching && singleTasks.length > 0
    : mode === "completed"
      ? completedQueryRaw.isFetching && singleTasks.length > 0
      : (pendingQueryRaw.isFetching && pendingTasks.length > 0) ||
        (filledQueryRaw.isFetching && filledTasks.length > 0);
```

**Return shape:**
```ts
return {
  // Navigation
  activeTab,
  direction,
  setTab,
  // Filter
  completedFilterActive,
  openFilterSheet,
  completedFilterCount: completedFilterActive ? 1 : 0,
  // Search + pills
  q, setQ,
  isSearchActive,
  isPillsDisabled,
  // Mode
  mode,
  // Carousel panes
  pendingPane: {
    tasks: pendingTasks,
    hasMore: pendingQueryRaw.hasNextPage ?? false,
    loadMore: pendingLoadMore,
    isInitialLoading: pendingQueryRaw.isLoading && pendingTasks.length === 0,
    isFetchingMore: pendingQueryRaw.isFetchingNextPage,
  },
  filledPane: {
    tasks: filledTasks,
    hasMore: filledQueryRaw.hasNextPage ?? false,
    loadMore: filledLoadMore,
    isInitialLoading: filledQueryRaw.isLoading && filledTasks.length === 0,
    isFetchingMore: filledQueryRaw.isFetchingNextPage,
  },
  // Single-list (search / completed)
  singlePane: {
    tasks: singleTasks,
    hasMore:
      (mode === "search" ? searchQueryRaw.hasNextPage : completedQueryRaw.hasNextPage) ?? false,
    loadMore: mode === "search" ? searchLoadMore : completedLoadMore,
    isInitialLoading:
      mode === "search"
        ? searchQueryRaw.isLoading && singleTasks.length === 0
        : completedQueryRaw.isLoading && singleTasks.length === 0,
    isFetchingMore:
      mode === "search"
        ? searchQueryRaw.isFetchingNextPage
        : completedQueryRaw.isFetchingNextPage,
    isError:
      mode === "search" ? searchQueryRaw.isError : completedQueryRaw.isError,
  },
  // Shared
  isBackgroundLoading,
  refetch,
  // Actions
  completingTaskId,
  handleComplete,
  resolveActiveInstance,
  closeSurface: surfaceOpeners?.closeSurface,
  openTaskDetail,
  openTaskActions,
  openImageViewer,
  openPendingWarning,
};
```

### Step 3 — Update `packages/tasks/src/api/use-list-post-handling-tasks-query.ts`

Add optional `options?: { enabled?: boolean }` second argument and pass to `useInfiniteQuery`:
```ts
export function useListPostHandlingTasksQuery(
  params: Omit<ListTasksFullParams, "limit" | "offset">,
  options?: { enabled?: boolean },
) {
  const query = useInfiniteQuery({
    queryKey: taskKeys.list({ ...params, limit: PAGE_LIMIT }),
    queryFn: ({ pageParam }) => listTasks({ ...params, limit: PAGE_LIMIT, offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });

  return {
    query,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
  };
}
```

### Step 4 — Update `packages/tasks/src/components/TaskPostHandlingHeader.tsx`

**New props type:**
```ts
type TaskPostHandlingHeaderProps = {
  q: string;
  isLoading: boolean;
  activeTab: "pending" | "filled";
  stateCounts?: Partial<Record<"pending" | "filled", number>>;
  isPillsDisabled: boolean;
  completedFilterCount: number;      // 0 or 1 — drives filter badge
  onQChange: (value: string) => void;
  onTabChange: (tab: "pending" | "filled") => void;
  onFilterPress: () => void;
};
```

**Pill row changes:**
- Replace `POST_HANDLING_STATE.map(...)` with `(["pending", "filled"] as const).map(...)`
- Replace `activeStates.includes(state)` with `activeTab === state`
- Replace `onClick={() => onToggleState(state)}` with `onClick={() => onTabChange(state)}`
- Add `disabled={isPillsDisabled}` on each `<button>`; visually: when disabled apply `opacity-50 cursor-not-allowed` via `cn()`

**SearchBar change:**
```tsx
<SearchBar
  ...
  showFilterButton={true}
  filterActiveCount={completedFilterCount}
  onFilterPress={onFilterPress}
/>
```

### Step 5 — Create `packages/tasks/src/pages/TaskPostHandlingFilterSheetPage.tsx` (NEW)

Pattern mirrors `UpholsteryProviderFilterSheetPage`.

```tsx
import { useEffect, useMemo, useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, useSurfaceStore } from "@beyo/ui";
import {
  TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID,
  type TaskPostHandlingFilterSheetSurfaceProps,
} from "../surface-ids";

const COMPLETED_OPTION = [
  {
    value: "completed" as const,
    label: "Completed",
    description: "Show completed post-handling tasks.",
  },
];

export function TaskPostHandlingFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { isCompletedFilterActive, onApply } =
    useSurfaceProps<TaskPostHandlingFilterSheetSurfaceProps>();

  const initialValue = useMemo(
    () => (isCompletedFilterActive ? (["completed"] as const) : []),
    [isCompletedFilterActive],
  );
  const [value, setValue] = useState<"completed"[]>(initialValue);

  useEffect(() => {
    header?.setTitle("Post-handling filter");
    header?.setActions(null);
  }, [header]);

  function handleChange(next: "completed"[]): void {
    setValue(next);
    onApply?.(next.includes("completed"));
  }

  return (
    <div
      className="flex flex-col px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="task-post-handling-filter-sheet"
    >
      <BoxPicker
        columns={1}
        data-testid="task-post-handling-filter-options"
        layout="grid"
        mode="multiple"
        options={COMPLETED_OPTION}
        showDescription={false}
        value={value}
        onValueChange={handleChange}
      />

      <div aria-hidden="true" className="h-16 shrink-0" />

      <button
        className="rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-card"
        type="button"
        onClick={() =>
          useSurfaceStore
            .getState()
            .close(TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID)
        }
      >
        Done
      </button>
    </div>
  );
}
```

### Step 6 — Rework `packages/tasks/src/pages/TaskPostHandlingSlidePage.tsx`

Remove top-level prewarm hooks (both queries now live in the controller).

**Update `TaskPostHandlingHeader` call site:**
```tsx
<TaskPostHandlingHeader
  activeTab={controller.activeTab}
  completedFilterCount={controller.completedFilterCount}
  isLoading={controller.isBackgroundLoading}
  isPillsDisabled={controller.isPillsDisabled}
  q={controller.q}
  stateCounts={countsQuery.data}
  onFilterPress={controller.openFilterSheet}
  onQChange={controller.setQ}
  onTabChange={controller.setTab}
/>
```

**Update `useSurfaceProps` call site:**
```tsx
const props = useSurfaceProps<TaskPostHandlingSlideSurfaceProps>();
const controller = useTaskPostHandlingController({
  surfaceOpeners: props.surfaceOpeners,
  initialTab: props.defaultTab,         // was defaultActiveStates
});
```

**Body carousel and single-list:**

Add shared Framer Motion variants (copy from `UpholsteryPickerSlidePage`):
```ts
const bodyVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: transitions.slide,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: transitions.slide,
  }),
} as const;
```

Body section (replace existing single-list content):
```tsx
<PullToRefresh ...>
  <div className={CONTENT_TOP_OFFSET_CLASS} data-testid="task-post-handling-scroll">
    {controller.mode === "carousel" ? (
      // Two-pane animated carousel
      <div className="relative flex min-h-[calc(100dvh-9rem)]">
        <AnimatePresence custom={controller.direction} initial={false} mode="sync">
          <m.div
            key={controller.activeTab}
            animate="center"
            className="absolute inset-0 flex flex-col gap-3 px-0 py-2 pb-[calc(var(--safe-bottom,0)+6.5rem)]"
            custom={controller.direction}
            data-testid={`task-post-handling-pane-${controller.activeTab}`}
            exit="exit"
            initial="enter"
            variants={bodyVariants}
          >
            <TaskListContent
              pane={
                controller.activeTab === "pending"
                  ? controller.pendingPane
                  : controller.filledPane
              }
              controller={controller}
            />
          </m.div>
        </AnimatePresence>
      </div>
    ) : (
      // Single flat list for search and completed modes
      <div className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+6.5rem)] pt-2">
        <TaskListContent
          pane={controller.singlePane}
          controller={controller}
        />
      </div>
    )}
  </div>
</PullToRefresh>
```

Extract a local `TaskListContent` helper component (file-local, not exported) that receives `pane` and `controller` and renders:
- Skeleton when `pane.isInitialLoading`
- Error state when `pane.isError`
- Empty state when `pane.tasks.length === 0`
- `TaskListCard` list mapped from `pane.tasks`
- Load-more / end-of-list footer

This eliminates the repeated card-rendering logic that would otherwise appear in both carousel and single-list paths.

### Step 7 — Update `packages/tasks/src/index.ts`

Add:
```ts
export {
  TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  TaskPostHandlingFilterSheetSurfaceProps,
} from "./surface-ids";

export function loadTaskPostHandlingFilterSheetPage() {
  return import("./pages/TaskPostHandlingFilterSheetPage").then((m) => ({
    default: m.TaskPostHandlingFilterSheetPage,
  }));
}
```

### Step 8 — Update `apps/managers-app/.../features/tasks/surfaces.ts`

Import:
```ts
import {
  TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID,
  loadTaskPostHandlingFilterSheetPage,
  type TaskPostHandlingFilterSheetSurfaceProps,
} from "@beyo/tasks";
```

Register:
```ts
const taskPostHandlingFilterSheet = lazyWithPreload(
  loadTaskPostHandlingFilterSheetPage,
);

// in taskSurfaces:
[TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: taskPostHandlingFilterSheet.Component,
},
```

Export the type from the re-export block if needed by other consumers.

### Step 9 — Update `apps/managers-app/.../features/home/components/HomeView.tsx`

Change `openTaskPostHandlingSurface`:
```ts
// Before:
defaultActiveStates: isSeller
  ? ["pending"]
  : isManager
    ? ["filled"]
    : ["pending", "filled"],

// After:
defaultTab: isSeller ? "pending" : "filled",
```

## Risks and mitigations

- Risk: `useListPostHandlingTasksQuery` called 4 times in controller (pending, filled, search, completed) — TanStack Query deduplicates by key; disabled queries don't fire. No performance risk.
  Mitigation: `enabled` flag on search and completed queries ensures they are dormant until needed.

- Risk: `handleComplete`'s "close surface if no remaining actionable" logic checked across both panes. In search/completed mode, `pendingTasks` and `filledTasks` may be stale.
  Mitigation: `handleComplete` is only reachable when an active (`pending` or `filled`) instance exists, which only occurs in carousel or search mode (completed instances have no bottom action). The combined `[...pendingTasks, ...filledTasks]` check is always correct for those modes.

- Risk: Carousel animation in `AnimatePresence mode="sync"` requires the exiting and entering `m.div` to share the same parent layout. The `relative flex min-h-[calc(100dvh-9rem)]` container (same as upholstery picker) guarantees this.
  Mitigation: Verified by reading `UpholsteryPickerSlidePage` — identical structure.

- Risk: `BoxPicker` type inference for `"completed"[]` — `mode="multiple"` with a typed options array should infer correctly. If not, explicit generic `<BoxPicker<"completed">>` resolves it.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test on managers-app:
  - Open post-handling slide → defaults to "filled" tab for manager role
  - Tap "pending" pill → carousel animates right-to-left
  - Tap "filled" pill → carousel animates left-to-right
  - Type in search bar → pills disable, body shows combined pending+filled list
  - Clear search → carousel restores
  - Tap filter button → filter sheet opens
  - Toggle "Completed" in filter sheet → completed tasks shown, pills disabled
  - Untoggle → carousel restores
  - Type search while completed filter active → completed tasks with q applied

## Review log

_(empty at plan creation)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
