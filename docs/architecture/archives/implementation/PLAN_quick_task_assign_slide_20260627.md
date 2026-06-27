# PLAN_quick_task_assign_slide_20260627

## Metadata

- Plan ID: `PLAN_quick_task_assign_slide_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T11:31:20Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Add two quick-access boxes (Pre-orders, Returns) to the manager home page, each opening a two-container slide — container 1 is a filtered task list; container 2 is the working-sections picker for the selected task. On save the task is removed optimistically from the list; when the list empties the slide closes.
- Business/user intent: Give managers a fast path to assign working sections to pending pre-order and return tasks without navigating to the full Tasks view.
- Non-goals: No new backend endpoints; no new task-list filtering UI inside the slide; no pagination in the quick task list (single fetch, limit 50); no image-viewer surface wiring (the opener exists but is optional and may be a no-op initially).

## Scope

- In scope:
  - `GET /api/v1/tasks/counts` API function, query key, and query hook in `@beyo/task-working-sections`.
  - Filtered task-list query hook (via existing `listTasks` from `@beyo/tasks`) in `@beyo/task-working-sections`.
  - `QuickTaskListCard` component (store-free, renders from `TaskListItemRaw`) in `@beyo/task-working-sections`.
  - `use-quick-task-assign.controller.ts` in `@beyo/task-working-sections`.
  - `QuickTaskAssignSlidePage` two-container slide page in `@beyo/task-working-sections`.
  - New surface IDs and props types in `@beyo/task-working-sections/src/surface-ids.ts`.
  - Two small additions to existing `use-task-working-sections.controller.ts`: expose `pendingAdds` / `pendingRemoveIds` / `pendingReassignments` in return type; call `surfaceOpeners?.onSaveComplete?.(taskId)` after successful save.
  - New optional key `onSaveComplete` in `TaskWorkingSectionsSurfaceOpeners`.
  - Two home boxes in `HomeView.tsx` (managers app).
  - Surface registration for `QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID` in `surfaces.ts` (managers app).
  - `quickTaskKeys.all` invalidation on `task:updated`, `task:deleted`, `task:state-changed`, `task:created` in `socket-events.ts` (managers app).

- Out of scope:
  - Worker-picker surface opener wiring (not needed — no worker assignment in the quick-assign flow).
  - Discard-changes guard sheet (not introduced; the back arrow discards silently, snapshot is preserved).
  - Pagination in the quick task list.
  - Image viewer wiring in the home context.
  - Any new backend endpoint.

- Assumptions:
  - `listTasks` and `TaskListItemRaw` are already exported from `@beyo/tasks` — confirmed in `packages/tasks/src/api/list-tasks.ts`.
  - `WorkingSectionShortcutBar` and `DEFAULT_WORKING_SECTION_SHORTCUTS` are already exported from `@beyo/working-sections`.
  - `StagedForm` / `StagedFormStep` / `useStagedForm` / `useScrollVisibility` are already exported from `@beyo/ui` / `@beyo/hooks`.
  - `useSurfaceStore` is exported from `@beyo/ui` (used in `use-task-detail.flow.ts` as evidence).
  - `task_types: "pre_order"` is the correct enum value (the intention had a typo `pre_orde`).

## Clarifications required

_(none — all design decisions are resolved in this plan)_

## Acceptance criteria

1. Home page shows two boxes in a two-column grid above the existing buttons; each box shows the correct icon, label, and a live pending-task count pill.
2. Tapping a box opens `QuickTaskAssignSlidePage` filtered to that task type.
3. Container 1 shows the filtered task list. Each card has an "Assign" button that advances to container 2 with that task selected.
4. Container 2 shows `TaskWorkingSectionsStepList` with `WorkingSectionShortcutBar` and a Save button in an absolutely-placed footer. Footer elements hide/show on scroll (relative mode).
5. The back arrow in container 2 returns to container 1; pending selections for the same task are preserved on re-entry; different task resets selections.
6. Saving assigns working sections, the task disappears from the list optimistically, and if the list is empty the slide closes.
7. Socket events `task:updated`, `task:deleted`, `task:state-changed`, `task:created` invalidate both the task-list query and the counts query for the quick-assign namespace.
8. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: overall architecture baseline
- `architecture/02_types.md`: Zod schema and type conventions
- `architecture/04_api_client.md`: `apiClient.get` usage, response envelope
- `architecture/05_server_state.md`: TanStack Query hook structure, infinite query
- `architecture/06_client_state.md`: Zustand store pattern (not new stores; reuse `useSurfaceStore`)
- `architecture/08_hooks.md`: action hook structure, optimistic update, invalidation
- `architecture/13_errors.md`: error handling at boundaries
- `architecture/15_feature_structure.md`: package directory layout
- `architecture/16_feature_workflow.md`: build order — Types → Keys → API → Query → Action → Controller → Component → Page → Route → index.ts
- `architecture/07_components.md`: component props, memo, data-testid
- `architecture/10_pages.md`: surface page shell conventions
- `architecture/23_providers.md`: context provider pattern
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md`: surface types (slide only here)
- `architecture/30_dynamic_loading.md` + `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` registration in `surfaces.ts`
- `architecture/35_shared_packages.md §13`: `surfaceOpeners` injection — packages never call `openSurface` directly
- `architecture/21_realtime.md`: socket-event invalidation pattern
- `architecture/36_scroll_visibility.md`: `useScrollVisibility({ mode: "relative" })` for footer hide

