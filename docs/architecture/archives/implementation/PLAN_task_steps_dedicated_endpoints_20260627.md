# PLAN_task_steps_dedicated_endpoints_20260627

## Metadata

- Plan ID: `PLAN_task_steps_dedicated_endpoints_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T10:43:58Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_task_steps_list_rich_and_count_20260627`
- Intention plan: n/a

## Goal and intent

- Goal: Re-source task step data from the dedicated `GET /tasks/{task_id}/steps` endpoint (rich shape); wire the new `GET /tasks/{task_id}/steps/counts` endpoint to `TaskWorkingSectionsField` via an internal flow hook; remove `task_steps` from the `TaskDetailRaw` schema; add socket event invalidation for both new queries and register two new step socket event types.
- Business/user intent: The backend removed `task_steps` from `GET /tasks/{task_id}`. Steps now live on their own endpoint with the full rich shape. The `TaskWorkingSectionsField` pill counts should be driven by the fast `/counts` endpoint rather than derived from the full step list.
- Non-goals: Changing any visual output of `TaskWorkingSectionsSlidePage`. Restoring working-section images in the pin pages (no equivalent field on the new step list endpoint — images show `ImagePlaceholder` until a separate image-fetch plan is implemented).

## Scope

- In scope:
  - `packages/tasks/src/types.ts` — remove `task_steps` from `TaskDetailRawSchema`; create `TaskStepRichSchema` + `TaskStepRich` type; create `TaskStepCountsByStateSchema` + `TaskStepCountsByState` type.
  - `packages/tasks/src/api/task-step-keys.ts` — add `counts(taskId)` key.
  - `packages/tasks/src/api/list-task-steps-by-task.ts` — switch to `TaskStepRichSchema`; update return type to `TaskStepRich[]`.
  - `packages/tasks/src/api/fetch-task-step-counts.ts` — new API function for `/steps/counts` endpoint.
  - `packages/tasks/src/api/use-task-step-counts-query.ts` — new query hook.
  - `packages/tasks/src/index.ts` — export new types and hooks.
  - `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` — replace `taskQuery.data?.task_steps ?? []` with `useTaskStepsByTaskQuery(taskId).data ?? []`; update `TaskStep` type alias; update pending state and `isPending`/`isError`/`refetch` to combine both queries.
  - `packages/task-working-sections/src/flows/use-task-working-sections-counts.flow.ts` — new flow hook; calls `useTaskStepCountsQuery`; derives `assignedCount` and `completedCount`.
  - `packages/task-working-sections/src/components/TaskWorkingSectionsField.tsx` — remove `taskSteps` prop; add `taskId: string` prop; call the new counts flow internally.
  - `packages/task-working-sections/src/index.ts` — export the new flow hook.
  - `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` — update `<TaskWorkingSectionsField>` usage: remove `taskSteps` prop, add `taskId`.
  - `packages/realtime/src/lib/socket-types.ts` — add `task:step-readiness-changed` and `task:step-updated` event types.
  - `apps/managers-app/.../features/tasks/socket-events.ts` — extend invalidation for existing step events to hit `taskStepKeys.all`; add handlers for the two new events.
  - `apps/managers-app/.../pages/tasks/PinNotificationsSlidePage.tsx` — update `TaskStepBox` prop type from `TaskStepForPin` to `TaskStepRich`; replace `working_section_name` with `working_section_name_snapshot`; replace `working_section_image` with `null`.
  - `apps/workers-app/.../pages/task_steps/PinNotificationsSlidePage.tsx` — same changes as managers pin page.
- Out of scope:
  - Pin notification feature that reads `working_section_name` from `TaskStepForPin` — tracked separately.
  - Workers app step data sourcing.
  - `TaskWorkingSectionsSlidePage` UI changes.
  - Aggregate metric display in slide page (Stats tab — still "Coming soon").
