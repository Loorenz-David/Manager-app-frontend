# PLAN_tasks_page_20260523

## Metadata

- Plan ID: `PLAN_tasks_page_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T09:47:47Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Build the tasks page UI with collapsible header (type picker, search bar, state filters), paginated task list, normalized entity stores for real-time targeting, and stub surfaces for task detail and actions.
- Business/user intent: Managers need to browse, search, and filter tasks by type and state. The list is the primary operational surface of the app.
- Non-goals: Task detail page content, task action sheet content, real-time socket integration, actual task card design (decoy cards used for now), sort sheet content.

## Scope

- In scope:
  - `features/tasks/` stores (task, item, task-list-images, page filter/pagination)
  - API functions `list-tasks.ts` and `get-task.ts`
  - `useInfiniteQuery`-based list query hook with store normalization
  - Flow `use-tasks-page.flow.ts` stitching card view models from stores
  - `features/tasks/surfaces.ts` + `app/surface-registry.ts` wiring
  - Stub pages: task detail slide, task actions sheet, filter sheet
  - `TasksHeader.tsx` collapsible header (BoxSlidePicker, SearchBar, BoxPicker pills)
  - `TaskListDecoyCard.tsx` placeholder card with all tap interactions wired
  - `TasksView.tsx` full layout with scroll-driven compact behaviour
  - `use-tasks-view.controller.ts` wired to flow
  - `ImageViewModel.isFullyLoaded` flag + `ImageViewerSurfaceProps.enableOnDemandImageLoad` + viewer on-demand loading
  - `pages/tasks/TasksPage.tsx` container height fix

- Out of scope:
  - Actual task card design/content
  - Filter sheet content (stub only)
  - Task detail page content (stub only)
  - Real-time WebSocket integration
  - Sort functionality (search bar sort button → no-op)
  - Playwright / Vitest tests (separate plan)

- Assumptions:
  - `GET /api/v1/tasks` is live and matches the handoff document `HANDOFF_TO_FRONTEND_tasks_list_query_and_response_shape_20260523.md` exactly.
  - `GET /api/v1/tasks/{task_id}` and `GET /api/v1/images/{image_client_id}` are live.
  - `task_types` is passed as a single CSV value (e.g. `task_types=return`) from the single-select BoxSlidePicker.
  - Light images in the list response omit `storage_provider`, `source_type`, `events`, `image_annotation`.

## Clarifications required

_(none — all decisions are locked below)_

## Acceptance criteria

1. Selecting a task type in the slide picker re-fetches the list filtered to that type.
2. Typing in the search bar debounces 300 ms then re-fetches with `q` param.
3. Tapping a state pill toggles it; selected states are sent as a CSV `task_states` param.
4. The header collapses to show only the search bar when the list is scrolled past 56 px, and re-expands when scrolled back above 8 px.
5. 25 tasks load on mount. A "Load more" button appears when `has_more = true`; tapping it appends the next page of 25.
6. Tapping the card image opens `IMAGE_VIEWER_SURFACE_ID` with `enableOnDemandImageLoad: true`.
7. Tapping the three-dot button opens `TASK_ACTIONS_SHEET_SURFACE_ID`.
8. Tapping a card body opens `TASK_DETAIL_SURFACE_ID`.
9. Swiping to a light image in the viewer with `enableOnDemandImageLoad: true` triggers `GET /api/v1/images/{id}` and enriches the image with annotation data.
10. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query infinite pagination, query key shape
- `architecture/06_client_state.md`: Zustand store pattern for entity maps
- `architecture/08_hooks.md`: flow/controller composition, debounce pattern
- `architecture/07_components.md`: component prop contracts, data-testid placement
- `architecture/15_feature_structure.md`: feature folder layout
- `architecture/28_surfaces.md`: surface registration + open pattern
- `architecture/31_animations.md`: AnimatePresence/motion.div collapse animation

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `slide` and `sheet` surface types only (no `drawer`)
- `architecture/15_feature_structure_local.md`: feature structure conventions for this app

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading another action hook to understand cache snapshot / rollback shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another controller to understand aggregation shape → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another DTO file to understand view model transformer shape → `24_dto.md`

Permitted (relational reads — understanding what exists):
- Reading `features/images/controllers/use-entity-images.controller.ts` to understand `ImageViewerSurfaceProps` exact fields
- Reading `features/images/api/use-image.ts` to understand `useImageQuery` signature
- Reading `features/images/pages/ImageFullscreenViewerPage.tsx` to understand where to splice `enableOnDemandImageLoad` logic
- Reading `app/surface-registry.ts` to know where to add the import
- Reading `features/tasks/types.ts`, `features/items/types.ts`, `features/images/types.ts` for entity field names

### Skill selection

- Primary skill: —
- Trigger terms: server state, client state, surfaces, animation, components, forms (none)
- Excluded alternatives: —

## Implementation plan

### Step 1 — Extend `features/tasks/types.ts`

Add to the existing file (do not remove anything). **No new cross-feature imports are needed** — all raw schema types are defined inline to avoid a bottom-level dependency chain between features.

First, add seven derived type aliases immediately after the existing const arrays (these are used by the stores, the page store, the flow, and the controller):

```ts
// Derived types — add immediately after the existing const array declarations.
export type TaskType = (typeof TASK_TYPE)[number];
export type TaskPriority = (typeof TASK_PRIORITY)[number];
export type TaskState = (typeof TASK_STATE)[number];
export type TaskReturnSource = (typeof TASK_RETURN_SOURCE)[number];
export type TaskItemLocation = (typeof TASK_ITEM_LOCATION)[number];
export type TaskReturnMethod = (typeof TASK_RETURN_METHOD)[number];
export type TaskFulfillmentMethod = (typeof TASK_FULFILLMENT_METHOD)[number];
// Extends TaskType with 'all' sentinel used by the type-picker filter.
// 'all' means no task_types filter is applied.
export type TaskTypeFilter = TaskType | 'all';
```

Then add the raw schema types:

```ts
// ─── Light image from list response ──────────────────────────────────────────
// The list endpoint serializes only the first item_image with the full shape.
// Subsequent images use this light schema.
export const ImageLightSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  width_px: z.number().int().nullable().optional(),
  height_px: z.number().int().nullable().optional(),
  file_size_bytes: z.number().nullable().optional(),
});
export type ImageLight = z.infer<typeof ImageLightSchema>;