### Local extensions loaded

- `architecture/28_surfaces_local.md`: confirms `slide` and `sheet` are the active types; `drawer` excluded
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path (`@beyo/ui`), `usePreloadSurface` hook

### File read intent — pattern vs. relational

Permitted (relational — understanding what exists):
- Read `packages/task-working-sections/src/surface-ids.ts` → confirmed existing surface IDs, `TaskWorkingSectionsSurfaceOpeners` shape, `RecoveredPending*` types
- Read `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` → confirmed controller return type, `handleSaveAndClose` shape, `buildRecoverySnapshot` (private), pending-state fields
- Read `packages/task-working-sections/src/pages/TaskWorkingSectionsSlidePage.tsx` → confirmed `TaskWorkingSectionsFooter` shape (scroll-context based), `StagedForm` usage pattern, `useSurfaceProps`, `useSurfaceHeader`
- Read `apps/managers-app/.../features/tasks/surfaces.ts` → confirmed `lazyWithPreload` registration pattern, existing surface IDs
- Read `apps/managers-app/.../features/tasks/socket-events.ts` → confirmed `taskKeys.lists()` / `taskKeys.detail()` invalidation pattern
- Read `apps/managers-app/.../features/home/components/HomeView.tsx` → confirmed existing box pattern, `useSurface`, inline `surface.open` calls
- Read `packages/tasks/src/api/list-tasks.ts` → confirmed `listTasks(params)` signature and `ListTasksFullParams`
- Read `packages/tasks/src/types.ts` → confirmed `TaskListItemRaw`, `TaskType`, `TaskState`, `ListTasksFullParams`
- Read `apps/managers-app/.../features/tasks/components/TaskListCard.tsx` → confirmed `TaskCardViewModel`-based card shape, `bottomAction` slot, existing `onTapCard` / `onTapImage` / `onTapActions` props
- Read `apps/managers-app/.../features/tasks/components/TasksView.tsx` → confirmed `useScrollVisibility({ mode: "relative" })` pattern for local scroll
- Read `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_counts_endpoint_20260627.md` → confirmed `GET /api/v1/tasks/counts` response shape

Prohibited (pattern reads — covered by contracts):
- Reading another action hook to understand cache snapshot/rollback shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another controller to understand aggregation shape → `08_hooks.md`

### Skill selection

- Primary skill: `skills/new-feature-crud/SKILL.md` (query + action + controller + component + page)
- Trigger terms: `socket`, `realtime`, `surface`, `package`, `scroll`
- Excluded alternatives: none

---

## Domain schemas consulted

- `packages/tasks/src/types.ts`:
  - `TaskListItemRaw` — shape of each raw item from `listTasks`; has `.task`, `.primary_item`, `.item_images`
  - `TaskType` = `"return" | "pre_order" | "internal"`
  - `TaskState` = `"pending" | "assigned" | ...`
  - `ListTasksFullParams` — has `task_types?: string` (CSV), `task_states?: string` (CSV), `limit?`, `offset?`