- Assumptions:
  - `GET /tasks/{task_id}` no longer returns `task_steps`. The Zod schema change will cause a parse-time strip (extra fields Zod ignores by default), so removing the key from the schema is safe against live responses that still carry it.
  - `GET /tasks/{task_id}/steps` now returns the full rich shape — identical to the former `task_steps` array items plus 13 new aggregate metric fields.
  - Socket events for step operations carry **step** `client_id` values, not task `client_id`. Invalidation must be broad (all step queries) when the task_id cannot be derived from the payload.
  - The `task:step-readiness-changed` event can arrive as either a single `{ client_id }` object or as a batch `{ items: [{ client_id }] }`. For typing, we pick the batch shape and handle the single-object form with a runtime guard in the handler.

## Clarifications required

_None — all ambiguities resolved by reading the handoff and existing code._

## Acceptance criteria

1. `TaskDetailRaw` type has no `task_steps` key; `TaskDetailRawSchema` parses `GET /tasks/{task_id}` without it.
2. `useTaskStepsByTaskQuery(taskId)` returns `TaskStepRich[]` matching the new rich shape with all aggregate metric fields.
3. `useTaskStepCountsQuery(taskId)` returns `TaskStepCountsByState` with all nine state keys.
4. `TaskWorkingSectionsSlidePage` loads and operates correctly using the dedicated step list (no regressions in add/remove/reassign).
5. `TaskWorkingSectionsField` renders `assignedCount` and `completedCount` from the counts endpoint, not from passed `task_steps`.
6. Socket events `task:step-created`, `task:step-deleted`, `task:step-state-changed`, `task:step-assigned`, `task:step-readiness-changed`, `task:step-updated` all invalidate the step list and/or counts queries appropriately.
7. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo and package boundaries
- `architecture/02_types.md`: Zod schema authoring rules
- `architecture/04_api_client.md`: `apiClient.get()` usage
- `architecture/05_server_state.md`: `useQuery` / `queryKey` patterns
- `architecture/08_hooks.md`: controller and flow hook patterns
- `architecture/13_errors.md`: error handling
- `architecture/15_feature_structure.md`: file placement
- `architecture/35_shared_packages.md`: package peer dep rules, components may call hooks internally

### Local extensions loaded

- `architecture/04_api_client_local.md`: error shape, refresh envelope
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload`, `usePreloadSurface`

### File read intent — pattern vs. relational

Permitted reads taken:
- `packages/tasks/src/types.ts` — exact field names, current `task_steps` shape and `TaskDetailRawSchema`.
- `packages/tasks/src/api/task-step-keys.ts` — existing key shapes.
- `packages/tasks/src/api/list-task-steps-by-task.ts` — current response schema and return type.
- `packages/tasks/src/api/use-task-steps-by-task-query.ts` — current query hook structure.
- `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` — how `task_steps` is consumed; `buildPendingStep` shape; `TaskStep` type alias.
- `packages/task-working-sections/src/components/TaskWorkingSectionsField.tsx` — current props and count derivation.
- `packages/realtime/src/lib/socket-types.ts` — existing event signatures.
- `apps/managers-app/.../features/tasks/socket-events.ts` — existing invalidation logic.
- `apps/managers-app/.../app/socket-registry.ts` — how event handlers are composed.

### Skill selection

- Primary skill: Codex implementation
- Trigger terms: `new query hook`, `Zod schema update`, `socket event invalidation`, `flow hook`, `package component`

## Implementation plan

### Phase 1 — Types and API layer (`@beyo/tasks`)

**Step 1 — Add `TaskStepRichSchema` and `TaskStepCountsByStateSchema` to `packages/tasks/src/types.ts`**

Immediately after the existing `StepStateSchema` block, insert:

```ts
export const LatestStateRecordSchema = z.object({
  id: z.string(),
  step_id: z.string(),
  state: StepStateSchema,
  reason: z.string().nullable(),
  entered_at: z.string().datetime({ offset: true }).nullable(),
  exited_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }).nullable(),
  created_by_id: z.string().nullable(),
  description: z.string().nullable(),
  accuracy: z.number().nullable(),
  accuracy_measured_by: z.enum(["user", "ai"]).nullable(),
  taken_from_average: z.boolean(),
});

