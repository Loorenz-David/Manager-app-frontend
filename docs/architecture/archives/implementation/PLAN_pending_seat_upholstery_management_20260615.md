# PLAN_pending_seat_upholstery_management_20260615

## Metadata

- Plan ID: `PLAN_pending_seat_upholstery_management_20260615`
- Status: `archived`
- Owner agent: `planner-architect`
- Created at (UTC): `2026-06-15T14:00:00Z`
- Last updated at (UTC): `2026-06-15T15:54:05Z`
- Related issue/ticket: `N/A`
- Intention plan: `docs/architecture/under_construction/intention/upholstery_management_2.txt`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_seat_tasks_pending_upholstery_20260615.md`

---

## Goal and intent

- **Goal:** Implement a manager-facing "Pending Seat Upholstery" workflow — a full slide page listing seat tasks that are missing upholstery selection or quantity, with direct inline actions to resolve them without leaving the page.
- **Business/user intent:** Managers can quickly identify and fix seat tasks blocked on missing upholstery data from a single focused screen. The home screen shows how many tasks are pending so nothing is overlooked.
- **Non-goals:** New upholstery catalog management, sorting, advanced filter sheets, bulk assignment, a general backend redesign, replacing the existing task-detail page or image viewer, any functional three-dot actions beyond "Coming soon".

---

## Scope

- **In scope:**
  - New `src/features/pending-upholstery/` feature folder with all domain code
  - New `GET /api/v1/item-upholsteries/pending-seat-tasks` fetch + query
  - New `GET /api/v1/item-upholsteries/pending-seat-tasks/counts` fetch + query
  - New pending-seat query key factory
  - New compact-count formatter + unit tests
  - New `PendingUpholsterySlidePage` with custom header, scrollable body, absolute footer
  - New `PendingUpholsteryHeader` with search + collapse-on-scroll filter pills
  - New `PendingUpholsteryCard` wrapping the extended `TaskListCard` with a direct action row
  - New surface registration `PENDING_UPHOLSTERY_SLIDE_ID`
  - Extending `TaskListCard` with an optional `bottomAction` slot prop (non-breaking)
  - Updating `useCreateItemUpholstery` and `useSetUpholsteryQuantity` mutation hooks to also invalidate pending seat keys (mutation ownership pattern)
  - Updating `HomeView` with a pending-upholstery count button
  - Updating `surface-registry.ts` to register the new surface

- **Out of scope:** Everything listed in intention doc section 22.

- **Assumptions:**
  - `item_upholstery_id: string | null` is confirmed in the backend response (handoff updated 2026-06-15). `null` when `missing_selection`, non-null `client_id` when `missing_quantity`. No backend gap remains.
  - The existing `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID` calling pattern (requiring both `taskId` and `itemUpholsteryId`) is reused unchanged. The sheet internally calls `useGetTaskQuery(taskId)` — one additional network call per user tap on a missing-quantity row, which is acceptable.

---

## Clarifications required

- [x] ~~**Backend must add `item_upholstery_id` to the pending list row**~~ — **Resolved 2026-06-15.** The backend handoff has been updated to confirm `item_upholstery_id: string | null` is present on every row. `null` when `pending_upholstery_reason === "missing_selection"`, non-null `ItemUpholstery.client_id` when `pending_upholstery_reason === "missing_quantity"`. Codex must include this field in `PendingSeatTaskRowSchema` and the DTO mapping. No further backend work is required.

_No open clarifications remain. Codex may implement all steps including the missing-quantity direct action._

---

## Acceptance criteria

1. The manager home screen shows "Select upholstery (N)" using the counts endpoint where N = `missing_selection_total + missing_quantity_total` and the count uses the compact formatter.
2. Tapping the home button opens `PendingUpholsterySlidePage` as a slide surface with a custom absolute header.
3. The page defaults to `missing_selection=true, missing_quantity=false` on first load.
4. The search bar sends `q` debounced (~300 ms), resetting pagination on change.
5. Filter pills correctly send each combination of boolean flags to the backend.
6. Every card's direct action is derived from `pending_upholstery_reason`, not from the active filter.
7. `missing_selection` rows open `UPHOLSTERY_PICKER_SLIDE_ID`; on `onSelect` the `createItemUpholstery` mutation fires.
8. `missing_quantity` rows open `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID` with the correct `itemUpholsteryId` (from the backend-supplied field).
9. Safe optimistic updates remove resolved rows from matching bucket caches; `onError` restores snapshots.
10. `onSettled` of both mutations invalidates `pendingSeatUpholsteryKeys.all` (and counts), `itemUpholsteryKeys.byItem(itemId)`, `taskKeys.detail(taskId)`.
11. Home count stays in sync after mutations via shared query key invalidation — no callback props through surfaces.
12. The picker and amount sheet remain generic; they have no knowledge of pending-seat query keys.
13. No per-card item-upholstery API requests at render time.
14. Scroll down hides filter pills and footer; scroll up reveals them.
15. Pull-to-refresh refreshes list and counts.
16. Automated tests cover query parameters, filter combinations, reason classification, optimistic behavior, count formatting, and surface navigation.

---

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: React Query usage, query key factory, `onSettled` invalidation pattern
- `architecture/08_hooks.md`: mutation hook and action hook patterns
- `architecture/23_providers.md`: controller + provider + context pattern
- `architecture/24_dto.md`: response-to-view-model mapping layer

### Local extensions loaded

- N/A

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
- Reading `src/features/tasks/components/TaskListCard.tsx` to see the exact current prop interface before adding `bottomAction`
- Reading `src/features/tasks/surfaces.ts` for exact `ItemUpholsteryAmountSurfaceProps` shape
- Reading `src/features/upholstery/surfaces.ts` for `UPHOLSTERY_PICKER_SLIDE_ID` export name
- Reading `src/features/items/actions/use-create-item-upholstery.ts` to see existing `onSettled` before extending it
- Reading `src/features/items/actions/use-set-upholstery-quantity.ts` same
- Reading `src/app/surface-registry.ts` before adding the new surface spread
- Reading `src/features/home/components/HomeView.tsx` before editing
- Reading `packages/tasks/src/api/item-upholstery-keys.ts` for `itemUpholsteryKeys.byItem` call signature

### Skill selection

- Primary skill: N/A (implementation plan, not a code task)

---

## Verified current architecture

This section documents what the planner confirmed by reading the actual files before writing the plan. Codex must not re-derive these facts by reading the same files again.

### Surface system
- Surfaces are registered in `src/app/surface-registry.ts` as a spread of feature-level `SurfaceRegistrations` objects.
- A feature's surfaces file exports a const `{ [SURFACE_ID]: { surface: "slide"|"sheet", component } }`.
- `useSurface()` from `@/hooks/use-surface.ts` provides `open(id, props)`.
- `useSurfaceProps<T>()` from `@/hooks/use-surface-props.ts` gives the typed props inside a surface component.
- `useSurfaceHeader()` from `@/hooks/use-surface-header.ts` exposes `setTitle`, `setHeaderHidden`, `requestClose`.
- To hide the generic slide page header, call `header?.setHeaderHidden(true)` inside the page component.

### Relevant surface IDs (confirmed)
- `TASK_DETAIL_SURFACE_ID = "task-detail-slide"` — in `src/features/tasks/surfaces.ts`
- `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID = "item-upholstery-amount-sheet"` — same file
- `TASK_ACTIONS_SHEET_SURFACE_ID = "task-actions-sheet"` — same file
- `UPHOLSTERY_PICKER_SLIDE_ID = "upholstery-picker"` — in `src/features/upholstery/surfaces.ts`
- `IMAGE_VIEWER_SURFACE_ID` — from `@beyo/images` package; already in `imageSurfaces` spread

### ItemUpholsteryAmountSurfaceProps (confirmed)
```typescript
// src/features/tasks/surfaces.ts
export type ItemUpholsteryAmountSurfaceProps = {
  taskId: string;
  itemUpholsteryId: string;  // non-nullable — requires backend addition
  showQuantityChangedWarning?: boolean;
  prefill?: { amountMeters: number | null };
};
```
The sheet internally resolves `itemId` via `useGetTaskQuery(taskId)` and then calls `useItemUpholsteryQuery(itemId)`.

### UpholsteryPickerSlidePage props (confirmed)
```typescript
// src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx
type UpholsteryPickerSlidePageProps = {
  currentClientId?: string | null;
  onSelect?: (clientId: string) => void;
};
```

### TaskListCard current props (confirmed)
```typescript
// src/features/tasks/components/TaskListCard.tsx
type TaskListCardProps = {
  card: TaskCardViewModel;
  onTapImage: (taskId: string) => void;
  onTapActions: (taskId: string) => void;
  onTapCard: (taskId: string) => void;
};
```
The card renders: image (w-28 square), body with article label / state pill / three-dot button, type icon, date. Outer div is `mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm`.

### TasksHeader collapse pattern (confirmed)
```typescript
const COLLAPSE = "grid transition-[grid-template-rows,opacity] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]";
// collapsed: "grid-rows-[0fr] opacity-0"
// expanded:  "grid-rows-[1fr] opacity-100"
// requires: inner div with "min-h-0 overflow-hidden"
```

### TasksView scroll pattern (confirmed)
```tsx
const { scrollRef, isHidden: isCompact } = useScrollVisibility({ mode: "relative" });