- `packages/task-working-sections/src/surface-ids.ts`:
  - `RecoveredPendingAdd`, `RecoveredPendingReassignment` — existing snapshot types
  - `TaskWorkingSectionsSurfaceOpeners` — existing openers map (will add `onSaveComplete`)
  - `TaskWorkingSectionsSurfaceProps` — existing surface props for the existing slide

---

## Implementation plan

### Step 1 — Extend `surface-ids.ts` in `@beyo/task-working-sections`

**File:** `packages/task-working-sections/src/surface-ids.ts`

Add:
```ts
export const QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID = "quick-task-assign-slide";

export type QuickTaskAssignSurfaceOpeners = {
  closeSurface?: () => void;
  openTaskDetail?: (taskId: string) => void;
  openTaskActions?: (taskId: string, itemId: string | null) => void;
  openImageViewer?: (taskId: string) => void;
};

export type QuickTaskAssignSurfaceProps = {
  taskType: "pre_order" | "return";
  surfaceOpeners?: QuickTaskAssignSurfaceOpeners;
};
```

Also add `onSaveComplete` to the existing `TaskWorkingSectionsSurfaceOpeners` type:
```ts
export type TaskWorkingSectionsSurfaceOpeners = {
  // ... existing keys unchanged ...
  onSaveComplete?: (taskId: string) => void;  // NEW
};
```

---

### Step 2 — Patch `use-task-working-sections.controller.ts`

**File:** `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts`

Two changes only:

**a) Expose pending state in return value** (needed by back-button snapshot capture):
```ts
return {
  // ... existing fields ...
  pendingAdds,          // NEW — for snapshot capture in QuickTaskAssignSlidePage
  pendingRemoveIds,     // NEW
  pendingReassignments, // NEW
};
```

**b) Call `onSaveComplete` after successful save** — inside `handleSaveAndClose`, after the `try` block succeeds (before the `finally`):
```ts
try {
  // ... existing removeTaskStep / addTaskStep logic ...
  surfaceOpeners?.onSaveComplete?.(taskId);  // NEW — called only on success
} catch {
  surfaceOpeners?.reopenSlideAfterError?.(recoverySnapshot);
} finally {
  setIsSaving(false);
}
```

The `taskId` here is from the outer closure (already available as `taskId` parameter of `useTaskWorkingSectionsController`).

Update the `TaskWorkingSectionsController` exported type at the bottom of the file to include `pendingAdds`, `pendingRemoveIds`, `pendingReassignments`.

---

### Step 3 — Add `GET /api/v1/tasks/counts` API function

**File (new):** `packages/task-working-sections/src/api/get-task-counts.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const TaskCountsResponseSchema = ApiEnvelopeSchema(
  z.object({
    total: z.number().int(),
    granularity: z.record(z.string(), z.record(z.string(), z.number().int())),
  }),
).extend({ ok: z.literal(true) });

export type TaskCountsParams = {
  task_types?: string;
  task_states?: string;
};

export type TaskCountsResult = z.infer<typeof TaskCountsResponseSchema>["data"];

export async function getTaskCounts(params: TaskCountsParams): Promise<TaskCountsResult> {
  const queryParams: Record<string, string> = {};
  if (params.task_types) queryParams.task_types = params.task_types;
  if (params.task_states) queryParams.task_states = params.task_states;

  const parsed = await apiClient.get("/api/v1/tasks/counts", TaskCountsResponseSchema, queryParams);
  return parsed.data;
}
```

---

### Step 4 — Add query keys for the quick-assign namespace

**File (new):** `packages/task-working-sections/src/api/quick-task-keys.ts`

```ts
export const quickTaskKeys = {
  all: ["quick-tasks"] as const,
  counts: (taskType: string, taskStates: string) =>
    [...quickTaskKeys.all, "counts", taskType, taskStates] as const,
  list: (taskType: string, taskStates: string) =>
    [...quickTaskKeys.all, "list", taskType, taskStates] as const,
};
```

---

### Step 5 — Add `useTaskCountsQuery` hook

**File (new):** `packages/task-working-sections/src/api/use-task-counts-query.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { getTaskCounts, type TaskCountsParams } from "./get-task-counts";
import { quickTaskKeys } from "./quick-task-keys";

export function useTaskCountsQuery(params: { taskType: string; taskStates: string }) {
  return useQuery({
    queryKey: quickTaskKeys.counts(params.taskType, params.taskStates),
    queryFn: () =>
      getTaskCounts({ task_types: params.taskType, task_states: params.taskStates }),
    staleTime: 30_000,
  });
}
```