export const TaskStepRichSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  state: StepStateSchema,
  readiness_status: z.string(),
  sequence_order: z.number().int().nullable(),
  working_section_id: z.string().nullable(),
  assigned_worker_id: z.string().nullable(),
  total_dependencies: z.number().int(),
  completed_dependencies: z.number().int(),
  working_section_name_snapshot: z.string().nullable(),
  assigned_worker_display_name_snapshot: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  closed_at: z.string().datetime({ offset: true }).nullable(),
  ready_by_at: z.string().datetime({ offset: true }).nullable(),
  total_working_seconds: z.number().int(),
  total_pause_seconds: z.number().int(),
  total_ended_shift_seconds: z.number().int(),
  total_working_count: z.number().int(),
  total_pause_count: z.number().int(),
  total_ended_shift_count: z.number().int(),
  total_issues_count: z.number().int(),
  total_issues_resolved_count: z.number().int(),
  total_cost_minor: z.number().int().nullable(),
  latest_state_records: LatestStateRecordSchema.nullable(),
});
export type TaskStepRich = z.infer<typeof TaskStepRichSchema>;

export const TaskStepCountsByStateSchema = z.object({
  pending: z.number().int(),
  working: z.number().int(),
  paused: z.number().int(),
  ended_shift: z.number().int(),
  blocked: z.number().int(),
  completed: z.number().int(),
  skipped: z.number().int(),
  failed: z.number().int(),
  cancelled: z.number().int(),
});
export type TaskStepCountsByState = z.infer<typeof TaskStepCountsByStateSchema>;
```

**Step 2 — Remove `task_steps` from `TaskDetailRawSchema` in `packages/tasks/src/types.ts`**

In the `TaskDetailRawSchema` object definition, delete the entire `task_steps` key (the `z.array(...)` block from `task_steps:` to its closing `),`). Leave all other keys (`task`, `item`, `item_images`, `task_notes`, `unread_message_count`) intact.

**Step 3 — Add `counts` key to `packages/tasks/src/api/task-step-keys.ts`**

```ts
export const taskStepKeys = {
  all: ["task-steps"] as const,
  byTask: (taskId: string) => [...taskStepKeys.all, "by-task", taskId] as const,
  counts: (taskId: string) => [...taskStepKeys.all, "counts", taskId] as const,
  missingTask: () => [...taskStepKeys.all, "missing-task"] as const,
};
```

**Step 4 — Update `packages/tasks/src/api/list-task-steps-by-task.ts`**

Replace `TaskStepForPinSchema` import and usage with `TaskStepRichSchema`. The `ApiEnvelopeSchema` wrapping structure stays the same.

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { TaskStepRichSchema } from "../types";

const ListTaskStepsByTaskResponseSchema = ApiEnvelopeSchema(
  z.object({
    steps_pagination: z.object({
      items: z.array(TaskStepRichSchema),
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export async function listTaskStepsByTask(
  taskId: string,
): Promise<TaskStepRich[]> {
  const envelope = await apiClient.get(
    `/api/v1/tasks/${taskId}/steps`,
    ListTaskStepsByTaskResponseSchema,
  );
  return envelope.data.steps_pagination.items;
}
```