// ─── Raw list response shapes ─────────────────────────────────────────────────
// Zod schema for one paginated list item.
// item_images is parsed as a passthrough array — each element is converted to
// ImageViewModel in the query hook's normalizePageIntoStores helper, which
// distinguishes full vs. light images by checking for the 'storage_provider' key.
// This avoids importing ImageSchema or item enums from other features at the types level.
export const TaskListItemRawSchema = z.object({
  task: z.object({
    client_id: z.string(),
    task_scalar_id: z.number().int(),
    task_type: z.enum(TASK_TYPE),
    priority: z.enum(TASK_PRIORITY),
    state: z.enum(TASK_STATE),
    title: z.string().nullable(),
    summary: z.string().nullable(),
    return_source: z.enum(TASK_RETURN_SOURCE).nullable(),
    item_location: z.enum(TASK_ITEM_LOCATION).nullable(),
    return_method: z.enum(TASK_RETURN_METHOD).nullable(),
    fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).nullable(),
    additional_details: z.record(z.string(), z.unknown()).nullable(),
    ready_by_at: z.string().nullable(),
    scheduled_start_at: z.string().nullable(),
    scheduled_end_at: z.string().nullable(),
    customer_id: z.string().nullable(),
    primary_phone_number: z.string().nullable(),
    secondary_phone_number: z.string().nullable(),
    primary_email: z.string().nullable(),
    secondary_email: z.string().nullable(),
    address: z.unknown().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    closed_at: z.string().nullable(),
    is_deleted: z.boolean(),
    deleted_at: z.string().nullable(),
  }),
  primary_item: z.object({
    client_id: z.string(),
    article_number: z.string().nullable(),
    sku: z.string().nullable(),
    state: z.string(),                    // kept as string to avoid importing ITEM_STATE
    item_category_id: z.string().nullable(),
    quantity: z.number().int(),
    designer: z.string().nullable(),
    height_in_cm: z.number().int().nullable(),
    width_in_cm: z.number().int().nullable(),
    depth_in_cm: z.number().int().nullable(),
    item_value_minor: z.number().int().nullable(),
    item_cost_minor: z.number().int().nullable(),
    item_currency: z.string().nullable(),  // kept as string to avoid importing ITEM_CURRENCY
    item_position: z.string().nullable(),
    external_id: z.string().nullable(),
    external_url: z.string().nullable(),
    external_source: z.string().nullable(),
    external_order_id: z.string().nullable(),
    item_category_snapshot: z.string().nullable(),
    item_major_category_snapshot: z.string().nullable(),
  }),
  item_images: z.array(z.record(z.string(), z.unknown())),  // passthrough — typed in query hook
});
export type TaskListItemRaw = z.infer<typeof TaskListItemRawSchema>;
```

Add the full params type:

```ts
export type ListTasksFullParams = {
  limit?: number;           // default 25
  offset?: number;          // default 0
  q?: string | null;
  task_types?: string;       // single value from type picker (e.g. 'return')
  task_states?: string;      // CSV (e.g. 'pending,working')
  task_step_states?: string; // CSV — reserved, not used by page yet
  step_readiness_statuses?: string;
  priorities?: string;
  return_sources?: string;
  working_section_ids?: string;
  ready_from_date?: string;
  ready_to_date?: string;
  scheduled_from_date?: string;
  scheduled_to_date?: string;
  upholstery_requirement_states?: string;
  deleted?: boolean;
  order_by?: string;
};
```

Add the card view model:

```ts
import type { Item } from '@/features/items/types';
import type { ImageViewModel } from '@/features/images/types';

export type TaskCardViewModel = {
  taskId: string;
  task: TaskViewModel;
  item: Item | null;
  firstImage: ImageViewModel | null;
  imageCount: number;
};
```

Add the task state filter options constant (used by BoxPicker):

```ts
export const TASK_STATE_FILTER_OPTIONS = TASK_STATE.map((state) => ({
  value: state,
  label: state.charAt(0).toUpperCase() + state.slice(1).replace('_', ' '),
  testId: `task-state-option-${state}`,
}));
```

Add the task type slide picker options (used by BoxSlidePicker):

```ts
export const TASK_TYPE_PICKER_OPTIONS = [
  { value: 'all' as const, label: 'All', testId: 'task-type-all' },
  { value: 'return' as const, label: 'Returns', testId: 'task-type-return' },
  { value: 'pre_order' as const, label: 'Pre-Orders', testId: 'task-type-pre-order' },
  { value: 'internal' as const, label: 'Internals', testId: 'task-type-internal' },
] as const;
```

Update `ListTasksParams` to alias to `ListTasksFullParams`:

```ts
// Replace the existing minimal ListTasksParams with the full params type.
// Old:  export type ListTasksParams = { limit?: number; offset?: number; };
// New (keep the name for backward compat, extend it):
export type ListTasksParams = ListTasksFullParams;
```

### Step 2 — Update `features/tasks/api/task-keys.ts`

Replace the current `list` key to accept `ListTasksFullParams`:

```ts
import type { ListTasksFullParams } from '@/features/tasks/types';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params: ListTasksFullParams = {}) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};
```

### Step 3 — Create `features/tasks/api/list-tasks.ts`

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';
import { TaskListItemRawSchema, type ListTasksFullParams, type TaskListItemRaw } from '../types';

const ListTasksResponseSchema = ApiEnvelopeSchema(
  z.object({
    tasks_pagination: z.object({
      items: z.array(TaskListItemRawSchema),
      limit: z.number().int(),
      offset: z.number().int(),
      has_more: z.boolean(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type ListTasksResult = {
  items: TaskListItemRaw[];
  limit: number;
  offset: number;
  has_more: boolean;
};

export async function listTasks(params: ListTasksFullParams): Promise<ListTasksResult> {
  const queryParams: Record<string, string | number | boolean> = {};

  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.q) queryParams.q = params.q;
  if (params.task_types) queryParams.task_types = params.task_types;
  if (params.task_states) queryParams.task_states = params.task_states;
  if (params.task_step_states) queryParams.task_step_states = params.task_step_states;
  if (params.step_readiness_statuses) queryParams.step_readiness_statuses = params.step_readiness_statuses;
  if (params.priorities) queryParams.priorities = params.priorities;
  if (params.return_sources) queryParams.return_sources = params.return_sources;
  if (params.working_section_ids) queryParams.working_section_ids = params.working_section_ids;
  if (params.ready_from_date) queryParams.ready_from_date = params.ready_from_date;
  if (params.ready_to_date) queryParams.ready_to_date = params.ready_to_date;
  if (params.scheduled_from_date) queryParams.scheduled_from_date = params.scheduled_from_date;
  if (params.scheduled_to_date) queryParams.scheduled_to_date = params.scheduled_to_date;
  if (params.upholstery_requirement_states) queryParams.upholstery_requirement_states = params.upholstery_requirement_states;
  if (params.deleted != null) queryParams.deleted = params.deleted;
  if (params.order_by) queryParams.order_by = params.order_by;

  const parsed = await apiClient.get('/api/v1/tasks', ListTasksResponseSchema, queryParams);
  return parsed.data.tasks_pagination;
}
```