---

### Step 6 — Add `useQuickTaskListQuery` hook

**File (new):** `packages/task-working-sections/src/api/use-quick-task-list-query.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { listTasks, type TaskListItemRaw } from "@beyo/tasks";
import { quickTaskKeys } from "./quick-task-keys";

const QUICK_TASK_LIMIT = 50;

export function useQuickTaskListQuery(params: { taskType: string; taskStates: string }) {
  return useQuery<TaskListItemRaw[]>({
    queryKey: quickTaskKeys.list(params.taskType, params.taskStates),
    queryFn: async () => {
      const result = await listTasks({
        task_types: params.taskType,
        task_states: params.taskStates,
        limit: QUICK_TASK_LIMIT,
        offset: 0,
      });
      return result.items;
    },
    staleTime: 30_000,
  });
}
```

---

### Step 7 — Add `QuickTaskListCard` component

**File (new):** `packages/task-working-sections/src/components/QuickTaskListCard.tsx`

Store-free card that renders directly from `TaskListItemRaw`. Renders the same visual structure as the managers-app `TaskListCard` (image, article number, type icon, state pill, ready-by date, overdue badge, actions "⋮" button) plus a `bottomAction` slot for the "Assign" CTA.

Props:
```ts
type QuickTaskListCardProps = {
  raw: TaskListItemRaw;
  onTapCard: (taskId: string) => void;
  onTapImage: (taskId: string) => void;
  onTapActions: (taskId: string, itemId: string | null) => void;
  bottomAction?: React.ReactNode;
};
```

Rendering rules (derived from `TaskListItemRaw`):
- `taskId` = `raw.task.client_id`
- `itemId` = `raw.primary_item?.client_id ?? null`
- `imageUrl` = `raw.item_images[0]?.image_url ?? null`
- `articleLabel` = `raw.primary_item?.article_number ? '#' + ... : (raw.primary_item?.sku ?? "No item linked")`
- `typeIcon` = same lookup as existing `TYPE_ICON` map keyed on `raw.task.task_type`
- `typeLabel` = same lookup as existing `TYPE_LABEL` map
- `stateVariant` = same lookup as existing `STATE_VARIANT` map keyed on `raw.task.state`
- `readyByLabel` = `formatLocalDateYYMMDD(raw.task.ready_by_at)` (import from `@beyo/tasks`)
- quantity pill: `raw.primary_item?.item_major_category_snapshot?.toLowerCase() === "seat"` → `#${raw.primary_item.quantity}`
- return source label: same RETURN_SOURCE_LABEL map

Add `data-testid={`quick-task-card-${taskId}`}` on the root div.

The `bottomAction` renders below a border separator, identical to the existing `TaskListCard` pattern.

---

### Step 8 — Add `use-quick-task-assign.controller.ts`

**File (new):** `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts`

Manages container-1 data, optimistic removal, per-task snapshot map, and selected task state. Navigation is handled in the page (not the controller).