<div className="relative flex-1 min-h-0">
  <div className="absolute inset-x-0 top-0 z-10">{/* absolute header */}</div>
  <PullToRefresh
    className="absolute inset-0"
    scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
    scrollRef={scrollRef}
    onRefresh={controller.refetch}
    indicatorOffset={176}
  >
    <div className="pt-44">{/* content with top padding matching header height */}
      ...load more / end of list...
    </div>
  </PullToRefresh>
</div>
```

### Mutation hooks (confirmed)
- `useCreateItemUpholstery(taskId, itemId)` — in `src/features/items/actions/use-create-item-upholstery.ts`
  - `onSettled`: invalidates `taskKeys.detail(taskId)`, `taskKeys.lists()`, `upholsteryKeys.pickerLists()`, `itemUpholsteryKeys.byItem(itemId)` (if itemId)
- `useSetUpholsteryQuantity(taskId, itemId)` — in `src/features/items/actions/use-set-upholstery-quantity.ts`
  - `onSettled`: same pattern as above

### Query key factories (confirmed)
```typescript
// @beyo/tasks package
itemUpholsteryKeys.all   // ["item-upholstery"]
itemUpholsteryKeys.byItem(itemId)  // ["item-upholstery", "by-item", itemId]

// src/features/tasks/api/task-keys.ts
taskKeys.detail(taskId)   // ["tasks", "detail", taskId]
taskKeys.lists()           // ["tasks", "list"]

// src/features/upholstery/api/upholstery-keys.ts
upholsteryKeys.pickerLists()  // ["upholsteries", "picker", "list"]
```

### Home screen (confirmed)
`src/features/home/components/HomeView.tsx` is currently a minimal stub:
```tsx
export function HomeView(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Home</h1>
    </div>
  );
}
```

---

## Implementation plan

Steps are numbered. Each step is a discrete unit of work. Codex should complete and validate each step before starting the next.

---

### Step 1 — Define types

**File to create:** `src/features/pending-upholstery/types.ts`

Define these types. Use Zod schemas that match the backend response (snake_case). Export the inferred TypeScript types alongside.

```typescript
// Pending reason union
export const PENDING_UPHOLSTERY_REASON = ["missing_selection", "missing_quantity"] as const;
export type PendingUpholsteryReason = typeof PENDING_UPHOLSTERY_REASON[number];
export const PendingUpholsteryReasonSchema = z.enum(PENDING_UPHOLSTERY_REASON);

// Light image shape — safe for all images in the response (full or light)
export const PendingSeatImageSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  width_px: z.number(),
  height_px: z.number(),
  file_size_bytes: z.number(),
});
export type PendingSeatImage = z.infer<typeof PendingSeatImageSchema>;

// Task shape — reuse existing Task schema if exported, or inline a partial schema
// matching only the fields used: client_id, task_scalar_id, task_type, priority, state,
// title, summary, ready_by_at, return_source, is_overdue (check if present)
// Safest approach: import TaskSchema from @/features/tasks/types if exported, otherwise
// define a local schema with z.object({ ... }).passthrough() to tolerate extra fields.
// Codex: read src/features/tasks/types.ts to confirm what is exported.