### Step 4 — Create `features/tasks/api/get-task.ts`

```ts
import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { z } from 'zod';

// Minimal response schema for the detail call — expand as the detail page is built.
const GetTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    task: z.record(z.string(), z.unknown()),
    item: z.record(z.string(), z.unknown()).nullable(),
    item_images: z.array(z.record(z.string(), z.unknown())),
    item_issues: z.array(z.record(z.string(), z.unknown())),
    item_upholstery: z.array(z.record(z.string(), z.unknown())),
    requirements: z.array(z.record(z.string(), z.unknown())),
    task_steps: z.array(z.record(z.string(), z.unknown())),
    task_notes: z.array(z.record(z.string(), z.unknown())),
    unread_message_count: z.number().int(),
  }),
).extend({ ok: z.literal(true) });

export type GetTaskResult = z.infer<typeof GetTaskResponseSchema>['data'];

export async function getTask(taskId: string): Promise<GetTaskResult> {
  const parsed = await apiClient.get(`/api/v1/tasks/${taskId}`, GetTaskResponseSchema);
  return parsed.data;
}
```

### Step 5 — Create entity stores

**`features/tasks/store/tasks.store.ts`**

```ts
import { create } from 'zustand';
import type { TaskListItemRaw } from '../types';

// Derived from Zod schema to prevent drift — no hand-typed fields.
type TaskRecord = TaskListItemRaw['task'];

type TasksStoreState = {
  tasksById: Record<string, TaskRecord>;
  taskIdToItemId: Record<string, string>;
  setMany: (tasks: TaskRecord[]) => void;
  setTaskItemRelation: (taskId: string, itemId: string) => void;
  patch: (taskId: string, patch: Partial<TaskRecord>) => void;
};

export const useTasksStore = create<TasksStoreState>((set) => ({
  tasksById: {},
  taskIdToItemId: {},

  setMany: (tasks) =>
    set((state) => {
      const next = { ...state.tasksById };
      for (const t of tasks) next[t.client_id] = t;
      return { tasksById: next };
    }),

  setTaskItemRelation: (taskId, itemId) =>
    set((state) => ({
      taskIdToItemId: { ...state.taskIdToItemId, [taskId]: itemId },
    })),

  patch: (taskId, patch) =>
    set((state) => {
      const existing = state.tasksById[taskId];
      if (!existing) return state;
      return { tasksById: { ...state.tasksById, [taskId]: { ...existing, ...patch } } };
    }),
}));
```

**`features/tasks/store/items.store.ts`**

```ts
import { create } from 'zustand';
import type { TaskListItemRaw } from '../types';

// Derived from Zod schema to prevent drift — no hand-typed fields.
type ItemRecord = TaskListItemRaw['primary_item'];

type ItemsStoreState = {
  itemsById: Record<string, ItemRecord>;
  setMany: (items: ItemRecord[]) => void;
  patch: (itemId: string, patch: Partial<ItemRecord>) => void;
};

export const useItemsStore = create<ItemsStoreState>((set) => ({
  itemsById: {},

  setMany: (items) =>
    set((state) => {
      const next = { ...state.itemsById };
      for (const item of items) next[item.client_id] = item;
      return { itemsById: next };
    }),

  patch: (itemId, patch) =>
    set((state) => {
      const existing = state.itemsById[itemId];
      if (!existing) return state;
      return { itemsById: { ...state.itemsById, [itemId]: { ...existing, ...patch } } };
    }),
}));
```

**`features/tasks/store/task-list-images.store.ts`**

Stores `ImageViewModel[]` per item client_id. First image has `isFullyLoaded: true`, rest have `isFullyLoaded: false`.

```ts
import { create } from 'zustand';
import type { ImageViewModel } from '@/features/images/types';

type TaskListImagesStoreState = {
  imagesByItemId: Record<string, ImageViewModel[]>;
  setForItem: (itemId: string, images: ImageViewModel[]) => void;
  patchImage: (itemId: string, imageClientId: string, patch: Partial<ImageViewModel>) => void;
};

export const useTaskListImagesStore = create<TaskListImagesStoreState>((set) => ({
  imagesByItemId: {},

  setForItem: (itemId, images) =>
    set((state) => ({
      imagesByItemId: { ...state.imagesByItemId, [itemId]: images },
    })),

  patchImage: (itemId, imageClientId, patch) =>
    set((state) => {
      const images = state.imagesByItemId[itemId];
      if (!images) return state;
      return {
        imagesByItemId: {
          ...state.imagesByItemId,
          [itemId]: images.map((img) =>
            img.clientId === imageClientId ? { ...img, ...patch } : img,
          ),
        },
      };
    }),
}));
```