```ts
import { useCallback, useRef, useState } from "react";
import type { TaskListItemRaw } from "@beyo/tasks";
import { useQuickTaskListQuery } from "../api/use-quick-task-list-query";
import type { QuickTaskAssignSurfaceOpeners } from "../surface-ids";
import type { RecoveredPendingAdd, RecoveredPendingReassignment } from "../surface-ids";

export type QuickTaskSnapshot = {
  recoveredPendingAdds: RecoveredPendingAdd[];
  recoveredPendingRemoveIds: string[];
  recoveredPendingReassignments: RecoveredPendingReassignment[];
};

export function useQuickTaskAssignController(
  taskType: string,
  taskStates: string,
  surfaceOpeners?: QuickTaskAssignSurfaceOpeners,
) {
  const query = useQuickTaskListQuery({ taskType, taskStates });
  const [removedTaskIds, setRemovedTaskIds] = useState<Set<string>>(() => new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const snapshotsRef = useRef<Map<string, QuickTaskSnapshot>>(new Map());

  const tasks: TaskListItemRaw[] = (query.data ?? []).filter(
    (raw) => !removedTaskIds.has(raw.task.client_id),
  );

  const saveSnapshot = useCallback((taskId: string, snapshot: QuickTaskSnapshot) => {
    snapshotsRef.current.set(taskId, snapshot);
  }, []);

  const getSnapshot = useCallback(
    (taskId: string): QuickTaskSnapshot | undefined => snapshotsRef.current.get(taskId),
    [],
  );

  const clearSnapshot = useCallback((taskId: string) => {
    snapshotsRef.current.delete(taskId);
  }, []);

  const removeTaskOptimistically = useCallback((taskId: string) => {
    setRemovedTaskIds((prev) => new Set([...prev, taskId]));
    clearSnapshot(taskId);
  }, [clearSnapshot]);

  const handleTaskSaved = useCallback(
    (taskId: string) => {
      removeTaskOptimistically(taskId);
      const remainingCount =
        (query.data ?? []).filter(
          (raw) => !removedTaskIds.has(raw.task.client_id) && raw.task.client_id !== taskId,
        ).length;
      if (remainingCount === 0) {
        surfaceOpeners?.closeSurface?.();
      }
    },
    [query.data, removedTaskIds, removeTaskOptimistically, surfaceOpeners],
  );

  return {
    tasks,
    selectedTaskId,
    setSelectedTaskId,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    saveSnapshot,
    getSnapshot,
    handleTaskSaved,
    openTaskDetail: (taskId: string) => surfaceOpeners?.openTaskDetail?.(taskId),
    openTaskActions: (taskId: string, itemId: string | null) =>
      surfaceOpeners?.openTaskActions?.(taskId, itemId),
    openImageViewer: (taskId: string) => surfaceOpeners?.openImageViewer?.(taskId),
  };
}

export type QuickTaskAssignController = ReturnType<typeof useQuickTaskAssignController>;
```

---

### Step 9 — Add `QuickTaskAssignSlidePage`

**File (new):** `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx`

Component tree:
```
QuickTaskAssignSlidePage
  useSurfaceProps<QuickTaskAssignSurfaceProps>()
  useSurfaceHeader() → setTitle based on taskType
  useStagedForm({ steps: [{id:"task-list"},{id:"working-sections"}], mode:"sequential" })
  useQuickTaskAssignController(taskType, "pending", surfaceOpeners)

  StagedForm(showNavigation=false, footer=null)
    StagedFormStep id="task-list"
      PullToRefresh / scrollable list
        QuickTaskListCard × N
          bottomAction = <button onClick={() => { setSelectedTaskId(id); staged.advance() }}>Assign</button>

    StagedFormStep id="working-sections"
      {selectedTaskId != null &&
        TaskWorkingSectionsProvider(
          taskId=selectedTaskId,
          initialPendingAdds=snapshot?.recoveredPendingAdds,
          initialPendingRemoveIds=snapshot?.recoveredPendingRemoveIds,
          initialPendingReassignments=snapshot?.recoveredPendingReassignments,
          surfaceOpeners=innerSurfaceOpeners,
        )
          QuickAssignWorkingSectionsContainer(onBack=handleBack)
      }
```

**Inner surface openers** (built with `useMemo` in the page, stable across renders):
```ts
const innerSurfaceOpeners = useMemo(() => ({
  closeSlide: () => staged.back(),           // immediately navigate to container 1
  onSaveComplete: (taskId: string) => {
    controller.handleTaskSaved(taskId);       // optimistic removal + maybe close slide
    void query.refetch();                     // refresh after success
  },
  reopenSlideAfterError: (snapshot: TaskWorkingSectionsSurfaceProps) => {
    controller.saveSnapshot(snapshot.taskId, {
      recoveredPendingAdds: snapshot.recoveredPendingAdds ?? [],
      recoveredPendingRemoveIds: snapshot.recoveredPendingRemoveIds ?? [],
      recoveredPendingReassignments: snapshot.recoveredPendingReassignments ?? [],
    });
    controller.setSelectedTaskId(snapshot.taskId);
    staged.advance();                         // re-enter container 2 with recovered state
  },
}), [staged, controller]);
```

**Handle back from container 2** (receives snapshot from child):
```ts
function handleBack(snapshot: QuickTaskSnapshot) {
  if (controller.selectedTaskId) {
    controller.saveSnapshot(controller.selectedTaskId, snapshot);
  }
  staged.back();
}
```