// Primary item shape — import Item from items/types or inline partial
// Must include: client_id, article_number, sku, quantity,
//   item_major_category_snapshot, item_category_snapshot
// Must handle null (primary_item is nullable)

// Full pending row — NOTE: item_upholstery_id added by backend (see Clarifications)
export const PendingSeatTaskRowSchema = z.object({
  task: TaskSchema,          // from existing types
  primary_item: ItemSchema.nullable(),
  pending_upholstery_reason: PendingUpholsteryReasonSchema,
  item_upholstery_id: z.string().nullable(),  // null for missing_selection, non-null for missing_quantity
  item_images: z.array(PendingSeatImageSchema),
});
export type PendingSeatTaskRow = z.infer<typeof PendingSeatTaskRowSchema>;

// List params
export type ListPendingSeatTasksParams = {
  limit?: number;
  offset?: number;
  q?: string;
  missing_selection: boolean;
  missing_quantity: boolean;
};

// Counts
export type PendingSeatCounts = {
  missing_selection_total: number;
  missing_quantity_total: number;
};

// Card view model (DTO output)
export type PendingSeatCardViewModel = {
  taskId: string;
  task: Task;
  primaryItem: Item | null;
  firstImageUrl: string | null;
  images: PendingSeatImage[];
  pendingReason: PendingUpholsteryReason;
  itemUpholsteryId: string | null;
  isMutationPending: boolean;
};
```

**Important:** For `TaskSchema` and `ItemSchema`, Codex must read `src/features/tasks/types.ts` and `src/features/items/types.ts` to use the existing schemas rather than duplicating them. If the existing schemas export more fields than the pending endpoint returns, use `.pick()` or `.partial()` as needed, or accept extra fields with `.passthrough()`.

---

### Step 2 — Query key factory

**File to create:** `src/features/pending-upholstery/api/pending-seat-keys.ts`

```typescript
import type { ListPendingSeatTasksParams } from "../types";

export const pendingSeatUpholsteryKeys = {
  all: ["pending-seat-upholstery"] as const,
  lists: () => [...pendingSeatUpholsteryKeys.all, "list"] as const,
  list: (params: ListPendingSeatTasksParams) =>
    [...pendingSeatUpholsteryKeys.lists(), params] as const,
  counts: () => [...pendingSeatUpholsteryKeys.all, "counts"] as const,
};
```

---

### Step 3 — API fetch functions

**File to create:** `src/features/pending-upholstery/api/fetch-pending-seat-tasks.ts`

```typescript
import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import { PendingSeatTaskRowSchema } from "../types";
import type { ListPendingSeatTasksParams } from "../types";

const PendingSeatTasksResponseSchema = ApiEnvelopeSchema(
  z.object({
    tasks_pagination: z.object({
      items: z.array(PendingSeatTaskRowSchema),
      limit: z.number(),
      offset: z.number(),
      has_more: z.boolean(),
    }),
  }),
);