### Step 6 — Create `features/tasks/store/tasks-page.store.ts`

Holds UI filter state shared between the header and the flow.

```ts
import { create } from 'zustand';
import type { TaskState, TaskTypeFilter } from '@/features/tasks/types';

type TasksPageStoreState = {
  taskType: TaskTypeFilter;   // 'all' = no type filter applied; persists across navigation
  taskStates: TaskState[];
  q: string;
  setTaskType: (v: TaskTypeFilter) => void;
  setTaskStates: (v: TaskState[]) => void;
  setQ: (v: string) => void;
  reset: () => void;
};

const INITIAL: Pick<TasksPageStoreState, 'taskType' | 'taskStates' | 'q'> = {
  taskType: 'all',
  taskStates: [],
  q: '',
};

export const useTasksPageStore = create<TasksPageStoreState>((set) => ({
  ...INITIAL,
  setTaskType: (v) => set({ taskType: v }),
  setTaskStates: (v) => set({ taskStates: v }),
  setQ: (v) => set({ q: v }),
  reset: () => set(INITIAL),
}));
```

### Step 7 — Create `features/tasks/api/use-list-tasks-query.ts`

Uses `useInfiniteQuery`. Normalizes each page into stores inside the `queryFn`. Returns the query plus a `loadMore` callback.

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { toImageAnnotationViewModel, type ImageViewModel } from '@/features/images/types';
import { taskKeys } from './task-keys';
import { listTasks } from './list-tasks';
import { useTasksStore } from '../store/tasks.store';
import { useItemsStore } from '../store/items.store';
import { useTaskListImagesStore } from '../store/task-list-images.store';
import type { ListTasksFullParams, TaskListItemRaw } from '../types';

const PAGE_LIMIT = 25;

function toImageViewModelFromListItem(
  raw: TaskListItemRaw['item_images'][number],
  itemClientId: string,
  index: number,
): ImageViewModel {
  const isFirst = index === 0;
  // item_images is z.record(string, unknown) so values are unknown — cast once here.
  const r = raw as {
    client_id: string;
    image_url: string;
    width_px?: number | null;
    height_px?: number | null;
    file_size_bytes?: number | null;
    created_at?: string;
    image_annotation?: Parameters<typeof toImageAnnotationViewModel>[0] | null;
    image_annotations?: Parameters<typeof toImageAnnotationViewModel>[0][];
  };

  const annotation =
    isFirst && r.image_annotation != null
      ? (() => {
          try {
            return toImageAnnotationViewModel(r.image_annotation!);
          } catch {
            return null;
          }
        })()
      : null;
  const annotations =
    isFirst && Array.isArray(r.image_annotations)
      ? r.image_annotations.map(toImageAnnotationViewModel)
      : [];

  return {
    clientId: r.client_id,
    linkClientId: null,
    entityType: 'item',
    entityClientId: itemClientId,
    imageUrl: r.image_url,
    localObjectUrl: null,
    displayOrder: index,
    widthPx: r.width_px ?? null,
    heightPx: r.height_px ?? null,
    fileSizeBytes: r.file_size_bytes ?? null,
    createdAt: isFirst ? (r.created_at ?? null) : null,
    uploadState: 'completed',
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation,
    annotations,
    isFullyLoaded: isFirst,
  };
}

// Calling .getState() inside queryFn is intentional: Zustand mutations are synchronous
// and safe outside React. This distributes paginated data into entity stores without
// coupling normalization to the component lifecycle.
function normalizePageIntoStores(items: TaskListItemRaw[]): void {
  const { setMany: setTasks, setTaskItemRelation } = useTasksStore.getState();
  const { setMany: setItems } = useItemsStore.getState();
  const { setForItem } = useTaskListImagesStore.getState();

  setTasks(items.map((r) => r.task));
  setItems(items.map((r) => r.primary_item));

  for (const r of items) {
    setTaskItemRelation(r.task.client_id, r.primary_item.client_id);
    const imageVMs = r.item_images.map((img, idx) =>
      toImageViewModelFromListItem(img, r.primary_item.client_id, idx),
    );
    setForItem(r.primary_item.client_id, imageVMs);
  }
}