**`QuickAssignWorkingSectionsContainer`** — a child component inside the provider context:
```tsx
function QuickAssignWorkingSectionsContainer({ onBack }) {
  const wsController = useTaskWorkingSectionsContext();
  const { scrollRef, isHidden } = useScrollVisibility({ mode: "relative" });

  const availableSections = useMemo(
    () => wsController.sectionEntries.map((e) => e.section),
    [wsController.sectionEntries],
  );
  const selectedSectionIds = useMemo(
    () => wsController.sectionEntries.filter((e) => e.isActive).map((e) => e.section.client_id),
    [wsController.sectionEntries],
  );

  function handleBackPress() {
    onBack({
      recoveredPendingAdds: wsController.pendingAdds,       // from newly exposed field
      recoveredPendingRemoveIds: wsController.pendingRemoveIds,
      recoveredPendingReassignments: wsController.pendingReassignments,
    });
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Fixed back arrow — absolute top-left */}
      <button
        aria-label="Back to task list"
        className="absolute left-4 top-4 z-20 flex size-8 items-center justify-center rounded-full bg-card shadow-sm"
        type="button"
        onClick={handleBackPress}
        data-testid="quick-assign-back-button"
      >
        ← {/* use ChevronLeft lucide icon */}
      </button>

      {/* Scrollable section list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-none pb-40 pt-16"
        data-testid="quick-assign-sections-scroll"
      >
        <div className="flex flex-col gap-3 px-3">
          <TaskWorkingSectionsStepList />
        </div>
      </div>

      {/* Scroll-reactive footer (shortcut bar + save button) — absolute bottom */}
      <QuickAssignWorkingSectionsFooter
        isHidden={isHidden}
        availableSections={availableSections}
        selectedSectionIds={selectedSectionIds}
        canShowShortcuts={wsController.sectionEntries.length > 0}
        hasUnsavedChanges={wsController.hasUnsavedChanges}
        isSaving={wsController.isSaving}
        onShortcutPress={wsController.handleShortcutPress}
        onSaveAndClose={() => { void wsController.handleSaveAndClose(); }}
      />
    </div>
  );
}
```

**`QuickAssignWorkingSectionsFooter`** — inline in `QuickTaskAssignSlidePage.tsx`:
```tsx
function QuickAssignWorkingSectionsFooter({
  isHidden, availableSections, selectedSectionIds,
  canShowShortcuts, hasUnsavedChanges, isSaving,
  onShortcutPress, onSaveAndClose,
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      <div className="px-4 pb-4 pt-3">
        {canShowShortcuts ? (
          <div
            className={cn(
              "overflow-hidden transition-[max-height,margin,opacity] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isHidden ? "mb-0 max-h-0 opacity-0" : "mb-3 max-h-28 opacity-100",
            )}
          >
            <div className={cn(
              "transition-transform duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isHidden ? "translate-y-full" : "translate-y-0",
            )}>
              <WorkingSectionShortcutBar
                shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
                availableSections={availableSections}
                selectedSectionIds={selectedSectionIds}
                onShortcutPress={onShortcutPress}
                animationMode="translate"
                data-testid="quick-assign-shortcut-bar"
                className="py-2"
                trackClassName="mt-3"
              />
            </div>
          </div>
        ) : null}

        <button
          className="w-full rounded-2xl bg-primary py-3.5 text-md font-semibold text-card shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="quick-assign-save-button"
          disabled={isSaving || !hasUnsavedChanges}
          type="button"
          onClick={onSaveAndClose}
        >
          {isSaving ? "Saving..." : "Save & Close"}
        </button>
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}
```

**Page title setup** via `useSurfaceHeader`:
```ts
const SLIDE_TITLE: Record<"pre_order" | "return", string> = {
  pre_order: "Pre-orders",
  return: "Returns",
};
// In a useEffect:
header?.setTitle(SLIDE_TITLE[taskType] ?? "Quick Assign");
```

---

### Step 10 — Update `@beyo/task-working-sections/src/index.ts`

Add exports:
```ts
export { QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID } from "./surface-ids";
export type { QuickTaskAssignSurfaceOpeners, QuickTaskAssignSurfaceProps } from "./surface-ids";
export { useTaskCountsQuery } from "./api/use-task-counts-query";
export { quickTaskKeys } from "./api/quick-task-keys";
export { QuickTaskAssignSlidePage } from "./pages/QuickTaskAssignSlidePage";
```