Remove the re-export of `TaskStepForPin` from this file (it was `export type { TaskStepForPin } from ...`; that's now gone — callers that need it should import `TaskStepRich` from the public index instead).

**Step 5 — Create `packages/tasks/src/api/fetch-task-step-counts.ts`**

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { TaskStepCountsByStateSchema } from "../types";

const FetchTaskStepCountsResponseSchema = ApiEnvelopeSchema(
  z.object({
    counts_by_state: TaskStepCountsByStateSchema,
  }),
).extend({ ok: z.literal(true) });

export async function fetchTaskStepCounts(
  taskId: string,
): Promise<TaskStepCountsByState> {
  const envelope = await apiClient.get(
    `/api/v1/tasks/${taskId}/steps/counts`,
    FetchTaskStepCountsResponseSchema,
  );
  return envelope.data.counts_by_state;
}
```

Import `TaskStepCountsByState` from `"../types"`.

**Step 6 — Create `packages/tasks/src/api/use-task-step-counts-query.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchTaskStepCounts } from "./fetch-task-step-counts";
import { taskStepKeys } from "./task-step-keys";

export function useTaskStepCountsQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId
      ? taskStepKeys.counts(taskId)
      : taskStepKeys.missingTask(),
    queryFn: () => {
      if (!taskId) throw new Error("taskId is required");
      return fetchTaskStepCounts(taskId);
    },
    enabled: Boolean(taskId),
  });
}
```

**Step 7 — Update `packages/tasks/src/index.ts`**

Add the following exports. Insert them alongside the existing `task-step-keys` / `list-task-steps-by-task` / `use-task-steps-by-task-query` block:

```ts
export { LatestStateRecordSchema, TaskStepRichSchema, TaskStepCountsByStateSchema } from "./types";
export type { TaskStepRich, TaskStepCountsByState } from "./types";
export { fetchTaskStepCounts } from "./api/fetch-task-step-counts";
export { useTaskStepCountsQuery } from "./api/use-task-step-counts-query";
```

Also remove any export of `TaskStepForPin` that was being re-exported from `list-task-steps-by-task.ts` (there was an `export type { TaskStepForPin }` line if present — delete it; `TaskStepForPin` / `TaskStepForPinSchema` remain in `types.ts` for now but are not re-exported from this file to avoid confusion with `TaskStepRich`).

---

### Phase 2 — Controller update (`@beyo/task-working-sections`)

**Step 8 — Update `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts`**

Changes:

1. **Import `useTaskStepsByTaskQuery` and `TaskStepRich` from `@beyo/tasks`** (alongside existing imports).

2. **Change the `TaskStep` local alias**:
   ```ts
   // Before:
   type TaskStep = TaskDetailRaw["task_steps"][number];
   // After:
   import type { TaskStepRich } from "@beyo/tasks";
   type TaskStep = TaskStepRich;
   ```

3. **Add a second query call** inside `useTaskWorkingSectionsController`:
   ```ts
   const taskQuery = useGetTaskQuery(taskId);   // task metadata only
   const stepsQuery = useTaskStepsByTaskQuery(taskId); // dedicated step list
   ```

4. **Replace `baseTaskSteps` derivation**:
   ```ts
   // Before:
   const baseTaskSteps = taskQuery.data?.task_steps ?? [];
   // After:
   const baseTaskSteps = stepsQuery.data ?? [];
   ```

5. **Update `buildPendingStep`** — the returned object now needs to satisfy `TaskStepRich`. Add zero/null defaults for all new aggregate metric fields and `ready_by_at`:
   ```ts
   function buildPendingStep(pendingAdd: RecoveredPendingAdd): TaskStep {
     return {
       client_id: pendingAdd._pendingId,
       task_id: "",
       state: "pending",
       readiness_status: "ready",
       sequence_order: null,
       working_section_id: pendingAdd.working_section_id,
       assigned_worker_id: pendingAdd.worker_id,
       total_dependencies: 0,
       completed_dependencies: 0,
       working_section_name_snapshot: pendingAdd.working_section_name_snapshot,
       assigned_worker_display_name_snapshot:
         pendingAdd.assigned_worker_display_name_snapshot,
       created_at: new Date(0).toISOString(),
       closed_at: null,
       ready_by_at: null,
       total_working_seconds: 0,
       total_pause_seconds: 0,
       total_ended_shift_seconds: 0,
       total_working_count: 0,
       total_pause_count: 0,
       total_ended_shift_count: 0,
       total_issues_count: 0,
       total_issues_resolved_count: 0,
       total_cost_minor: null,
       latest_state_records: null,
     };
   }
   ```

6. **Combine `isPending`, `isError`, and `refetch`** in the returned object:
   ```ts
   return {
     // ...existing fields...
     isPending: taskQuery.isPending || stepsQuery.isPending,
     isError: taskQuery.isError || stepsQuery.isError,
     refetch: async () => {
       await Promise.all([taskQuery.refetch(), stepsQuery.refetch()]);
     },
     // ...rest unchanged...
   };
   ```

---

### Phase 3 — Counts flow and `TaskWorkingSectionsField` (`@beyo/task-working-sections`)

**Step 9 — Create `packages/task-working-sections/src/flows/use-task-working-sections-counts.flow.ts`**

```ts
import { useTaskStepCountsQuery } from "@beyo/tasks";
import type { TaskStepCountsByState } from "@beyo/tasks";