export function useListTasksQuery(params: Omit<ListTasksFullParams, 'limit' | 'offset'>) {
  const query = useInfiniteQuery({
    queryKey: taskKeys.list({ ...params, limit: PAGE_LIMIT }),
    queryFn: async ({ pageParam }) => {
      const result = await listTasks({
        ...params,
        limit: PAGE_LIMIT,
        offset: pageParam as number,
      });
      normalizePageIntoStores(result.items);
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
  });

  return {
    query,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
  };
}
```

### Step 8 — Create `features/tasks/flows/use-tasks-page.flow.ts`

Reads filter from the page store, debounces the search query, calls the list query, and stitches `TaskCardViewModel[]` from stores.

```ts
import { useEffect, useMemo, useState } from 'react';
import type { TaskId, CustomerId } from '@/types/common';
import type { Item } from '@/features/items/types';
import { toTaskViewModel } from '@/features/tasks/types';
import type {
  TaskCardViewModel,
  TaskType,
  TaskPriority,
  TaskState,
  TaskReturnSource,
  TaskItemLocation,
  TaskReturnMethod,
  TaskFulfillmentMethod,
} from '../types';
import { useTasksPageStore } from '../store/tasks-page.store';
import { useTasksStore } from '../store/tasks.store';
import { useItemsStore } from '../store/items.store';
import { useTaskListImagesStore } from '../store/task-list-images.store';
import { useListTasksQuery } from '../api/use-list-tasks-query';

export type TasksPageFlow = {
  cards: TaskCardViewModel[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
};

export function useTasksPageFlow(): TasksPageFlow {
  const { taskType, taskStates, q } = useTasksPageStore();
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timeout);
  }, [q]);

  const params = useMemo(
    () => ({
      ...(taskType !== 'all' ? { task_types: taskType } : {}),
      ...(taskStates.length > 0 ? { task_states: taskStates.join(',') } : {}),
      ...(debouncedQ ? { q: debouncedQ } : {}),
    }),
    [taskType, taskStates, debouncedQ],
  );

  const { query, loadMore } = useListTasksQuery(params);

  const tasksById = useTasksStore((s) => s.tasksById);
  const taskIdToItemId = useTasksStore((s) => s.taskIdToItemId);
  const itemsById = useItemsStore((s) => s.itemsById);
  const imagesByItemId = useTaskListImagesStore((s) => s.imagesByItemId);

  const orderedTaskIds = useMemo(
    () => query.data?.pages.flatMap((page) => page.items.map((item) => item.task.client_id)) ?? [],
    [query.data],
  );

  const cards = useMemo<TaskCardViewModel[]>(() => {
    return orderedTaskIds.flatMap((taskId) => {
      const taskRecord = tasksById[taskId];
      if (!taskRecord) return [];
      const itemId = taskIdToItemId[taskId] ?? null;
      const item = itemId ? (itemsById[itemId] ?? null) : null;
      const images = itemId ? (imagesByItemId[itemId] ?? []) : [];
      const firstImage = images[0] ?? null;

      // Build a minimal Task-compatible object for toTaskViewModel.
      const task = toTaskViewModel({
        id: taskRecord.client_id as TaskId,
        task_scalar_id: taskRecord.task_scalar_id,
        task_type: taskRecord.task_type as TaskType,
        priority: taskRecord.priority as TaskPriority,
        state: taskRecord.state as TaskState,
        return_source: taskRecord.return_source as TaskReturnSource | null,
        item_location: taskRecord.item_location as TaskItemLocation | null,
        return_method: taskRecord.return_method as TaskReturnMethod | null,
        fulfillment_method: taskRecord.fulfillment_method as TaskFulfillmentMethod | null,
        title: taskRecord.title,
        summary: taskRecord.summary,
        additional_details: taskRecord.additional_details,
        ready_by_at: taskRecord.ready_by_at,
        scheduled_start_at: taskRecord.scheduled_start_at,
        scheduled_end_at: taskRecord.scheduled_end_at,
        customer_id: taskRecord.customer_id as CustomerId | null,
        primary_phone_number: taskRecord.primary_phone_number,
        secondary_phone_number: null,
        primary_email: taskRecord.primary_email,
        secondary_email: null,
        address: null,
        created_at: taskRecord.created_at,
        created_by_id: null,
        updated_at: taskRecord.updated_at,
        updated_by_id: null,
        closed_at: taskRecord.closed_at,
        recorded_time_marked_wrong: false,
        taken_from_average: false,
      });

      return [
        {
          taskId,
          task,
          item: item as Item | null,
          firstImage,
          imageCount: images.length,
        } satisfies TaskCardViewModel,
      ];
    });
  }, [orderedTaskIds, tasksById, taskIdToItemId, itemsById, imagesByItemId]);

  return {
    cards,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    loadMore,
  };
}
```

### Step 9 — Create `features/tasks/surfaces.ts`

Three new surfaces: task detail slide, task actions sheet, task filter sheet.

```ts
import { lazy } from 'react';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const TASK_DETAIL_SURFACE_ID = 'task-detail-slide';
export const TASK_ACTIONS_SHEET_SURFACE_ID = 'task-actions-sheet';
export const TASK_FILTER_SHEET_SURFACE_ID = 'task-filter-sheet';

export type TaskDetailSurfaceProps = {
  taskId: string;
};

export type TaskActionsSurfaceProps = {
  taskId: string;
};

export const taskSurfaces: SurfaceRegistrations = {
  [TASK_DETAIL_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/tasks/TaskDetailSlidePage').then((m) => ({ default: m.TaskDetailSlidePage })),
    ),
  },
  [TASK_ACTIONS_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/tasks/TaskActionsSheetPage').then((m) => ({ default: m.TaskActionsSheetPage })),
    ),
  },
  [TASK_FILTER_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/tasks/TaskFilterSheetPage').then((m) => ({ default: m.TaskFilterSheetPage })),
    ),
  },
};
```

### Step 10 — Create stub pages

**`pages/tasks/TaskDetailSlidePage.tsx`**

```tsx
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useEffect } from 'react';
import type { TaskDetailSurfaceProps } from '@/features/tasks/surfaces';

export function TaskDetailSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskDetailSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Task');
    header?.setActions(null);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-muted-foreground">
      <p className="text-base font-medium">Task details</p>
      <p className="text-sm">Coming soon</p>
      <p className="text-xs text-border">{taskId}</p>
    </div>
  );
}
```

**`pages/tasks/TaskActionsSheetPage.tsx`**

```tsx
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useEffect } from 'react';
import type { TaskActionsSurfaceProps } from '@/features/tasks/surfaces';

export function TaskActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskActionsSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Actions');
    header?.setActions(null);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Actions coming soon</p>
      <p className="text-xs text-border">{taskId}</p>
    </div>
  );
}
```

**`pages/tasks/TaskFilterSheetPage.tsx`**

```tsx
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useEffect } from 'react';