---

### Step 11 — Register the new surface in managers app `surfaces.ts`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`

Add the lazy loader and registration:
```ts
// loader
function loadQuickTaskAssignSlidePage() {
  return import("@beyo/task-working-sections").then((module) => ({
    default: module.QuickTaskAssignSlidePage,
  }));
}

// lazy ref
const quickTaskAssignSlide = lazyWithPreload(loadQuickTaskAssignSlidePage);

// registration in taskSurfaces:
[QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: quickTaskAssignSlide.Component,
},
```

Add re-export at the top:
```ts
import {
  QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID,
  type QuickTaskAssignSurfaceProps,
  type QuickTaskAssignSurfaceOpeners,
} from "@beyo/task-working-sections";
```

And export from the surfaces barrel if needed:
```ts
export {
  QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID,
} from "@beyo/task-working-sections";
export type {
  QuickTaskAssignSurfaceProps,
  QuickTaskAssignSurfaceOpeners,
} from "@beyo/task-working-sections";
```

---

### Step 12 — Update `socket-events.ts` in managers app

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`

Add `quickTaskKeys` import from `@beyo/task-working-sections`:
```ts
import { quickTaskKeys } from "@beyo/task-working-sections";
```

In each of the four relevant handlers (`task:created`, `task:updated`, `task:deleted`, `task:state-changed`), add:
```ts
queryClient.invalidateQueries({
  queryKey: quickTaskKeys.all,
  refetchType: "active",
});
```

This invalidates both `quickTaskKeys.counts(...)` and `quickTaskKeys.list(...)` in one call.

---

### Step 13 — Update `HomeView.tsx` in managers app

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx`

Add imports:
```ts
import { ShoppingBag, RotateCcw } from "lucide-react";
import { useSurfaceStore } from "@beyo/ui";
import { useTaskCountsQuery, QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID } from "@beyo/task-working-sections";
import type { QuickTaskAssignSurfaceOpeners, QuickTaskAssignSurfaceProps } from "@beyo/task-working-sections";
import {
  TASK_DETAIL_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
} from "@/features/tasks/surfaces";
```

Add inside the component:
```ts
const preOrderCountQuery = useTaskCountsQuery({ taskType: "pre_order", taskStates: "pending" });
const returnCountQuery = useTaskCountsQuery({ taskType: "return", taskStates: "pending" });

function openQuickAssign(taskType: "pre_order" | "return") {
  const surfaceOpeners: QuickTaskAssignSurfaceOpeners = {
    closeSurface: () =>
      useSurfaceStore.getState().close(QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID),
    openTaskDetail: (taskId) =>
      surface.open(TASK_DETAIL_SURFACE_ID, { taskId }),
    openTaskActions: (taskId, itemId) =>
      surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId }),
    openImageViewer: undefined, // no image viewer in home context yet
  };
  surface.open(QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID, {
    taskType,
    surfaceOpeners,
  } satisfies QuickTaskAssignSurfaceProps);
}
```

Add the two-column grid above the existing buttons inside the returned JSX:
```tsx
{/* Quick access boxes */}
<div className="grid grid-cols-2 gap-3">
  {/* Pre-orders box */}
  <button
    type="button"
    className="relative flex flex-col items-start gap-2 rounded-2xl border border-border bg-card py-4 px-4 shadow-sm text-primary w-full"
    data-testid="home-quick-preorders-box"
    onClick={() => openQuickAssign("pre_order")}
  >
    {preOrderCountQuery.data != null && preOrderCountQuery.data.total > 0 ? (
      <span className="absolute -top-2 -right-2 flex min-w-6 h-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-card">
        {preOrderCountQuery.data.total}
      </span>
    ) : null}
    <ShoppingBag aria-hidden="true" className="size-6 shrink-0" />
    <span className="text-sm font-medium">Pre-orders</span>
  </button>

  {/* Returns box */}
  <button
    type="button"
    className="relative flex flex-col items-start gap-2 rounded-2xl border border-border bg-card py-4 px-4 shadow-sm text-primary w-full"
    data-testid="home-quick-returns-box"
    onClick={() => openQuickAssign("return")}
  >
    {returnCountQuery.data != null && returnCountQuery.data.total > 0 ? (
      <span className="absolute -top-2 -right-2 flex min-w-6 h-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-card">
        {returnCountQuery.data.total}
      </span>
    ) : null}
    <RotateCcw aria-hidden="true" className="size-6 shrink-0" />
    <span className="text-sm font-medium">Returns</span>
  </button>
</div>
```