type TaskWorkingSectionsCountsFlow = {
  assignedCount: number;
  completedCount: number;
  isPending: boolean;
  isError: boolean;
};

function sumCounts(counts: TaskStepCountsByState): number {
  return (
    counts.pending +
    counts.working +
    counts.paused +
    counts.ended_shift +
    counts.blocked +
    counts.completed +
    counts.skipped +
    counts.failed +
    counts.cancelled
  );
}

function terminalCount(counts: TaskStepCountsByState): number {
  return counts.completed + counts.skipped + counts.failed + counts.cancelled;
}

export function useTaskWorkingSectionsCountsFlow(
  taskId: string | null | undefined,
): TaskWorkingSectionsCountsFlow {
  const query = useTaskStepCountsQuery(taskId);

  if (!query.data) {
    return {
      assignedCount: 0,
      completedCount: 0,
      isPending: query.isPending,
      isError: query.isError,
    };
  }

  return {
    assignedCount: sumCounts(query.data),
    completedCount: terminalCount(query.data),
    isPending: false,
    isError: false,
  };
}
```

> **Count semantics:** `assignedCount` = total step count across all states (mirrors the original `taskSteps.filter(s => s.working_section_id !== null).length` which equals total steps since `working_section_id` is always set). `completedCount` = sum of terminal states (`completed + skipped + failed + cancelled`) to mirror `closed_at !== null` semantics from the original code.

**Step 10 — Update `packages/task-working-sections/src/components/TaskWorkingSectionsField.tsx`**

Remove the `taskSteps` prop. Add `taskId: string`. Call the flow hook internally.

```ts
import { ChevronRight } from "lucide-react";
import { EyebrowLabel, InfoPill } from "@beyo/ui";
import { useTaskWorkingSectionsCountsFlow } from "../flows/use-task-working-sections-counts.flow";

type TaskWorkingSectionsFieldProps = {
  onOpenWorkingSections: () => void;
  taskId: string;
};

export function TaskWorkingSectionsField({
  onOpenWorkingSections,
  taskId,
}: TaskWorkingSectionsFieldProps): React.JSX.Element {
  const { assignedCount, completedCount } =
    useTaskWorkingSectionsCountsFlow(taskId);

  return (
    <button
      type="button"
      className="flex w-full flex-col gap-1.5 px-4 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      data-testid="task-working-sections-field"
      onClick={onOpenWorkingSections}
    >
      <EyebrowLabel>Stages</EyebrowLabel>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-1 flex-wrap gap-2">
          <InfoPill
            className="py-1 text-xs"
            data-testid="working-sections-assigned-count"
          >
            {assignedCount} assigned
          </InfoPill>
          <InfoPill
            className="py-1 text-xs"
            data-testid="working-sections-completed-count"
          >
            {completedCount} completed
          </InfoPill>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-[color:var(--color-icon)] stroke-[2.5]"
        />
      </div>
    </button>
  );
}
```

Remove the `import type { TaskDetailRaw } from "@beyo/tasks"` line (no longer needed).

**Step 11 — Update `packages/task-working-sections/src/index.ts`**

Add export for the new flow hook:

```ts
export { useTaskWorkingSectionsCountsFlow } from "./flows/use-task-working-sections-counts.flow";
```

---

### Phase 4 — Managers app and realtime layer

**Step 12 — Update `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`**

In the `<TaskWorkingSectionsField>` call, replace `taskSteps={controller.taskDetail.task_steps}` with `taskId={controller.taskId}`:

```tsx
<TaskWorkingSectionsField
  onOpenWorkingSections={controller.openWorkingSectionsSlide}
  taskId={controller.taskId}