export type PendingSeatTasksPage = {
  items: PendingSeatTaskRow[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export async function fetchPendingSeatTasks(
  params: ListPendingSeatTasksParams,
): Promise<PendingSeatTasksPage> {
  const response = await apiClient.get(
    "/api/v1/item-upholsteries/pending-seat-tasks",
    PendingSeatTasksResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      ...(params.q && params.q.trim() ? { q: params.q.trim() } : {}),
      missing_selection: params.missing_selection,
      missing_quantity: params.missing_quantity,
    },
  );
  const p = response.data.tasks_pagination;
  return {
    items: p.items,
    limit: p.limit,
    offset: p.offset,
    hasMore: p.has_more,
  };
}
```

**File to create:** `src/features/pending-upholstery/api/fetch-pending-seat-task-counts.ts`

```typescript
import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import type { PendingSeatCounts } from "../types";

const PendingSeatCountsResponseSchema = ApiEnvelopeSchema(
  z.object({
    missing_selection_total: z.number(),
    missing_quantity_total: z.number(),
  }),
);

export async function fetchPendingSeatTaskCounts(): Promise<PendingSeatCounts> {
  const response = await apiClient.get(
    "/api/v1/item-upholsteries/pending-seat-tasks/counts",
    PendingSeatCountsResponseSchema,
  );
  return {
    missing_selection_total: response.data.missing_selection_total,
    missing_quantity_total: response.data.missing_quantity_total,
  };
}
```

---

### Step 4 — Query hooks

**File to create:** `src/features/pending-upholstery/api/use-pending-seat-tasks-query.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { fetchPendingSeatTasks } from "./fetch-pending-seat-tasks";
import { pendingSeatUpholsteryKeys } from "./pending-seat-keys";
import type { ListPendingSeatTasksParams } from "../types";

export function usePendingSeatTasksQuery(params: ListPendingSeatTasksParams) {
  return useQuery({
    queryKey: pendingSeatUpholsteryKeys.list(params),
    queryFn: () => fetchPendingSeatTasks(params),
    placeholderData: (prev) => prev,  // preserve data during background refetch
  });
}
```

**File to create:** `src/features/pending-upholstery/api/use-pending-seat-counts-query.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { fetchPendingSeatTaskCounts } from "./fetch-pending-seat-task-counts";
import { pendingSeatUpholsteryKeys } from "./pending-seat-keys";

export function usePendingSeatCountsQuery() {
  return useQuery({
    queryKey: pendingSeatUpholsteryKeys.counts(),
    queryFn: fetchPendingSeatTaskCounts,
  });
}
```

---

### Step 5 — Compact count formatter

**File to create:** `src/features/pending-upholstery/lib/format-compact-count.ts`

```typescript
export function formatCompactCount(count: number): string {
  if (count < 1000) return String(count);
  const tenths = Math.round(count / 100);  // e.g. 11_000 → 110
  const k = tenths / 10;                   // → 11.0
  return k % 1 === 0 ? `${k}k` : `${k}k`; // both branches are identical — simplify to one
  // Correct logic:
  //   const rounded = Math.round(count / 100) / 10;
  //   return Number.isInteger(rounded) ? `${rounded}k` : `${rounded}k`;
  // Actually just:
  //   return `${Math.round(count / 100) / 10}k`;
  // but 10000 → Math.round(100) / 10 = 10 → "10k" ✓
  // 1000 → Math.round(10) / 10 = 1 → "1k" ✓
  // 1100 → Math.round(11) / 10 = 1.1 → "1.1k" ✓
  // 1500 → Math.round(15) / 10 = 1.5 → "1.5k" ✓
  // 9900 → Math.round(99) / 10 = 9.9 → "9.9k" ✓
}
```

Clean implementation for Codex:
```typescript
export function formatCompactCount(count: number): string {
  if (count < 1000) return String(count);
  return `${Math.round(count / 100) / 10}k`;
}
```

**File to create:** `src/features/pending-upholstery/lib/format-compact-count.test.ts`

```typescript
import { formatCompactCount } from "./format-compact-count";

describe("formatCompactCount", () => {
  it.each([
    [0, "0"],
    [1, "1"],
    [999, "999"],
    [1000, "1k"],
    [1100, "1.1k"],
    [1500, "1.5k"],
    [9900, "9.9k"],
    [10000, "10k"],
  ])("formatCompactCount(%i) → %s", (input, expected) => {
    expect(formatCompactCount(input)).toBe(expected);
  });
});
```

---

### Step 6 — DTO mapping

**File to create:** `src/features/pending-upholstery/lib/pending-seat-dto.ts`

```typescript
import type { PendingSeatTaskRow, PendingSeatCardViewModel } from "../types";

export function toPendingSeatCardViewModel(
  row: PendingSeatTaskRow,
  isMutationPending: boolean,
): PendingSeatCardViewModel {
  return {
    taskId: row.task.client_id,
    task: row.task,
    primaryItem: row.primary_item,
    firstImageUrl: row.item_images[0]?.image_url ?? null,
    images: row.item_images,
    pendingReason: row.pending_upholstery_reason,
    itemUpholsteryId: row.item_upholstery_id,
    isMutationPending,
  };
}
```

---

### Step 7 — Controller

**File to create:** `src/features/pending-upholstery/controllers/use-pending-upholstery.controller.ts`

The controller owns: filter state, immediate search state, debounced query value, accumulated pages, row-level mutation pending tracking, and navigation handlers.

```typescript
// Rough interface — Codex must implement this fully
export function usePendingUpholsteryController() {
  // Filter state
  const [missingSelection, setMissingSelection] = useState(true);
  const [missingQuantity, setMissingQuantity] = useState(false);

  // Search state (immediate for input binding, debounced for query)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  // Debounce debouncedQ ~300ms after searchInput changes
  // Reset offset/accumulated pages when debouncedQ or filters change

  // Pagination state (offset-based, accumulated pages)
  const [offset, setOffset] = useState(0);
  const [accumulatedItems, setAccumulatedItems] = useState<PendingSeatTaskRow[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Row-level mutation pending set (taskId strings)
  const [mutatingTaskIds, setMutatingTaskIds] = useState<Set<string>>(new Set());

  // Queries
  const listQuery = usePendingSeatTasksQuery({
    missing_selection: missingSelection,
    missing_quantity: missingQuantity,
    q: debouncedQ || undefined,
    offset,
    limit: 50,
  });
  const countsQuery = usePendingSeatCountsQuery();

  // Accumulate pages on new query results
  // When offset === 0 (filter/search reset), replace accumulated items
  // When offset > 0 (load more), deduplicate by taskId and append

  // View models
  const cards = accumulatedItems.map((row) =>
    toPendingSeatCardViewModel(row, mutatingTaskIds.has(row.task.client_id))
  );

  // Surface
  const surface = useSurface();

  return {
    // Filter
    missingSelection, missingQuantity,
    setFilters: (sel: boolean, qty: boolean) => { /* at least one must remain true */ },

    // Search
    searchInput, setSearchInput,

    // Loading states
    isInitialLoading: listQuery.isPending && accumulatedItems.length === 0,
    isBackgroundLoading: listQuery.isFetching && accumulatedItems.length > 0,
    isError: listQuery.isError && accumulatedItems.length === 0,
    isFetchingMore,
    hasMore: listQuery.data?.hasMore ?? false,
    isPaginationError: /* ...pagination-level error state */,

    // Data
    cards,
    counts: countsQuery.data ?? null,
    countsError: countsQuery.isError,

    // Actions
    retry: listQuery.refetch,
    refetch: () => {
      void listQuery.refetch();
      void countsQuery.refetch();
    },
    loadMore: () => { /* increment offset, set isFetchingMore */ },
    openTaskDetail: (taskId: string) =>
      surface.open(TASK_DETAIL_SURFACE_ID, { taskId }),
    openImageViewer: (images: PendingSeatImage[], firstClientId: string) =>
      surface.open(IMAGE_VIEWER_SURFACE_ID, { images: mapToImageViewerShape(images), initialImageClientId: firstClientId }),
    openTaskActions: (taskId: string) =>
      surface.open(PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID, { taskId }),
    openUpholsteryPicker: (itemId: string, onSelect: (upholsteryClientId: string) => void) =>
      surface.open(UPHOLSTERY_PICKER_SLIDE_ID, { currentClientId: null, onSelect }),
    openAmountSheet: (taskId: string, itemUpholsteryId: string) =>
      surface.open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, { taskId, itemUpholsteryId }),
    close: () => surface.closeTop(),

    // Mark row as mutating (used by card)
    markMutating: (taskId: string) => { /* add to set */ },
    clearMutating: (taskId: string) => { /* remove from set */ },
  };
}
```

**Image viewer mapping:** The `IMAGE_VIEWER_SURFACE_ID` from `@beyo/images` expects image objects with specific fields. Codex must read the `@beyo/images` package to confirm the exact shape and write a `mapToImageViewerShape` helper. Only use `client_id`, `image_url`, `width_px`, `height_px`, `file_size_bytes` since those are guaranteed on all images.

**Filter guard:** `setFilters` must enforce at least one filter remaining active. If the user tries to deselect the only active filter, ignore the action.

**Page reset:** When `debouncedQ` or filters change, reset `offset` to 0, clear `accumulatedItems`.

**Pagination implementation detail:** On `loadMore`, increment `offset` by `listQuery.data.limit`. Merge the incoming page into `accumulatedItems` by appending and deduplicating by `task.client_id` (task IDs are used as the dedup key).

---

### Step 8 — Optimistic update hooks for pending-page mutations

The controller delegates mutation calls to the card component, which calls feature-specific mutation hooks that wrap the existing `useCreateItemUpholstery` and `useSetUpholsteryQuantity` hooks and layer pending-page optimistic behavior on top.

**File to create:** `src/features/pending-upholstery/actions/use-pending-upholstery-create.ts`

This hook is responsible for the missing_selection direct action. It:
1. Calls `useCreateItemUpholstery(taskId, itemId)` from `src/features/items/actions/use-create-item-upholstery.ts`.
2. Layers optimistic list update on top via `queryClient` directly.

```
onMutate:
  - Cancel active pending-list queries (pendingSeatUpholsteryKeys.lists())
  - Cancel counts query (pendingSeatUpholsteryKeys.counts())
  - Snapshot list cache and counts cache
  - Remove the affected task row from missing_selection-only list cache variants
    (only remove from lists where missing_selection=true AND missing_quantity=false)
  - Decrement missing_selection_total by 1, clamped to 0
  - Return snapshot for rollback

onError:
  - Restore list and counts snapshots
  - Clear row mutation pending state

onSettled:
  - Invalidate pendingSeatUpholsteryKeys.lists()
  - Invalidate pendingSeatUpholsteryKeys.counts()
  (the base mutation's onSettled already invalidates taskKeys.detail and itemUpholsteryKeys.byItem)
```

**File to create:** `src/features/pending-upholstery/actions/use-pending-upholstery-set-quantity.ts`

Same structure, but for the missing_quantity direct action.

```
onMutate:
  - Cancel pending-list queries and counts
  - Snapshot
  - Remove the affected task row from:
    - missing_quantity-only list cache variants
    - combined (both=true) list cache variants
  - Decrement missing_quantity_total by 1, clamped to 0

onError:
  - Restore snapshots
  - Clear mutation pending state

onSettled:
  - Invalidate pendingSeatUpholsteryKeys.lists()
  - Invalidate pendingSeatUpholsteryKeys.counts()
```

**Alternative (simpler) approach if optimistic list manipulation is complex:**
Skip the list-item-removal optimistic step. Instead, just mark the row as `isMutationPending` (disabling its action button) and rely on post-settlement invalidation to remove it from the server-reconciled list. This is simpler and avoids cache snapshot complexity at the cost of immediate disappearance. Discuss with the user if the intention doc's requirement for "should disappear immediately" is hard-blocking.

---

### Step 9 — Extend useCreateItemUpholstery and useSetUpholsteryQuantity

These are the two existing mutation hooks that need to also invalidate pending seat keys so that mutations triggered from task-detail, the upholstery picker, or the amount sheet (all of which use these base hooks) automatically keep the pending page in sync.

**File to modify:** `src/features/items/actions/use-create-item-upholstery.ts`

In `onSettled`, add:
```typescript
void queryClient.invalidateQueries({ queryKey: pendingSeatUpholsteryKeys.all });
```

Import `pendingSeatUpholsteryKeys` from `@/features/pending-upholstery/api/pending-seat-keys`.

**File to modify:** `src/features/items/actions/use-set-upholstery-quantity.ts`

Same addition.

**Why here:** The picker and amount sheet are generic. They do not know about pending-seat query keys. By placing the invalidation in the mutation hooks (which are the domain-level mutation layer), all callers automatically trigger the reconciliation without any coupling through surface props.

---

### Step 10 — Pending task actions sheet (Coming soon)

**File to create:** `src/features/pending-upholstery/pages/PendingTaskActionsSheetPage.tsx`

A simple bottom sheet that renders "Coming soon" text. Follows the same minimal pattern as any other sheet page.

**Surface ID:** `PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID = "pending-upholstery-task-actions-sheet"`

**Props:**
```typescript
type PendingTaskActionsSheetProps = { taskId: string };
```

Content: display a label "Coming soon" centered. No actions.

---

### Step 11 — Surface registration

**File to create:** `src/features/pending-upholstery/surfaces.ts`

```typescript
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";

export const PENDING_UPHOLSTERY_SLIDE_ID = "pending-upholstery-slide";
export const PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID =
  "pending-upholstery-task-actions-sheet";

function loadPendingUpholsterySlidePage() {
  return import("./pages/PendingUpholsterySlidePage").then((m) => ({
    default: m.PendingUpholsterySlidePage,
  }));
}

function loadPendingTaskActionsSheetPage() {
  return import("./pages/PendingTaskActionsSheetPage").then((m) => ({
    default: m.PendingTaskActionsSheetPage,
  }));
}

const pendingUpholsterySlide = lazyWithPreload(loadPendingUpholsterySlidePage);
const pendingTaskActionsSheet = lazyWithPreload(loadPendingTaskActionsSheetPage);

export const pendingUpholsterySurfaces: SurfaceRegistrations = {
  [PENDING_UPHOLSTERY_SLIDE_ID]: {
    surface: "slide",
    component: pendingUpholsterySlide.Component,
  },
  [PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID]: {
    surface: "sheet",
    component: pendingTaskActionsSheet.Component,
  },
};
```

**File to modify:** `src/app/surface-registry.ts`

Add import and spread:
```typescript
import { pendingUpholsterySurfaces } from "@/features/pending-upholstery/surfaces";

export const surfaceRegistry: SurfaceRegistrations = {
  // ...existing spreads...
  ...pendingUpholsterySurfaces,
};
```

---

### Step 12 — Extend TaskListCard with a bottomAction slot

**File to modify:** `src/features/tasks/components/TaskListCard.tsx`

Change the props interface to add an optional `bottomAction` slot:
```typescript
type TaskListCardProps = {
  card: TaskCardViewModel;
  onTapImage: (taskId: string) => void;
  onTapActions: (taskId: string) => void;
  onTapCard: (taskId: string) => void;
  bottomAction?: React.ReactNode;  // new optional slot
};
```

In the render, append the slot below the existing body div, inside the outer card div:
```tsx
<div className="mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm flex-col">
  <div className="flex">
    {/* image button — unchanged */}
    {/* body div — unchanged */}
  </div>
  {bottomAction ? (
    <div className="border-t border-border">
      {bottomAction}
    </div>
  ) : null}
</div>
```

All existing usages of `TaskListCard` (in `TasksView`) pass no `bottomAction` and continue to work unchanged — the prop is optional and the slot is conditionally rendered.

---

### Step 13 — PendingUpholsteryCard component

**File to create:** `src/features/pending-upholstery/components/PendingUpholsteryCard.tsx`

This component:
1. Renders `TaskListCard` with the `card` prop mapped from `PendingSeatCardViewModel` to `TaskCardViewModel`.
2. Passes a `bottomAction` slot containing the direct upholstery action button.
3. Handles `onTapImage` by calling the controller's `openImageViewer` with the card's images.
4. Handles `onTapActions` by calling the controller's `openTaskActions`.
5. Handles `onTapCard` by calling the controller's `openTaskDetail`.

```typescript
type PendingUpholsteryCardProps = {
  card: PendingSeatCardViewModel;
  onTapImage: (images: PendingSeatImage[], firstClientId: string) => void;
  onTapActions: (taskId: string) => void;
  onTapCard: (taskId: string) => void;
  onDirectAction: (card: PendingSeatCardViewModel) => void;
};
```

**TaskCardViewModel mapping:**
`TaskCardViewModel` has `taskId`, `task`, `item`, `firstImage`. Map from `PendingSeatCardViewModel`:
- `taskId`: `card.taskId`
- `task`: `card.task`
- `item`: `card.primaryItem`
- `firstImage`: map `{ imageUrl: card.firstImageUrl, localObjectUrl: null }` or similar — Codex must read `TaskCardViewModel` type to confirm the exact `firstImage` shape

**Bottom action button:**
```tsx
const actionLabel = card.pendingReason === "missing_selection"
  ? "Select upholstery"
  : "Set upholstery amount";

<button
  type="button"
  aria-label={actionLabel}
  disabled={card.isMutationPending || (card.pendingReason === "missing_quantity" && !card.itemUpholsteryId)}
  className="w-full px-4 py-3 text-sm font-medium text-primary text-left disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  onClick={(e) => {
    e.stopPropagation();
    onDirectAction(card);
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
    }
  }}