export function TaskFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle('Filters');
    header?.setActions(null);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Filters coming soon</p>
    </div>
  );
}
```

### Step 11 — Update `app/surface-registry.ts`

Import `taskSurfaces` from `@/features/tasks` and spread it:

```ts
import { taskSurfaces } from '@/features/tasks';
// ... existing imports

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...taskCreationSurfaces,
  ...taskSurfaces,         // ADD THIS LINE after taskCreationSurfaces
  ...itemSurfaces,
  ...imageSurfaces,
  ...phoneInputSurfaces,
  ...upholsterySurfaces,
  ...workingSectionSurfaces,
};
```

### Step 12 — Extend `ImageViewModel` for on-demand loading

**Edit `features/images/types.ts`:**

1. Add `isFullyLoaded?: boolean` to `ImageViewModel`:

```ts
export type ImageViewModel = {
  // ... all existing fields ...
  isFullyLoaded?: boolean;  // undefined or true = fully loaded; false = light shape from list response
};
```

2. Update `toImageViewModel` to set `isFullyLoaded: true`:

```ts
export function toImageViewModel(entityImage: EntityImage): ImageViewModel {
  return {
    // ... existing mapping ...
    isFullyLoaded: true,
  };
}
```

Note: Existing `ImageViewModel` constructors in `use-entity-images.controller.ts` do not need updating — `isFullyLoaded` is optional and omitting it is treated as fully loaded.

**Edit `features/images/controllers/use-entity-images.controller.ts`:**

Add `enableOnDemandImageLoad?: boolean` to `ImageViewerSurfaceProps`:

```ts
export type ImageViewerSurfaceProps = {
  images: ImageViewModel[];
  initialImageClientId: string;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  mode: ImageViewerMode;
  onDelete?: (imageClientId: string) => void;
  enableOnDemandImageLoad?: boolean;  // ADD: when true, viewer fetches full image on swipe
};
```

**Edit `features/images/pages/ImageFullscreenViewerPage.tsx`:**

1. Destructure `enableOnDemandImageLoad` from surface props (defaults to `false`):

```ts
const {
  images: initialImages = [],
  initialImageClientId,
  entityType,
  entityClientId,
  mode = 'preview-only',
  onDelete,
  enableOnDemandImageLoad = false,   // ADD
} = useSurfaceProps<ImageViewerSurfaceProps>();
```

2. After the existing `activeIndex` state and `currentImage` derivation, add on-demand loading:

```ts
// On-demand full-image loading for light images (isFullyLoaded === false).
// Only fires when the current image is explicitly marked as a light shape.
// undefined and true are both treated as fully loaded — only strict false triggers a fetch.
const shouldLoadCurrentImage =
  enableOnDemandImageLoad && currentImage?.isFullyLoaded === false;

const onDemandQuery = useImageQuery(shouldLoadCurrentImage ? currentImageClientId : null);

useEffect(() => {
  if (!onDemandQuery.data || currentImage?.isFullyLoaded !== false) return;
  const fullImage = onDemandQuery.data;
  setImages((prev) =>
    prev.map((img) =>
      img.clientId === currentImage.clientId
        ? {
            ...img,
            isFullyLoaded: true,
            annotation: fullImage.image_annotation
              ? toImageAnnotationViewModel(fullImage.image_annotation)
              : null,
            annotations: (fullImage.image_annotations ?? []).map(toImageAnnotationViewModel),
          }
        : img,
    ),
  );
}, [onDemandQuery.data]);
```

Note: `useImageQuery` returns `{ data: Image | undefined, ... }`. The `Image` type has `image_annotation` and `image_annotations` fields. Import `toImageAnnotationViewModel` from `'../types'` which is already imported.

The `useImageQuery` hook is already imported at the top of the file; no new import needed.

### Step 13 — Create `features/tasks/components/TasksHeader.tsx`

Header with three sections: task type picker (collapses), search bar (always visible), state filter pills (collapses).

```tsx
import { m, AnimatePresence } from 'framer-motion';
import { BoxSlidePicker } from '@/components/primitives/box-slide-picker';
import { BoxPicker } from '@/components/primitives/box-picker';
import { SearchBar } from '@/components/primitives/search-bar';
import { TASK_TYPE_PICKER_OPTIONS, TASK_STATE_FILTER_OPTIONS } from '../types';
import type { TaskTypeFilter, TaskState } from '../types';

type TasksHeaderProps = {
  isCompact: boolean;
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  isLoading: boolean;
  activeFilterCount: number;
  onTaskTypeChange: (v: TaskTypeFilter) => void;
  onTaskStatesChange: (v: TaskState[]) => void;
  onQChange: (v: string) => void;
  onSortPress: () => void;
  onFilterPress: () => void;
};

const COLLAPSE_TRANSITION = { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const };

export function TasksHeader({
  isCompact,
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
      className="flex flex-col bg-background"
      data-testid="tasks-header"
    >
      {/* Collapsible: task type slide picker */}
      <AnimatePresence initial={false}>
        {!isCompact && (
          <m.div
            key="type-picker"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COLLAPSE_TRANSITION}
            className="overflow-hidden"
          >
            <div className="px-4 pt-3 pb-2">
              <BoxSlidePicker
                value={taskType}
                options={TASK_TYPE_PICKER_OPTIONS}
                size="sm"
                dataTestId="tasks-type-picker"
                onValueChange={onTaskTypeChange}
              />
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Always visible: search bar */}
      <div className="px-4 py-2">
        <SearchBar
          value={q}
          onChange={onQChange}
          onSortPress={onSortPress}
          onFilterPress={onFilterPress}
          placeholder="Search tasks…"
          isLoading={isLoading}
          activeFilterCount={activeFilterCount}
          wrapperClassName="bg-[var(--color-card)]"
          data-testid="tasks-search-bar"
        />
      </div>

      {/* Collapsible: state filter pills */}
      <AnimatePresence initial={false}>
        {!isCompact && (
          <m.div
            key="state-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COLLAPSE_TRANSITION}
            className="overflow-hidden"
          >
            <div className="pb-2 overflow-x-auto">
              <BoxPicker
                mode="multiple"
                value={taskStates}
                options={TASK_STATE_FILTER_OPTIONS}
                layout="stack"
                visualVariant="pill"
                showIcon={false}
                showDescription={false}
                className="flex flex-row gap-1.5 flex-nowrap px-4"
                data-testid="tasks-state-filter"
                onValueChange={onTaskStatesChange}
              />
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Blur/fade bottom separator — visible when list is scrolled */}
    </div>
  );
}
```

### Step 14 — Create `features/tasks/components/TaskListDecoyCard.tsx`

Placeholder card — used until real card design is ready. All interactions wired.

```tsx
type TaskListDecoyCardProps = {
  taskId: string;
  onTapImage: () => void;
  onTapActions: () => void;
  onTapCard: () => void;
};

export function TaskListDecoyCard({
  taskId,
  onTapImage,
  onTapActions,
  onTapCard,
}: TaskListDecoyCardProps): React.JSX.Element {
  return (
    <div
      className="relative mx-4 rounded-xl bg-card shadow-sm overflow-hidden"
      data-testid={`tasks-card-${taskId}`}
    >
      {/* Three-dot button */}
      <button
        aria-label="Task actions"
        className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/60 text-foreground"
        data-testid={`tasks-card-actions-${taskId}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTapActions();
        }}
      >
        <span className="flex flex-col gap-0.75 items-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-0.75 rounded-full bg-current" />
          ))}
        </span>
      </button>

      {/* Card body — tapping opens task detail */}
      <button
        className="w-full text-left"
        type="button"
        data-testid={`tasks-card-body-${taskId}`}
        onClick={onTapCard}
      >
        {/* Image thumbnail area — tapping opens image viewer */}
        <button
          aria-label="View item image"
          className="block w-full h-44 bg-muted"
          data-testid={`tasks-card-image-${taskId}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTapImage();
          }}
        />

        {/* Content placeholder */}
        <div className="p-4 flex flex-col gap-2">
          <div className="h-3.5 w-2/3 rounded-md bg-muted" />
          <div className="h-3 w-1/2 rounded-md bg-muted/60" />
          <div className="h-3 w-3/4 rounded-md bg-muted/40" />
        </div>
      </button>
    </div>
  );
}
```

### Step 15 — Update `features/tasks/controllers/use-tasks-view.controller.ts`

Replace the stub with the full controller:

```ts
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { IMAGE_VIEWER_SURFACE_ID } from '@/features/images/surfaces';
import type { ImageLinkEntityType } from '@/features/images/types';
import type { TaskTypeFilter, TaskState } from '../types';
import { useTasksPageFlow, type TasksPageFlow } from '../flows/use-tasks-page.flow';
import { useTasksPageStore } from '../store/tasks-page.store';
import { useTaskListImagesStore } from '../store/task-list-images.store';
import { useTasksStore } from '../store/tasks.store';
import {
  TASK_DETAIL_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
  type TaskDetailSurfaceProps,
  type TaskActionsSurfaceProps,
} from '../surfaces';