/>
```

The `controller.taskDetail` guard above this render block already guarantees `controller.taskId` is a non-empty string.

**Step 13 — Add new socket event types to `packages/realtime/src/lib/socket-types.ts`**

Add two entries to `ServerToClientEvents`:

```ts
"task:step-readiness-changed": (
  payload:
    | { client_id: string; extra: { new_readiness: string } }
    | Array<{ client_id: string }>,
) => void;
"task:step-updated": (payload: Array<{ client_id: string }>) => void;
```

> `task:step-readiness-changed` is typed as a union because the backend can emit it as either a single `WorkspaceEvent` or a batch `items` array. Handlers must check `Array.isArray(payload)` before accessing fields.

**Step 14 — Update `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`**

The goal is to add step-list and step-counts invalidation alongside the existing task-detail invalidation, and add handlers for the two new events.

Since step events carry step `client_id` values (not task_id), invalidation is via the shared `taskStepKeys.all` prefix which covers both `byTask` and `counts` namespaces.

Import the package-level `taskStepKeys` with an alias at the top of the file:

```ts
import { taskStepKeys as pkgTaskStepKeys } from "@beyo/tasks";
```

Then update handlers:

```ts
"task:step-created": (_payloads, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.lists(),
    refetchType: "active",
  });
  // NEW: invalidate step list + counts for all active tasks
  queryClient.invalidateQueries({
    queryKey: pkgTaskStepKeys.all,
    refetchType: "active",
  });
},

"task:step-deleted": (payloads, { queryClient }) => {
  for (const { client_id } of payloads) {
    queryClient.removeQueries({
      queryKey: taskStepKeys.detail(client_id as TaskStepId),
    });
  }
  queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.lists(),
    refetchType: "active",
  });
  // NEW
  queryClient.invalidateQueries({
    queryKey: pkgTaskStepKeys.all,
    refetchType: "active",
  });
},

"task:step-state-changed": (payloads, { queryClient }) => {
  for (const { client_id } of payloads) {
    queryClient.invalidateQueries({
      queryKey: taskStepKeys.detail(client_id as TaskStepId),
      refetchType: "active",
    });
  }
  queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
    refetchType: "active",
  });
  // NEW
  queryClient.invalidateQueries({
    queryKey: pkgTaskStepKeys.all,
    refetchType: "active",
  });
},

"task:step-assigned": ({ client_id }, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: taskStepKeys.detail(client_id as TaskStepId),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: taskKeys.details(),
    refetchType: "active",
  });
  // NEW: step list has assigned_worker_id change
  queryClient.invalidateQueries({
    queryKey: pkgTaskStepKeys.all,
    refetchType: "active",
  });
},

// NEW handlers:
"task:step-readiness-changed": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: pkgTaskStepKeys.all,
    refetchType: "active",
  });
},

