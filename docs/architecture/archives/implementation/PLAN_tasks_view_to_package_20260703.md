# PLAN_tasks_view_to_package_20260703

## Metadata

- Plan ID: `PLAN_tasks_view_to_package_20260703`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T16:28:43Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/task_post_handling.txt`

## Goal and intent

- Goal: Move the TasksPage view tree (TasksView + TasksViewProvider + TasksHeader + controller + flow + route-entry) from the managers-app local feature into `@beyo/tasks`, and simultaneously eliminate the redundant Zustand server-state stores, replacing them with data derived directly from the TanStack Query cache.
- Business/user intent: Establish the correct migration pattern — move code directly to the package, adjust imports for package context, consume from package immediately. In the same pass, fix the architectural anti-pattern where the `queryFn` wrote server data into Zustand stores as a side effect, maintaining a shadow copy of TanStack's cache.
- Non-goals: Moving task detail, task actions, task edit, or any other task surface pages. Cleaning up the managers app `types.ts` duplicate definitions. Moving action hooks other than `use-create-task` (which is updated in-place to remove store writes).

## Scope

- In scope:
  - Add `TaskTypeFilter`, `TaskViewModel`, `TaskCardViewModel`, `toTaskViewModel`, `TASK_STATE_FILTER_OPTIONS`, `TASK_TYPE_PICKER_OPTIONS` to `packages/tasks/src/types.ts`
  - Add `TASK_DETAIL_SURFACE_ID`, `TASK_ACTIONS_SHEET_SURFACE_ID`, `TASK_FILTER_SHEET_SURFACE_ID`, `TaskDetailSurfaceProps`, `TaskActionsSurfaceProps` to `packages/tasks/src/surface-ids.ts`
  - Create `packages/tasks/src/store/tasks-page.store.ts` (UI filter state — legitimately client state, kept in Zustand)
  - Create `packages/tasks/src/api/use-list-tasks-query.ts` — pure TanStack infinite query, no store side effects
  - Create `packages/tasks/src/flows/use-tasks-page.flow.ts` — builds cards from `query.data` directly, derives `taskIdToItemId` and `imagesByItemId` lookup maps in-memory
  - Create `packages/tasks/src/controllers/use-tasks-view.controller.ts` — reads lookup maps from flow instead of stores
  - Create `packages/tasks/src/providers/TasksViewProvider.tsx`
  - Create `packages/tasks/src/components/TasksHeader.tsx`
  - Create `packages/tasks/src/components/TasksView.tsx`
  - Create `packages/tasks/src/pages/TasksRouteEntry.tsx`
  - Update `packages/tasks/src/index.ts` with all new exports + `loadTasksRouteEntryPage`
  - Update managers app `use-create-task.ts` — remove all Zustand store writes; optimistic updates touch only the TanStack query cache
  - Update managers app `surfaces.ts` — import 3 surface IDs from `@beyo/tasks`
  - Update managers app `TasksPage.tsx` — lazy-load via `loadTasksRouteEntryPage`
  - Update managers app `features/tasks/index.ts` — re-export from `@beyo/tasks`
  - Update managers app `socket-events.ts` — import `taskKeys` directly from `@beyo/tasks`
  - Delete 9 local managers app files that moved or became obsolete
- Out of scope: Detail slide, task filter sheet page, task action hooks other than use-create-task, managers app `types.ts` cleanup
- Assumptions:
  - `@beyo/tasks` already has `@beyo/ui` and `@beyo/images` as declared dependencies
  - When a new task is created optimistically, showing no images immediately is acceptable — images appear after `onSettled` refetch
  - The 3 server-state stores (`tasks.store.ts`, `items.store.ts`, `task-list-images.store.ts`) are deleted from managers app with no other consumers outside the files being deleted or updated in this plan

## Clarifications required

_(none — all fields and consumers verified before authoring)_

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors
2. The managers app `TasksPage` renders the task list correctly via the package component
3. Scroll-hide animation on `TasksHeader` still works (CSS var driven)
4. Pull-to-refresh still works
5. Tapping a task card opens the task detail slide
6. Tapping the image on a task card opens the image viewer
7. Task creation optimistic update shows the new card immediately (without images); images appear after settlement
8. No local store files remain in `features/tasks/store/` in the managers app
9. No local flow, controller, provider, view, or header files remain in the managers app tasks feature

## Contracts and skills

### Contracts loaded

- `../architecture/01_architecture.md`: overall layer structure
- `../architecture/02_types.md`: type file conventions
- `../architecture/05_server_state.md`: infinite query hook shape — `queryFn` must be a pure fetcher, no side effects
- `../architecture/06_client_state.md`: Zustand is for client/UI state only, not server data shadow copies
- `../architecture/08_hooks.md`: controller/flow composition; action hook optimistic update pattern (snapshot → update cache → rollback on error)
- `../architecture/15_feature_structure.md`: feature file layout
- `../architecture/23_providers.md`: provider pattern (context + controller shell)
- `../architecture/28_surfaces.md`: surface ID and lazy-load pattern
- `../architecture/30_dynamic_loading.md`: `loadXxxPage` loader function pattern (§14)
- `../architecture/35_shared_packages.md §14`: static page loader export from package
- `../architecture/36_scroll_visibility.md`: `useScrollHide` usage in TasksView

### Local extensions loaded

- `../architecture/28_surfaces_local.md`: active surface types for this app
- `../architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path, `loadXxxPage` convention

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate

Prohibited (pattern reads — contract already covers these):
- Reading another action hook to understand cache snapshot / rollback shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another provider to understand context shell → `23_providers.md`

Permitted (relational reads):
- Reading the managers app files listed in scope
- Reading `packages/tasks/src/types.ts`, `surface-ids.ts`, `index.ts` (already done)
- Reading `packages/ui/src/index.ts` (already done — all primitives confirmed available)

### Skill selection

- Primary skill: `skills/codex/SKILL.md`
- Trigger terms: `package migration`, `move to package`, `TasksView`, `TasksViewProvider`
- Excluded alternatives: none

## Implementation plan

### Step 1 — Add view types to `packages/tasks/src/types.ts`

Append to the end of the file (after the last export):

```ts
export type TaskTypeFilter = TaskType | "all";

export type TaskViewModel = TaskListItemRaw["task"] & {
  display_number: string;
  state_label: string;
  priority_label: string;
  task_type_label: string;
  ready_by_formatted: string | null;
  scheduled_range_formatted: string | null;
  is_overdue: boolean;
  is_open: boolean;
  has_customer: boolean;
  has_scheduled_dates: boolean;
};

export type TaskCardViewModel = {
  taskId: string;
  task: TaskViewModel;
  item: NonNullable<TaskListItemRaw["primary_item"]> | null;
  firstImage: import("@beyo/images").ImageViewModel | null;
  imageCount: number;
};

export const TASK_STATE_FILTER_OPTIONS = TASK_STATE.map((state) => ({
  value: state,
  label: state.charAt(0).toUpperCase() + state.slice(1).replace("_", " "),
  testId: `task-state-option-${state}`,
}));

export const TASK_TYPE_PICKER_OPTIONS = [
  { value: "all" as const, label: "All", testId: "task-type-all" },
  { value: "return" as const, label: "Returns", testId: "task-type-return" },
  { value: "pre_order" as const, label: "Pre-Orders", testId: "task-type-pre-order" },
  { value: "internal" as const, label: "Internals", testId: "task-type-internal" },
] as const;

const _dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function _formatDateOnly(dateString: string | null): string | null {
  if (!dateString) return null;
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? null : _dateOnlyFormatter.format(d);
}

export function toTaskViewModel(task: TaskListItemRaw["task"]): TaskViewModel {
  const readyByFormatted = _formatDateOnly(task.ready_by_at);
  const startFormatted = _formatDateOnly(task.scheduled_start_at);
  const endFormatted = _formatDateOnly(task.scheduled_end_at);
  const scheduledRangeFormatted = startFormatted
    ? endFormatted && endFormatted !== startFormatted
      ? `${startFormatted} – ${endFormatted}`
      : startFormatted
    : null;
  const isOverdue = Boolean(
    task.ready_by_at && new Date(task.ready_by_at) < new Date(),
  );
  return {
    ...task,
    display_number: `#${task.task_scalar_id}`,
    state_label: task.state,
    priority_label: task.priority,
    task_type_label: task.task_type,
    ready_by_formatted: readyByFormatted,
    scheduled_range_formatted: scheduledRangeFormatted,
    is_overdue: isOverdue,
    is_open: !["cancelled", "failed", "resolved"].includes(task.state),
    has_customer: Boolean(task.customer_id),
    has_scheduled_dates: Boolean(task.scheduled_start_at),
  };
}
```

### Step 2 — Add surface IDs to `packages/tasks/src/surface-ids.ts`

Add after the existing surface ID declarations (before the first type definition):

```ts
export const TASK_DETAIL_SURFACE_ID = "task-detail-slide";
export const TASK_ACTIONS_SHEET_SURFACE_ID = "task-actions-sheet";
export const TASK_FILTER_SHEET_SURFACE_ID = "task-filter-sheet";