>
  {card.isMutationPending ? "Saving…" : actionLabel}
</button>
```

**Defensive guard:** If `card.pendingReason === "missing_quantity"` and `card.itemUpholsteryId` is null, the button is disabled. In development mode, log a contract error to the console: `console.error("[PendingUpholsteryCard] missing_quantity row has no itemUpholsteryId — backend contract violation", card.taskId)`.

---

### Step 14 — PendingUpholsteryHeader component

**File to create:** `src/features/pending-upholstery/components/PendingUpholsteryHeader.tsx`

```typescript
type PendingUpholsteryHeaderProps = {
  isCompact: boolean;
  searchInput: string;
  missingSelection: boolean;
  missingQuantity: boolean;
  counts: PendingSeatCounts | null;
  countsError: boolean;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onFiltersChange: (sel: boolean, qty: boolean) => void;
  onBack: () => void;
};
```

**Row 1:** `flex items-center gap-2 px-4 py-2`
- Back arrow button (`ChevronLeft` or `ArrowLeft` from lucide-react): `aria-label="Close"`, calls `onBack()`
- `SearchBar` from `@/components/primitives` with `showSortButton={false}` `showFilterButton={false}` `value={searchInput}` `isLoading={isLoading}` `placeholder="Search pending tasks…"` `onChange={onSearchChange}`

**Row 2 (collapses):** Same `COLLAPSE` class pattern as `TasksHeader`:
```tsx
<div className={cn(COLLAPSE, isCompact ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100")}>
  <div className="min-h-0 overflow-hidden">
    <HorizontalScrollArea className="pb-1">
      <BoxPicker
        className="flex flex-nowrap flex-row gap-1.5 px-4"
        layout="stack"
        mode="multiple"
        options={filterOptions}
        size="sm"
        showDescription={false}
        showIcon={false}
        value={activeFilters}
        visualVariant="pill"
        onValueChange={handleFilterChange}
      />
    </HorizontalScrollArea>
  </div>
</div>
```

**Filter options:**
```typescript
const selCount = counts?.missing_selection_total ?? null;
const qtyCount = counts?.missing_quantity_total ?? null;

const filterOptions = [
  {
    value: "missing_selection",
    label: selCount !== null
      ? `Missing selection (${formatCompactCount(selCount)})`
      : "Missing selection",
  },
  {
    value: "missing_quantity",
    label: qtyCount !== null
      ? `Missing quantity (${formatCompactCount(qtyCount)})`
      : "Missing quantity",
  },
];
```

**Filter value mapping:** `value` is the array of currently active filter strings. Map back to `onFiltersChange(sel, qty)`.

**Filter guard at this level too:** When `handleFilterChange` receives a new array, if the array would be empty, ignore the change (keep current state). This prevents the zero-filter ambiguous state.

---

### Step 15 — Empty state component

**File to create:** `src/features/pending-upholstery/components/PendingUpholsteryEmptyState.tsx`

```typescript
type PendingUpholsteryEmptyStateProps = {
  missingSelection: boolean;
  missingQuantity: boolean;
  hasSearch: boolean;
};
```

Messages:
- `hasSearch`: "No matching pending upholstery tasks were found."
- `missingSelection && !missingQuantity`: "No seat tasks are missing an upholstery selection."
- `!missingSelection && missingQuantity`: "No seat tasks are missing an upholstery amount."
- `missingSelection && missingQuantity` (or both false): "No seat tasks have pending upholstery information."

---

### Step 16 — Skeleton component

**File to create:** `src/features/pending-upholstery/components/PendingUpholsterySkeleton.tsx`

Card-shaped skeleton matching the pending card's approximate height: image side (w-28 h-28 rounded section) and body side. Use `animate-pulse` and `bg-muted`. The card height should be approximately `h-36` (standard card with bottom action row).

---

### Step 17 — PendingUpholsterySlidePage (main page)

**File to create:** `src/features/pending-upholstery/pages/PendingUpholsterySlidePage.tsx`

```tsx
export function PendingUpholsterySlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = usePendingUpholsteryController();
  const { scrollRef, isHidden: isCompact } = useScrollVisibility({ mode: "relative" });

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  return (
    <div className="relative h-full min-h-0 flex flex-col bg-background">
      {/* Absolute header */}
      <div className="absolute inset-x-0 top-0 z-10">
        <PendingUpholsteryHeader
          isCompact={isCompact}
          searchInput={controller.searchInput}
          missingSelection={controller.missingSelection}
          missingQuantity={controller.missingQuantity}
          counts={controller.counts}
          countsError={controller.countsError}
          isLoading={controller.isBackgroundLoading}
          onSearchChange={controller.setSearchInput}
          onFiltersChange={controller.setFilters}
          onBack={controller.close}
        />
      </div>

      {/* Scrollable body */}
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
        indicatorOffset={HEADER_INDICATOR_OFFSET}
      >
        <div className={`pt-[${HEADER_CONTENT_OFFSET}px]`}>
          {/* Initial loading */}
          {controller.isInitialLoading ? (
            <div className="flex flex-col gap-3 px-0 pt-2 pb-32">
              {Array.from({ length: 5 }).map((_, i) => (
                <PendingUpholsterySkeleton key={i} />
              ))}
            </div>
          ) : controller.isError ? (
            /* Initial error state */
            <PendingUpholsteryErrorState onRetry={controller.retry} />
          ) : controller.cards.length === 0 ? (
            /* Empty state */
            <PendingUpholsteryEmptyState
              missingSelection={controller.missingSelection}
              missingQuantity={controller.missingQuantity}
              hasSearch={controller.searchInput.trim().length > 0}
            />
          ) : (
            /* Card list */
            <div className="flex flex-col gap-3 pt-2 pb-[calc(var(--safe-bottom,0)+5.5rem)]">
              {controller.cards.map((card) => (
                <PendingUpholsteryCard
                  key={card.taskId}
                  card={card}
                  onTapImage={(images, firstClientId) =>
                    controller.openImageViewer(images, firstClientId)
                  }
                  onTapActions={controller.openTaskActions}
                  onTapCard={controller.openTaskDetail}
                  onDirectAction={handleDirectAction}
                />
              ))}

              {/* Load more / pagination error */}
              {controller.hasMore && !controller.isPaginationError ? (
                <div className="flex justify-center pb-6">
                  <button
                    type="button"
                    disabled={controller.isFetchingMore}
                    className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
                    onClick={controller.loadMore}
                  >
                    {controller.isFetchingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              ) : controller.isPaginationError ? (
                <div className="flex justify-center pb-6 gap-2">
                  <span className="text-sm text-muted-foreground">Failed to load more.</span>
                  <button type="button" className="text-sm text-primary" onClick={controller.loadMore}>
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex justify-center pb-6">
                  <span className="text-xs text-muted-foreground">End of list</span>
                </div>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Absolute footer */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          isCompact ? "translate-y-full" : "translate-y-0",
        )}
      >
        <div className="bg-card px-4 py-3.5 pb-[max(var(--safe-bottom,0),0.875rem)]">
          <button
            type="button"
            className="w-full rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background"
            onClick={controller.close}
          >
            Close &amp; Back
          </button>
        </div>
      </div>
    </div>
  );

  function handleDirectAction(card: PendingSeatCardViewModel): void {
    if (card.pendingReason === "missing_selection") {
      if (!card.primaryItem) return;
      controller.openUpholsteryPicker(card.primaryItem.client_id, (upholsteryClientId) => {
        // Use pending-specific create mutation
        // This call triggers useCreateItemUpholstery (or pending-upholstery-create wrapper)
        // with taskId, itemId, upholsteryClientId
      });
    } else {
      if (!card.itemUpholsteryId) return;  // defensive; button is also disabled
      controller.openAmountSheet(card.taskId, card.itemUpholsteryId);
    }
  }
}
```

**Header height constants (Codex must measure after rendering):**
- `HEADER_INDICATOR_OFFSET`: vertical distance from top to show pull-to-refresh indicator — approximately `120` (below expanded header). Adjust after first render.
- `HEADER_CONTENT_OFFSET`: top padding inside scroll body to push content below absolute header when expanded — approximately `104`. Adjust to match `HEADER_INDICATOR_OFFSET` minus a small gap.

**Footer collapse:** Use `translate-y-full` / `translate-y-0` transition tied to `isCompact` (same as the pill row collapse).

---

### Step 18 — Home screen update

**File to modify:** `src/features/home/components/HomeView.tsx`

Add the counts query and a button to open the pending upholstery slide:

```tsx
import { usePendingSeatCountsQuery } from "@/features/pending-upholstery/api/use-pending-seat-counts-query";
import { formatCompactCount } from "@/features/pending-upholstery/lib/format-compact-count";
import { useSurface } from "@/hooks/use-surface";
import { PENDING_UPHOLSTERY_SLIDE_ID } from "@/features/pending-upholstery/surfaces";

export function HomeView(): React.JSX.Element {
  const countsQuery = usePendingSeatCountsQuery();
  const surface = useSurface();

  const total = countsQuery.data
    ? countsQuery.data.missing_selection_total + countsQuery.data.missing_quantity_total
    : null;

  const countLabel = total !== null ? `(${formatCompactCount(total)})` : "";

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Home</h1>

      <button
        type="button"
        className="rounded-2xl bg-card px-4 py-3.5 text-left text-md font-medium text-primary shadow-sm"
        onClick={() => surface.open(PENDING_UPHOLSTERY_SLIDE_ID, {})}
      >
        Select upholstery {countLabel}
      </button>
    </div>
  );
}
```

If a more specific "home action primitive" exists in the codebase, Codex should prefer it over the raw button. Check `src/features/home/` for any existing button or card component patterns before writing a raw `<button>`.

---

### Step 19 — Automated test files

**File to create:** `src/features/pending-upholstery/api/fetch-pending-seat-tasks.test.ts`
- Verify default params send `missing_selection=true`, `missing_quantity=false`
- Verify `missing_quantity` filter sends correct booleans
- Verify both filters active sends both true
- Verify `q` is trimmed before sending; empty string omits `q`
- Verify response schema parses correctly (happy path)
- Verify `has_more` → `hasMore` mapping

**File to create:** `src/features/pending-upholstery/api/use-pending-seat-tasks-query.test.ts`
- Verify pagination resets when search changes
- Verify pagination resets when filters change
- Verify de-duplication of rows with the same `task.client_id` across pages
- Verify `pending_upholstery_reason` is parsed and preserved on each row
- Verify both valid reason values map correctly to `PendingUpholsteryReason`
- Verify an unknown `pending_upholstery_reason` value causes a Zod parse error (not silent fallback)

**File to create:** `src/features/pending-upholstery/controllers/use-pending-upholstery.controller.test.ts`
- Verify initial filter state is `missingSelection=true, missingQuantity=false`
- Verify setFilters prevents zero-active-filter state
- Verify search debounce resets pagination
- Verify filter changes reset pagination
- Verify `loadMore` increments offset and preserves existing cards

**File to create:** `src/features/pending-upholstery/components/PendingUpholsteryCard.test.tsx`
- Verify `missing_selection` row shows "Select upholstery" label
- Verify `missing_quantity` row shows "Set upholstery amount" label
- Verify tapping image does not also open task detail
- Verify tapping card body opens task detail
- Verify tapping three-dot button opens actions sheet
- Verify `missing_quantity` row with null `itemUpholsteryId` renders button disabled
- Verify `isMutationPending=true` disables and changes button label

**File to create:** `src/features/pending-upholstery/components/PendingUpholsteryEmptyState.test.tsx`
- Verify each filter combination displays the correct empty message
- Verify search active overrides the filter-specific message

**File to create:** `src/features/pending-upholstery/actions/pending-upholstery-mutations.test.ts`
- Verify `missing_selection` mutation optimistically removes row from missing_selection-only cache
- Verify `missing_selection` mutation does not remove row from combined cache
- Verify `missing_quantity` mutation removes row from quantity-only and combined caches
- Verify optimistic count decrement never goes below 0
- Verify `onError` restores snapshots
- Verify `onSettled` invalidates `pendingSeatUpholsteryKeys.all`, `itemUpholsteryKeys.byItem`, `taskKeys.detail`

**File to create:** `src/features/pending-upholstery/lib/format-compact-count.test.ts`
(already specified in Step 5)

---

## Risks and mitigations

- **Risk:** ~~`item_upholstery_id` missing from backend response blocks missing_quantity action.~~ **Resolved 2026-06-15** — field confirmed in updated handoff. No longer a risk.

- **Risk:** `TaskListCard`'s `firstImage` field type may differ from `PendingSeatImage`.
  **Mitigation:** Codex reads `TaskCardViewModel` in `src/features/tasks/types.ts` to confirm the exact `firstImage` shape before writing the DTO mapping. If incompatible, a thin adapter is written in `PendingUpholsteryCard`.

- **Risk:** `BoxPicker` in multiple-select mode may not enforce the at-least-one-active guard internally.
  **Mitigation:** The guard is enforced in `PendingUpholsteryHeader`'s `handleFilterChange` callback before calling `onFiltersChange`.

- **Risk:** Absolute header height constants need measurement after rendering.
  **Mitigation:** Codex uses approximate initial values (`indicatorOffset={120}`, `pt-[104px]`) and marks them with a `// TODO: adjust after first render` comment for the user to tweak in the browser.

- **Risk:** Image viewer surface props shape from `@beyo/images` may differ from `PendingSeatImage`.
  **Mitigation:** Codex reads the `@beyo/images` package index to confirm the exact prop interface before writing `mapToImageViewerShape`.

- **Risk:** `useCreateItemUpholstery` and `useSetUpholsteryQuantity` importing `pendingSeatUpholsteryKeys` creates a cross-feature dependency from `items` → `pending-upholstery`.
  **Mitigation:** This is intentional per the mutation ownership pattern. If circular dependency is detected, move `pendingSeatUpholsteryKeys` to a shared location (e.g., a top-level `src/query-keys/pending-seat-keys.ts`) and import from there in both `items/actions/` and `pending-upholstery/api/`.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep "pending-upholstery"`: all new test files pass
- `npm run test -- --grep "format-compact-count"`: formatter unit tests pass
- Manual: home screen shows "Select upholstery (N)" using counts endpoint
- Manual: opening the slide page defaults to missing-selection filter
- Manual: switching filters sends correct boolean combinations to backend (check network tab)
- Manual: combined filter shows cards with both reason values; each card's action matches `pending_upholstery_reason`
- Manual: missing-selection card opens upholstery picker; selecting upholstery fires create mutation
- Manual: missing-quantity card opens amount sheet (after backend addition of `item_upholstery_id`); saving amount fires set-quantity mutation
- Manual: after successful mutation, card disappears from matching bucket; counts update on home screen
- Manual: pull-to-refresh refreshes both list and counts
- Manual: scroll down collapses filter row and footer; scroll up reveals them
- Manual: test compact counts at 999, 1000, 1100, 9900, 10000

---

## Review log

- `2026-06-15` planner-architect: initial plan written from full codebase read
- `2026-06-15` david: confirmed `item_upholstery_id` added to backend response; plan updated, all clarifications resolved
- `2026-06-15` Codex: implemented managers pending upholstery surface, home launcher, mutation invalidation, formatter test, summary, and archive record.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`

---

## Clarifications log (for Codex)

**Q1 — `item_upholstery_id` in pending-list response** ✅ **Resolved 2026-06-15**

The backend handoff was updated to include `item_upholstery_id: string | null` on every pending-list row. Codex must include it in `PendingSeatTaskRowSchema` and the DTO mapping. The missing-quantity direct action is fully unblocked — implement it as specified in Step 13 and Step 17.

**Q2 — `TaskCardViewModel` shape and `firstImage` field type**

Codex must read `src/features/tasks/types.ts` before writing `PendingUpholsteryCard` to confirm:
- The exact type of `TaskCardViewModel.firstImage`
- Whether `firstImage` is `{ imageUrl: string | null; localObjectUrl?: string | null }` or a richer shape
- Then write the mapping in `PendingUpholsteryCard` accordingly.

**Q3 — `@beyo/images` image viewer props**

Codex must read the `@beyo/images` package index to confirm the exact shape of the `images` array expected by `IMAGE_VIEWER_SURFACE_ID`. Write `mapToImageViewerShape` to convert `PendingSeatImage[]` to that shape using only the guaranteed fields (`client_id`, `image_url`, `width_px`, `height_px`, `file_size_bytes`).

**Q4 — Expanded header height for indicatorOffset and pt- spacing**

After the page first renders in the browser (or in a simulator), measure the actual expanded header height and update:
- `indicatorOffset` in `PullToRefresh`
- The `pt-[Xpx]` class on the scroll content wrapper

Initial guesses in the plan are approximate.