"task:step-updated": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: pkgTaskStepKeys.all,
    refetchType: "active",
  });
},
```

---

---

### Phase 5 — Pin pages update (managers + workers)

**Step 15 — Update both `PinNotificationsSlidePage.tsx` files**

Both files have an identical `TaskStepBox` component and a `PinTaskStepPicker` function that need the same four changes. Apply to both:

**managers-app** — `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/PinNotificationsSlidePage.tsx`
**workers-app** — `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/PinNotificationsSlidePage.tsx`

**Change 1 — import:** replace `type TaskStepForPin` with `type TaskStepRich` from `@beyo/tasks`.

```ts
// Before:
import {
  humanizeStepState,
  STEP_STATE_VARIANT,
  useTaskStepsByTaskQuery,
  type TaskStepForPin,
} from "@beyo/tasks";

// After:
import {
  humanizeStepState,
  STEP_STATE_VARIANT,
  useTaskStepsByTaskQuery,
  type TaskStepRich,
} from "@beyo/tasks";
```

**Change 2 — `TaskStepBox` prop type:** `step: TaskStepForPin` → `step: TaskStepRich`.

**Change 3 — `working_section_image` (inside `TaskStepBox` body):**
```ts
// Before:
const imageUrl = step.working_section_image ?? null;
// After:
const imageUrl: string | null = null;
```
`working_section_image` was removed from the API response. The step list endpoint has no image field. The box will always render `ImagePlaceholder` until a dedicated image-fetch plan is implemented.

**Change 4 — `working_section_name` (two occurrences each file):**

In `TaskStepBox` body:
```ts
// Before:
const label = step.working_section_name ?? "Working section";
// After:
const label = step.working_section_name_snapshot ?? "Working section";
```

In `PinTaskStepPicker` (the `steps.map` callback), same replacement. Also update the `imageUrl` passed to `surface.open(...)`:
```ts
// Before:
imageUrl: step.working_section_image ?? null,
// After:
imageUrl: null,
```

---

## Risks and mitigations

- Risk: `TaskStepForPinSchema` (still exported from `@beyo/tasks`) expects `working_section_name` which the API no longer returns. Any code that calls `useTaskStepsByTaskQuery` and reads `.working_section_name` on the result will encounter `undefined` at runtime and TypeScript errors once the return type is `TaskStepRich`.
  Mitigation: Both `PinNotificationsSlidePage.tsx` files are updated in Step 15 — prop type changes from `TaskStepForPin` to `TaskStepRich`, field accesses replaced with `working_section_name_snapshot`. `TaskStepForPinSchema` / `TaskStepForPin` remain in `types.ts` as exported artifacts but are no longer used by the list function or the pin pages.

- Risk: `refetch` in the controller now calls two async operations. If one fails, the other still resolves.
  Mitigation: `Promise.all` lets both run concurrently; individual query errors are surfaced via `isError`.

- Risk: `task:step-readiness-changed` can arrive as either a single object or array. Typing it as a union means the handler receives either shape; runtime must distinguish with `Array.isArray`.
  Mitigation: The handler in Step 14 ignores the payload contents — it only invalidates a query key — so no runtime field access is needed. No runtime check required.

- Risk: Broad `pkgTaskStepKeys.all` invalidation clears ALL step queries (for all tasks), not just the affected task.
  Mitigation: Acceptable for the current load. Step events do not carry `task_id`, so targeted invalidation is not possible without a step→task index in the query cache. The broad invalidation matches TanStack Query best practice when the mapping is unavailable.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all packages and apps (including both pin pages).
- Open `TaskDetailSlidePage` with a task that has steps — verify `TaskWorkingSectionsField` renders correct assigned and completed counts pulled from `/steps/counts`.
- Open `TaskWorkingSectionsSlidePage` — verify section list loads (now from `/steps` endpoint) and add/remove/save flow completes without error.
- Open `PinNotificationsSlidePage` (managers and workers) — verify step boxes render with section name from `working_section_name_snapshot`; image area shows placeholder (expected).
- Trigger a `task:step-created` socket event — verify both task detail and step list/counts invalidate (refetch fires on active queries).
- `npm run test -- --grep TaskWorkingSectionsField`: passes (tests instantiate with `taskId` not `taskSteps`).

## Review log

_Empty — awaiting Codex implementation._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