export type TaskDetailSurfaceProps = {
  taskId: string;
};

export type TaskActionsSurfaceProps = {
  taskId: string;
  itemId?: string | null;
};
```

### Step 3 — Create `packages/tasks/src/store/tasks-page.store.ts`

This is the only Zustand store that moves to the package. It holds UI filter state (genuinely client state, not a server data copy).

```ts
import { create } from "zustand";

import type { TaskState, TaskTypeFilter } from "../types";

type TasksPageStoreState = {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  setTaskType: (value: TaskTypeFilter) => void;
  setTaskStates: (value: TaskState[]) => void;
  setQ: (value: string) => void;
  reset: () => void;
};

const INITIAL_STATE: Pick<TasksPageStoreState, "taskType" | "taskStates" | "q"> = {
  taskType: "all",
  taskStates: [],
  q: "",
};

export const useTasksPageStore = create<TasksPageStoreState>((set) => ({
  ...INITIAL_STATE,
  setTaskType: (value) => set({ taskType: value }),
  setTaskStates: (value) => set({ taskStates: value }),
  setQ: (value) => set({ q: value }),
  reset: () => set(INITIAL_STATE),
}));
```

### Step 4 — Create `packages/tasks/src/api/use-list-tasks-query.ts`

Pure TanStack infinite query — no store side effects. The `queryFn` only fetches and returns data.

```ts
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { listTasks } from "./list-tasks";
import type { ListTasksFullParams } from "../types";
import { taskKeys } from "./task-keys";

const PAGE_LIMIT = 25;