Place this grid div **between** the `<h1>` and the first existing `<button>` (i.e., before the "Select upholstery" button at line 26).

---

## File summary

| # | File | Action |
|---|---|---|
| 1 | `packages/task-working-sections/src/surface-ids.ts` | Modified — add `QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID`, `QuickTaskAssignSurfaceProps`, `QuickTaskAssignSurfaceOpeners`, `onSaveComplete` to `TaskWorkingSectionsSurfaceOpeners` |
| 2 | `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` | Modified — expose `pendingAdds` / `pendingRemoveIds` / `pendingReassignments`, call `onSaveComplete` on success |
| 3 | `packages/task-working-sections/src/api/get-task-counts.ts` | New |
| 4 | `packages/task-working-sections/src/api/quick-task-keys.ts` | New |
| 5 | `packages/task-working-sections/src/api/use-task-counts-query.ts` | New |
| 6 | `packages/task-working-sections/src/api/use-quick-task-list-query.ts` | New |
| 7 | `packages/task-working-sections/src/components/QuickTaskListCard.tsx` | New |
| 8 | `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts` | New |
| 9 | `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx` | New |
| 10 | `packages/task-working-sections/src/index.ts` | Modified — add new exports |
| 11 | `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts` | Modified — add `QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID` surface registration |
| 12 | `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts` | Modified — add `quickTaskKeys.all` invalidation |
| 13 | `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx` | Modified — add two boxes and counts hooks |

**Total: 7 new + 6 modified = 13 files**

---

## Risks and mitigations

- Risk: `useSurfaceStore.getState().close(QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID)` called in `HomeView` before the slide is registered — would be a no-op but surfaces must be registered before opening.
  Mitigation: The surface is registered in `taskSurfaces` (step 11) which is wired at app boot, before any open call.

- Risk: `QuickTaskAssignSlidePage` is a slide surface; its `StagedForm` container 2 uses `useScrollVisibility({ mode: "relative" })` — but if the slide already provides a global scroll context via `ScrollVisibilityProvider`, the two might conflict.
  Mitigation: `useScrollVisibility({ mode: "relative" })` creates a local scroll context scoped to the provided `scrollRef`. The `QuickAssignWorkingSectionsFooter` consumes `isHidden` as a plain prop (not from context), so there's no context conflict.

- Risk: `pendingAdds` / `pendingRemoveIds` / `pendingReassignments` added to `TaskWorkingSectionsController` return expand the public API of an existing shared type.
  Mitigation: These are read-only exposures of existing internal state — no new logic. Existing consumers of `TaskWorkingSectionsController` ignore unknown keys.

- Risk: `onSaveComplete` call added to `handleSaveAndClose` — calling after all awaits, before `finally`. If `onSaveComplete` throws, it would fall into the `catch` and call `reopenSlideAfterError` incorrectly.
  Mitigation: Wrap `onSaveComplete` call in its own try/catch or ensure it never throws (the implementations are UI callbacks — void returns).

- Risk: Counts query shows stale data after assignments (socket events fire but counts query may not re-run if stale window hasn't expired).
  Mitigation: `quickTaskKeys.all` invalidation on socket events triggers an active-query refetch (`refetchType: "active"`), which overrides the staleTime.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all 13 files
- Manual test (mobile): open home → tap Pre-orders box → pill shows correct count → slide opens → task list renders → tap Assign on a card → container 2 slides in → select sections → tap back → re-tap Assign same card → selections preserved → tap Assign different card → selections reset → select sections → save → task removed from list → if last task, slide closes
- Manual test (mobile): repeat for Returns box
- Manual test: socket event path — from another session change a task state → counts badge updates; open slide → list refreshes
- `npm run test -- --grep quick-task`: no unit tests in this plan (component is UI-heavy; Playwright covers)
- `npx playwright test --grep quick-task-assign --project=mobile`: (spec to be written — not part of this plan)
- `npx playwright test --grep quick-task-assign --project=desktop`: (spec to be written — not part of this plan)

---

## Review log

_(empty — plan not yet reviewed)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