export type TasksViewController = TasksPageFlow & {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  activeFilterCount: number;
  setTaskType: (v: TaskTypeFilter) => void;
  setTaskStates: (v: TaskState[]) => void;
  setQ: (v: string) => void;
  openTaskDetail: (taskId: string) => void;
  openTaskActions: (taskId: string) => void;
  openFilterSheet: () => void;
  openSortSheet: () => void;
  openImageViewer: (taskId: string) => void;
};

export function useTasksViewController(): TasksViewController {
  const flow = useTasksPageFlow();
  const { taskType, taskStates, q, setTaskType, setTaskStates, setQ } = useTasksPageStore();
  const imagesByItemId = useTaskListImagesStore((s) => s.imagesByItemId);
  const taskIdToItemId = useTasksStore((s) => s.taskIdToItemId);

  const activeFilterCount = taskStates.length + (taskType !== 'all' ? 1 : 0);

  function openTaskDetail(taskId: string): void {
    useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  function openTaskActions(taskId: string): void {
    useSurfaceStore.getState().open(TASK_ACTIONS_SHEET_SURFACE_ID, {
      taskId,
    } satisfies TaskActionsSurfaceProps);
  }

  function openFilterSheet(): void {
    useSurfaceStore.getState().open(TASK_FILTER_SHEET_SURFACE_ID, {});
  }

  function openSortSheet(): void {
    // Sort sheet not yet implemented — no-op.
  }

  function openImageViewer(taskId: string): void {
    const itemId = taskIdToItemId[taskId] ?? null;
    if (!itemId) return;
    const images = imagesByItemId[itemId] ?? [];
    if (images.length === 0) return;
    const firstImage = images[0]!;
    useSurfaceStore.getState().open(IMAGE_VIEWER_SURFACE_ID, {
      images,
      initialImageClientId: firstImage.clientId,
      entityType: 'item' as ImageLinkEntityType,
      entityClientId: itemId,
      mode: 'preview-only',
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

### Step 16 — Rewrite `features/tasks/components/TasksView.tsx`

Full layout with collapsible header and paginated list.

```tsx
import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';

import { TasksHeader } from './TasksHeader';
import { TaskListDecoyCard } from './TaskListDecoyCard';
import { useTasksViewContext } from '../providers/TasksViewProvider';

export function TasksView(): React.JSX.Element {
  const controller = useTasksViewContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const scrollTop = el.scrollTop;
      setIsScrolled(scrollTop > 0);
      setIsCompact((prev) => {
        if (!prev && scrollTop > 56) return true;
        if (prev && scrollTop < 8) return false;
        return prev;
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex h-full flex-col" data-testid="tasks-view">
      {/* Collapsible header */}
      <TasksHeader
        isCompact={isCompact}
        taskType={controller.taskType}
        taskStates={controller.taskStates}
        q={controller.q}
        isLoading={controller.isLoading}
        activeFilterCount={controller.activeFilterCount}
        onTaskTypeChange={controller.setTaskType}
        onTaskStatesChange={controller.setTaskStates}
        onQChange={controller.setQ}
        onSortPress={controller.openSortSheet}
        onFilterPress={controller.openFilterSheet}
      />

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-x-hidden overflow-y-auto"
        data-testid="tasks-list-scroll"
      >
        {/* Blur/fade top overlay — matches staged form style */}
        <m.div
          animate={{ opacity: isScrolled ? 1 : 0 }}
          className="pointer-events-none sticky top-0 z-20 h-10 -mb-10 bg-linear-to-b from-background to-transparent mask-[linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
          initial={false}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />

        {/* Task list */}
        <div className="flex flex-col gap-3 pt-2 pb-[calc(var(--safe-bottom,0)+5.5rem)]" data-testid="tasks-list">
          {controller.cards.map((card) => (
            <TaskListDecoyCard
              key={card.taskId}
              taskId={card.taskId}
              onTapImage={() => controller.openImageViewer(card.taskId)}
              onTapActions={() => controller.openTaskActions(card.taskId)}
              onTapCard={() => controller.openTaskDetail(card.taskId)}
            />
          ))}

          {controller.isLoading && controller.cards.length === 0 && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="mx-4 h-64 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}
        </div>

        {/* Load more */}
        {controller.hasMore || controller.isFetchingMore ? (
          <div className="flex justify-center pb-6">
            <button
              className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
              data-testid="tasks-load-more-button"
              disabled={controller.isFetchingMore}
              type="button"
              onClick={controller.loadMore}
            >
              {controller.isFetchingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : controller.cards.length > 0 ? (
          <div className="flex justify-center pb-6">
            <span className="text-xs text-muted-foreground" data-testid="tasks-end-of-list">
              End of list
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

### Step 17 — Update `features/tasks/index.ts`

Add exports for new public API:

```ts
// existing exports (keep all)
// Add:
export { taskSurfaces } from './surfaces';
export { useTasksStore } from './store/tasks.store';
export { useItemsStore } from './store/items.store';
export { useTaskListImagesStore } from './store/task-list-images.store';
export { useTasksPageStore } from './store/tasks-page.store';
export type { TaskDetailSurfaceProps, TaskActionsSurfaceProps } from './surfaces';
export type {
  TaskType,
  TaskPriority,
  TaskState,
  TaskReturnSource,
  TaskItemLocation,
  TaskReturnMethod,
  TaskFulfillmentMethod,
  TaskTypeFilter,
  TaskListItemRaw,
  TaskCardViewModel,
  ListTasksFullParams,
  ImageLight,
} from './types';
```

### Step 18 — Fix `pages/tasks/TasksPage.tsx` container height

Change the wrapper `div` so `TasksView` can use `h-full`:

```tsx
// Before:
<div className="flex flex-col">

// After:
<div className="flex flex-1 flex-col min-h-0">
```

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change summary |
|---|---|
| `features/tasks/types.ts` | Add 7 derived type aliases (`TaskType`, `TaskPriority`, `TaskState`, etc.) + `TaskTypeFilter` sentinel; add `ImageLightSchema`, `TaskListItemRawSchema`, `ListTasksFullParams`, `TaskCardViewModel`, `TASK_STATE_FILTER_OPTIONS`, `TASK_TYPE_PICKER_OPTIONS` (with `'all'` as first option); extend `ListTasksParams` alias |
| `features/tasks/api/task-keys.ts` | Update `list()` to accept `ListTasksFullParams` |
| `features/tasks/controllers/use-tasks-view.controller.ts` | Replace stub with full controller wiring flow + store |
| `features/tasks/components/TasksView.tsx` | Full implementation: scroll-driven compact, header, list, load more |
| `features/tasks/index.ts` | Add `taskSurfaces`, store hooks, new types exports |
| `app/surface-registry.ts` | Import and spread `taskSurfaces` |
| `features/images/types.ts` | Add `isFullyLoaded?: boolean` to `ImageViewModel`; update `toImageViewModel` to set `isFullyLoaded: true` |
| `features/images/controllers/use-entity-images.controller.ts` | Add `enableOnDemandImageLoad?: boolean` to `ImageViewerSurfaceProps` |
| `features/images/pages/ImageFullscreenViewerPage.tsx` | Destructure `enableOnDemandImageLoad`; add on-demand loading effect |
| `pages/tasks/TasksPage.tsx` | Fix wrapper `div` to `flex flex-1 flex-col min-h-0` |

### New files to create

| Path (relative to `src/`) |
|---|
| `features/tasks/store/tasks.store.ts` |
| `features/tasks/store/items.store.ts` |
| `features/tasks/store/task-list-images.store.ts` |
| `features/tasks/store/tasks-page.store.ts` |
| `features/tasks/api/list-tasks.ts` |
| `features/tasks/api/get-task.ts` |
| `features/tasks/api/use-list-tasks-query.ts` |
| `features/tasks/flows/use-tasks-page.flow.ts` |
| `features/tasks/surfaces.ts` |
| `features/tasks/components/TasksHeader.tsx` |
| `features/tasks/components/TaskListDecoyCard.tsx` |
| `pages/tasks/TaskDetailSlidePage.tsx` |
| `pages/tasks/TaskActionsSheetPage.tsx` |
| `pages/tasks/TaskFilterSheetPage.tsx` |

## Risks and mitigations

- Risk: `TaskListItemRawSchema` — the `item_images` array uses `z.union([ImageSchemaFull, ImageLightSchema])`. Zod unions try first branch; if the full schema fails strict validation on a light image, it will silently fall through to the light schema. This is intended but may mask data issues.
  Mitigation: Log validation errors in dev. The light schema is intentionally permissive.

- Risk: `toTaskViewModel` in the flow requires a fully typed `Task` object, but the store holds a lighter `TaskRecord`. The mapping in the flow casts fields explicitly — if the store schema diverges from `Task`, TypeScript will catch mismatches at compile time.
  Mitigation: Run `npm run typecheck` before marking complete.

- Risk: `useImageQuery` in `ImageFullscreenViewerPage` is always enabled when the client ID is truthy. Passing `null` to disable it is the current approach; verify the hook's enabled logic handles `null` correctly.
  Mitigation: Read `use-image.ts` before editing the viewer page. If `null` is not handled, pass `undefined` instead.

- Risk: `IMAGE_VIEWER_SURFACE_ID` must be imported directly from `@/features/images/surfaces`. It is **not** re-exported from `@/features/images/index.ts` (confirmed by reading the file). Using the index import path will cause a missing-export error.
  Mitigation: Always import `IMAGE_VIEWER_SURFACE_ID` from `@/features/images/surfaces`, never from `@/features/images`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep tasks`: all existing tests still pass
- Manual: app loads, task list renders decoy cards, type picker filters, search bar queries, state pills filter, scroll collapses header, load more appends page, card image tap opens viewer, card body tap opens stub slide, three-dot tap opens stub sheet

## Review log

_(empty — awaiting implementation)_

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `davidloorenz`