export function useListTasksQuery(
  params: Omit<ListTasksFullParams, "limit" | "offset">,
) {
  const query = useInfiniteQuery({
    queryKey: taskKeys.list({ ...params, limit: PAGE_LIMIT }),
    queryFn: async ({ pageParam }) => {
      return listTasks({
        ...params,
        limit: PAGE_LIMIT,
        offset: pageParam as number,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
    placeholderData: keepPreviousData,
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

### Step 5 — Create `packages/tasks/src/flows/use-tasks-page.flow.ts`

Builds cards directly from `query.data`. Also derives `taskIdToItemId` and `imagesByItemId` lookup maps in-memory (replaces what the deleted Zustand stores held). Both are exposed on the `TasksPageFlow` type for the controller to consume.

The private `toImageViewModelFromListItem` helper (previously in the managers app query file) lives here.

```ts
import { useEffect, useMemo, useRef, useState } from "react";

import {
  toImageAnnotationViewModel,
  type ImageViewModel,
} from "@beyo/images";

import { useListTasksQuery } from "../api/use-list-tasks-query";
import { useTasksPageStore } from "../store/tasks-page.store";
import type { TaskCardViewModel, TaskListItemRaw } from "../types";
import { toTaskViewModel } from "../types";

export type TasksPageFlow = {
  cards: TaskCardViewModel[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;
  taskIdToItemId: Record<string, string>;
  imagesByItemId: Record<string, ImageViewModel[]>;
};

function toImageViewModelFromListItem(
  raw: TaskListItemRaw["item_images"][number],
  itemClientId: string,
  index: number,
): ImageViewModel {
  const isFirst = index === 0;
  const record = raw as {
    client_id: string;
    image_url: string;
    width_px?: number | null;
    height_px?: number | null;
    file_size_bytes?: number | null;
    created_at?: string;
    image_annotation?: Parameters<typeof toImageAnnotationViewModel>[0] | null;
    image_annotations?: Parameters<typeof toImageAnnotationViewModel>[0][];
  };

  return {
    clientId: record.client_id,
    linkClientId: null,
    entityType: "item",
    entityClientId: itemClientId,
    imageUrl: record.image_url,
    localObjectUrl: null,
    displayOrder: index,
    widthPx: record.width_px ?? null,
    heightPx: record.height_px ?? null,
    fileSizeBytes: record.file_size_bytes ?? null,
    createdAt: isFirst ? (record.created_at ?? null) : null,
    uploadState: "completed",
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation:
      isFirst && record.image_annotation
        ? toImageAnnotationViewModel(record.image_annotation)
        : null,
    annotations:
      isFirst && Array.isArray(record.image_annotations)
        ? record.image_annotations.map(toImageAnnotationViewModel)
        : [],
    isFullyLoaded: isFirst,
  };
}

function useDelayedTrue(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (value) {
      timerRef.current = setTimeout(() => setDelayed(true), delayMs);
    } else {
      setDelayed(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return delayed;
}

export function useTasksPageFlow(): TasksPageFlow {
  const { taskType, taskStates, q } = useTasksPageStore();
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const params = useMemo(
    () => ({
      ...(taskType !== "all" ? { task_types: taskType } : {}),
      ...(taskStates.length > 0 ? { task_states: taskStates.join(",") } : {}),
      ...(debouncedQ ? { q: debouncedQ } : {}),
    }),
    [debouncedQ, taskStates, taskType],
  );

  const { query, loadMore } = useListTasksQuery(params);

  async function refetch(): Promise<void> {
    await query.refetch();
  }

  const { cards, taskIdToItemId, imagesByItemId } = useMemo(() => {
    const cards: TaskCardViewModel[] = [];
    const taskIdToItemId: Record<string, string> = {};
    const imagesByItemId: Record<string, ImageViewModel[]> = {};

    for (const page of query.data?.pages ?? []) {
      for (const listItem of page.items) {
        const { task, primary_item, item_images } = listItem;
        const itemClientId = primary_item?.client_id ?? null;

        if (itemClientId) {
          taskIdToItemId[task.client_id] = itemClientId;
          imagesByItemId[itemClientId] = item_images.map((img, i) =>
            toImageViewModelFromListItem(img, itemClientId, i),
          );
        }

        const images = itemClientId ? (imagesByItemId[itemClientId] ?? []) : [];

        cards.push({
          taskId: task.client_id,
          task: toTaskViewModel(task),
          item: primary_item,
          firstImage: images[0] ?? null,
          imageCount: images.length,
        });
      }
    }

    return { cards, taskIdToItemId, imagesByItemId };
  }, [query.data]);

  const isLoading = useDelayedTrue(query.isLoading, 200);

  return {
    cards,
    isLoading,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    loadMore,
    refetch,
    taskIdToItemId,
    imagesByItemId,
  };
}
```

### Step 6 — Create `packages/tasks/src/controllers/use-tasks-view.controller.ts`

Reads `taskIdToItemId` and `imagesByItemId` from the flow (not from Zustand stores). Imports `useSurfaceStore` from `@beyo/ui`.

```ts
import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
} from "@beyo/images";
import { useSurfaceStore } from "@beyo/ui";

import {
  useTasksPageFlow,
  type TasksPageFlow,
} from "../flows/use-tasks-page.flow";
import { useTasksPageStore } from "../store/tasks-page.store";
import {
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
  type TaskActionsSurfaceProps,
  type TaskDetailSurfaceProps,
} from "../surface-ids";
import type { TaskState, TaskTypeFilter } from "../types";

export type TasksViewController = TasksPageFlow & {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  activeFilterCount: number;
  setTaskType: (value: TaskTypeFilter) => void;
  setTaskStates: (value: TaskState[]) => void;
  setQ: (value: string) => void;
  openTaskDetail: (taskId: string) => void;
  openTaskActions: (taskId: string, itemId: string | null) => void;
  openFilterSheet: () => void;
  openSortSheet: () => void;
  openImageViewer: (taskId: string) => void;
};

export function useTasksViewController(): TasksViewController {
  const flow = useTasksPageFlow();
  const { taskType, taskStates, q, setTaskType, setTaskStates, setQ } =
    useTasksPageStore();
  const activeFilterCount = taskStates.length + (taskType !== "all" ? 1 : 0);

  function openTaskDetail(taskId: string): void {
    useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  function openTaskActions(taskId: string, itemId: string | null): void {
    useSurfaceStore.getState().open(TASK_ACTIONS_SHEET_SURFACE_ID, {
      taskId,
      itemId,
    } satisfies TaskActionsSurfaceProps);
  }

  function openFilterSheet(): void {
    useSurfaceStore.getState().open(TASK_FILTER_SHEET_SURFACE_ID, {});
  }

  function openSortSheet(): void {}

  function openImageViewer(taskId: string): void {
    const itemId = flow.taskIdToItemId[taskId];
    if (!itemId) return;

    const images = flow.imagesByItemId[itemId] ?? [];
    const firstImage = images[0];
    if (!firstImage) return;

    useSurfaceStore.getState().open(IMAGE_VIEWER_SURFACE_ID, {
      images,
      initialImageClientId: firstImage.clientId,
      entityType: "item" as ImageLinkEntityType,
      entityClientId: itemId,
      mode: "preview-only",
      enableOnDemandImageLoad: true,
    });
  }

  return {
    ...flow,
    taskType,
    taskStates,
    q,
    activeFilterCount,
    setTaskType,
    setTaskStates,
    setQ,
    openTaskDetail,
    openTaskActions,
    openFilterSheet,
    openSortSheet,
    openImageViewer,
  };
}
```

### Step 7 — Create `packages/tasks/src/providers/TasksViewProvider.tsx`

```tsx
import { createContext, useContext, type ReactNode } from "react";
import {
  useTasksViewController,
  type TasksViewController,
} from "../controllers/use-tasks-view.controller";

const TasksViewContext = createContext<TasksViewController | null>(null);

type Props = { children: ReactNode };

export function useTasksViewContext(): TasksViewController {
  const context = useContext(TasksViewContext);
  if (context === null) {
    throw new Error("useTasksViewContext must be used inside TasksViewProvider");
  }
  return context;
}

export function TasksViewProvider({ children }: Props): React.JSX.Element {
  const controller = useTasksViewController();
  return (
    <TasksViewContext.Provider value={controller}>
      {children}
    </TasksViewContext.Provider>
  );
}
```

### Step 8 — Create `packages/tasks/src/components/TasksHeader.tsx`

Import primitives from `@beyo/ui` instead of `@/components/primitives`. Import types from `../types`.

```tsx
import {
  BoxPicker,
  BoxSlidePicker,
  HorizontalScrollArea,
  SearchBar,
} from "@beyo/ui";

import { TASK_STATE_FILTER_OPTIONS, TASK_TYPE_PICKER_OPTIONS } from "../types";
import type { TaskState, TaskTypeFilter } from "../types";

const HIDE_STYLE: React.CSSProperties = {
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition: "opacity var(--scroll-snap-duration, 0ms) ease-out",
};

const SLIDE_HIDE_STYLE: React.CSSProperties = {
  transform: "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

type TasksHeaderProps = {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  isLoading: boolean;
  activeFilterCount: number;
  onTaskTypeChange: (value: TaskTypeFilter) => void;
  onTaskStatesChange: (value: TaskState[]) => void;
  onQChange: (value: string) => void;
  onSortPress: () => void;
  onFilterPress: () => void;
};

export function TasksHeader({
  taskType,
  taskStates,
  q,
  isLoading,
  activeFilterCount,
  onTaskTypeChange,
  onTaskStatesChange,
  onQChange,
  onSortPress,
  onFilterPress,
}: TasksHeaderProps): React.JSX.Element {
  return (
    <div
      className="relative flex flex-col bg-background"
      data-testid="tasks-header"
    >
      <div className="px-4 pb-2 pt-3" style={HIDE_STYLE}>
        <BoxSlidePicker
          dataTestId="tasks-type-picker"
          options={TASK_TYPE_PICKER_OPTIONS}
          size="sm"
          value={taskType}
          onValueChange={onTaskTypeChange}
        />
      </div>

      <div className="relative z-10 bg-background px-4 py-2">
        <SearchBar
          activeFilterCount={activeFilterCount}
          data-testid="tasks-search-bar"
          isLoading={isLoading}
          placeholder="Search tasks..."
          value={q}
          wrapperClassName="bg-[var(--color-card)]"
          onChange={onQChange}
          onFilterPress={onFilterPress}
          onSortPress={onSortPress}
        />
      </div>

      <div
        className="absolute inset-x-0 bg-background"
        style={{ top: "100%", ...SLIDE_HIDE_STYLE }}
      >
        <HorizontalScrollArea className="pb-1">
          <BoxPicker
            className="flex flex-nowrap flex-row gap-1.5 px-4"
            data-testid="tasks-state-filter"
            layout="stack"
            mode="multiple"
            options={[...TASK_STATE_FILTER_OPTIONS]}
            size="sm"
            showDescription={false}
            showIcon={false}
            value={taskStates}
            visualVariant="pill"
            onValueChange={onTaskStatesChange}
            selectedOptionClassName="bg-blue-100 border-blue-400 text-blue-500"
            unselectedOptionClassName="bg-white border-slate-300 text-slate-700"
          />
        </HorizontalScrollArea>
      </div>
    </div>
  );
}
```

### Step 9 — Create `packages/tasks/src/components/TasksView.tsx`

`TaskListCard` is imported relatively (same package). `card.item.client_id` is used for `itemId` (not `card.item.id`, since `primary_item` has `client_id` not `id`).

```tsx
import { TaskListCard } from "./TaskListCard";
import { PullToRefresh, useScrollHide } from "@beyo/ui";

import { useTasksViewContext } from "../providers/TasksViewProvider";
import { TasksHeader } from "./TasksHeader";

export function TasksView(): React.JSX.Element {
  const controller = useTasksViewContext();
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex-1 min-h-0"
      data-testid="tasks-view"
    >
      <div
        className="absolute inset-x-0 top-0 z-10"
        style={{
          transform:
            "translateY(calc(-1 * var(--type-picker-height, 56px) * var(--scroll-hide-progress, 0)))",
          transition: "transform var(--scroll-snap-duration, 0ms) ease-out",
          pointerEvents: isHidden ? "none" : undefined,
        }}
      >
        <TasksHeader
          activeFilterCount={controller.activeFilterCount}
          isLoading={controller.isLoading}
          q={controller.q}
          taskStates={controller.taskStates}
          taskType={controller.taskType}
          onFilterPress={controller.openFilterSheet}
          onQChange={controller.setQ}
          onSortPress={controller.openSortSheet}
          onTaskStatesChange={controller.setTaskStates}
          onTaskTypeChange={controller.setTaskType}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
        indicatorOffset={176}
      >
        <div className="pt-44" data-testid="tasks-list-scroll">
          <div
            className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2"
            data-testid="tasks-list"
          >
            {controller.cards.map((card) => (
              <TaskListCard
                key={card.taskId}
                imageUrl={
                  card.firstImage
                    ? (card.firstImage.localObjectUrl ?? card.firstImage.imageUrl)
                    : null
                }
                item={
                  card.item
                    ? {
                        itemId: card.item.client_id,
                        article_number: card.item.article_number,
                        sku: card.item.sku,
                        item_major_category_snapshot:
                          card.item.item_major_category_snapshot,
                        quantity: card.item.quantity,
                      }
                    : null
                }
                onTapActions={controller.openTaskActions}
                onTapCard={controller.openTaskDetail}
                onTapImage={controller.openImageViewer}
                task={{
                  task_type: card.task.task_type,
                  state: card.task.state,
                  return_source: card.task.return_source,
                  ready_by_at: card.task.ready_by_at,
                  is_overdue: card.task.is_overdue,
                }}
                taskId={card.taskId}
              />
            ))}

            {controller.isLoading && controller.cards.length === 0 ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : null}
          </div>

          {controller.hasMore || controller.isFetchingMore ? (
            <div className="flex justify-center pb-6">
              <button
                className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
                data-testid="tasks-load-more-button"
                disabled={controller.isFetchingMore}
                type="button"
                onClick={controller.loadMore}
              >
                {controller.isFetchingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : controller.cards.length > 0 ? (
            <div className="flex justify-center pb-6">
              <span
                className="text-xs text-muted-foreground"
                data-testid="tasks-end-of-list"
              >
                End of list
              </span>
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </div>
  );
}
```

### Step 10 — Create `packages/tasks/src/pages/TasksRouteEntry.tsx`

```tsx
import { TasksView } from "../components/TasksView";
import { TasksViewProvider } from "../providers/TasksViewProvider";

export function TasksRouteEntry(): React.JSX.Element {
  return (
    <TasksViewProvider>
      <TasksView />
    </TasksViewProvider>
  );
}
```

### Step 11 — Update `packages/tasks/src/index.ts`

Append after the existing exports:

```ts
// UI filter store (client state)
export { useTasksPageStore } from "./store/tasks-page.store";

// View-layer types
export type { TaskTypeFilter, TaskViewModel, TaskCardViewModel } from "./types";
export {
  TASK_STATE_FILTER_OPTIONS,
  TASK_TYPE_PICKER_OPTIONS,
  toTaskViewModel,
} from "./types";

// New surface IDs
export {
  TASK_DETAIL_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  TaskDetailSurfaceProps,
  TaskActionsSurfaceProps,
} from "./surface-ids";

// Query
export { useListTasksQuery } from "./api/use-list-tasks-query";

// Flow
export { useTasksPageFlow } from "./flows/use-tasks-page.flow";
export type { TasksPageFlow } from "./flows/use-tasks-page.flow";

// Controller + Provider
export { useTasksViewController } from "./controllers/use-tasks-view.controller";
export type { TasksViewController } from "./controllers/use-tasks-view.controller";
export { TasksViewProvider, useTasksViewContext } from "./providers/TasksViewProvider";

// Components
export { TasksView } from "./components/TasksView";
export { TasksHeader } from "./components/TasksHeader";

// Route entry page loader (§14 pattern)
export function loadTasksRouteEntryPage() {
  return import("./pages/TasksRouteEntry").then((m) => ({
    default: m.TasksRouteEntry,
  }));
}
```

### Step 12 — Update managers app `features/tasks/actions/use-create-task.ts`

Remove all Zustand store imports and writes. Optimistic update now only touches the TanStack query cache. `getOptimisticItemImages` is deleted — the optimistic card shows no images (they appear after `onSettled` invalidation).

Key changes:
1. Remove the 3 store imports (`useItemsStore`, `useTaskListImagesStore`, `useTasksStore`)
2. Remove `getOptimisticItemImages` function
3. In `onMutate`: remove store writes (`setTask`, `setItem`, `setTaskItemRelation`, `setForItem`)
4. In `onSuccess`: remove `useTasksStore.getState().patch(...)` — query cache patch is sufficient
5. In `onError`: remove store cleanup (`tasksStore.remove`, `useItemsStore.getState().remove`, `useTaskListImagesStore.getState().removeForItem`)
6. Simplify `CreateTaskContext` — remove `itemClientId` since it was only needed for store cleanup

The `buildOptimisticListItem`, `prependOptimisticTask`, `patchCreatedTask` helpers and all `queryClient.setQueriesData` / `queryClient.getQueriesData` calls remain unchanged.

After the change, `use-create-task.ts` has no remaining local store imports. The `taskKeys` import comes from `"../api/task-keys"` which re-exports from `@beyo/tasks` — update that import to `from "@beyo/tasks"` directly (since `api/task-keys.ts` is being deleted in Step 17).

### Step 13 — Update managers app `features/tasks/surfaces.ts`

Add `TASK_DETAIL_SURFACE_ID`, `TASK_ACTIONS_SHEET_SURFACE_ID`, `TASK_FILTER_SHEET_SURFACE_ID`, `TaskDetailSurfaceProps`, `TaskActionsSurfaceProps` to the `@beyo/tasks` import block at the top.

Remove the local declarations of those same surface IDs and types (they existed as local consts/types before this plan).

Add them to the re-export block at the bottom:
```ts
export {
  TASK_DETAIL_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
  // ... existing re-exports ...
} from "@beyo/tasks";
export type {
  TaskDetailSurfaceProps,
  TaskActionsSurfaceProps,
  // ... existing type re-exports ...
} from "@beyo/tasks";
```

### Step 14 — Update managers app `pages/tasks/TasksPage.tsx`

```tsx
import { lazy, Suspense } from "react";

import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { TaskCreationFab } from "@/features/tasks/components/TaskCreationFab";
import { loadTasksRouteEntryPage } from "@beyo/tasks";

const TasksRouteEntry = lazy(loadTasksRouteEntryPage);

export function TasksPage(): React.JSX.Element {
  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <Suspense fallback={<PageSkeleton />}>
          <TasksRouteEntry />
        </Suspense>
      </div>
      <TaskCreationFab />
    </>
  );
}
```

### Step 15 — Update managers app `features/tasks/index.ts`

Replace the local store and view exports with re-exports from `@beyo/tasks`. The `useCreateTask` action, `TaskDetailProvider`, `taskSurfaces`, and type exports from `./types` stay unchanged.

```ts
// Replace these four local re-exports:
//   export { TasksView } from "./components/TasksView";
//   export { TasksViewProvider } from "./providers/TasksViewProvider";
//   export { useItemsStore } from "./store/items.store";
//   export { useTaskListImagesStore } from "./store/task-list-images.store";
//   export { useTasksPageStore } from "./store/tasks-page.store";
//   export { useTasksStore } from "./store/tasks.store";
// With:
export {
  TasksView,
  TasksViewProvider,
  useTasksPageStore,
} from "@beyo/tasks";
// Note: useItemsStore, useTaskListImagesStore, useTasksStore are deleted
// (no consumers outside files covered by this plan)
```

### Step 16 — Update managers app `features/tasks/socket-events.ts`

```ts
// Replace:
import { taskKeys } from "./api/task-keys";
// With:
import { taskKeys } from "@beyo/tasks";
```

### Step 17 — Delete moved/obsolete local files in managers app

Delete these 9 files:

```
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/store/tasks-page.store.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/store/tasks.store.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/store/items.store.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/store/task-list-images.store.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/use-list-tasks-query.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/task-keys.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-tasks-page.flow.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/controllers/use-tasks-view.controller.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/providers/TasksViewProvider.tsx
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TasksView.tsx
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TasksHeader.tsx
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/route-entry.tsx
```

Note: `tasks.store.ts`, `items.store.ts`, and `task-list-images.store.ts` are deleted without replacement — their data is now derived from the TanStack cache in the flow.

## Risks and mitigations

- Risk: `query.data` pagination means `cards`, `taskIdToItemId`, and `imagesByItemId` are re-derived on every page fetch. With `useMemo`, this is one pass over existing pages when a new page loads — acceptable cost.
  Mitigation: `useMemo` with `[query.data]` dependency ensures recomputation only on data change. No correctness risk.

- Risk: Optimistic task card shows no images immediately after `onMutate`.
  Mitigation: Accepted by design. `onSettled` invalidates the list query; images appear on next fetch. No user-visible error occurs.

- Risk: `use-create-task.ts` `onSuccess` previously patched `useTasksStore` to update `task_scalar_id`. Without the store, the task's scalar ID only updates via query cache patch (already in `onSuccess`) then confirmed on invalidation.
  Mitigation: `patchCreatedTask` already updates the query cache — the task card will show the correct `display_number` (`#0` momentarily, then the real number after `patchCreatedTask` or refetch). This is acceptable.

- Risk: `TasksViewController` spreads `flow` which now includes `taskIdToItemId` and `imagesByItemId`. These appear on the context value but are not consumed by `TasksView` or `TasksHeader` directly.
  Mitigation: No correctness issue — unused properties on a context value are harmless. They're available for any future consumer.

## Validation plan

- `npm run typecheck`: zero TypeScript errors — run after Step 11 (package complete) and after Step 16 (all managers changes done)
- Manual smoke test: navigate to TasksPage — list renders, scroll-hide animates, PullToRefresh works, tapping card opens detail, tapping image opens image viewer
- Create a new task — verify optimistic card appears immediately (no images), task_scalar_id updates after settlement
- `npm run test -- --grep tasks`: no regressions in existing task tests

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
