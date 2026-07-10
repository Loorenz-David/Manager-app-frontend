# PLAN_batch_task_step_working_20260623

## Metadata

- Plan ID: `PLAN_batch_task_step_working_20260623`
- Status: `under_construction`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-23T00:00:00Z`
- Last updated at (UTC): `2026-06-23T14:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/worker_modifications.txt`

## Goal and intent

- Goal: Implement frontend support for batch-capable working sections. Workers can select, start, pause/resume, and complete multiple task steps atomically. Non-batch sections retain all existing behaviour unchanged.
- Business/user intent: Wood-worker and similar roles often work on multiple identical tasks in parallel. Batch mode lets them start a group of steps at once, pause/resume the whole group, and complete them together — reducing repetitive individual taps.
- Non-goals: Per-item credited_user_id (not supported by the batch endpoint in v1). Any changes to individual (non-batch) step transitions. Any changes to working-section dependencies, upholstery warnings, or issue logic. Manager app deep editing flows beyond adding a single toggle.

## Scope

- In scope:
  - `allows_batch_working` field on working-section schema (worker list payload + manager full payload).
  - `active_batch_steps` field on resume-card payload.
  - New batch transition API function + mutation hook for `POST /api/v1/tasks/steps/transition-batch`.
  - `BatchSelectionOverlayProvider` to signal `forceHidden` on `LastActiveStepCard` from `AppShell`.
  - `BatchSelectableTaskStepCard` component for batch-selection list mode.
  - `WorkingSectionStepsView` batch mode (selectable cards, floating "Start Tasks" button, batch start).
  - `LastActiveStepCard` batch card variant (opens `BatchDetailSlidePage`).
  - New `BatchDetailSlidePage` surface with circular action button, step list, and "Complete Tasks" footer.
  - New `CompleteBatchTaskStepsConfirmationSlidePage` surface (time accuracy + complete all working steps).
  - Socket event handler updates for new `UserLastActivePayload` cache shape.
  - Manager app: `allows_batch_working` toggle in working-section create/edit forms.

- Out of scope:
  - Per-item `credited_user_id` in batch endpoint.
  - Upholstery/dependency guard interception inside batch start (batch steps are assumed to be unconstrained by design in v1).
  - Animated batch card entrance beyond existing `AnimatePresence` patterns.
  - Pagination or infinite scroll for batch detail step list.

- Assumptions:
  - `allows_batch_working` is read from the working-section payload only — never from a task-step payload.
  - The batch endpoint rejects non-batch steps; the frontend guards by source before calling.
  - `active_batch_steps` items have the same Zod schema as `user_last_active_step_record` (`TaskStepSchema`).
  - Batch mode hides the SearchBar filter sort button but keeps the search bar (usable for finding steps in a large batch list).
  - `BatchDetailSlidePage` renders regular `TaskStepCard` cards with full individual interactions (image tap, body tap to task detail, individual action button). It does **not** show selection checkboxes — the active batch group is established; the group action is the circular button and "Complete Tasks" footer.
  - `BatchSelectableTaskStepCard` is used **only** in `WorkingSectionStepsView` batch-selection mode.
  - When only one batch step is in the active batch, the batch card in `LastActiveStepCard` still renders as a batch card (because `active_batch_steps` is non-null).
  - `BatchDetailSlidePage` receives only step IDs in surface props (not full `TaskStep` objects). It subscribes to `useUserLastActiveStepQuery()` to get fresh, live `batchSteps` by matching on those IDs. This is the freshness strategy — no permanent reliance on the opening snapshot.
  - `mark_closing_record_inaccurate` is **omitted** from batch items when timing is accurate (not sent as `false`). It is set to `true` per item only when the worker marks timing as inaccurate.
  - Legal transition helpers (`getBatchTransitionItems`) narrow target state to `"working" | "paused" | "completed"` — not the full `StepState` union.

## Clarifications required

_(none — all design decisions are resolved above; the `mark_closing_record_inaccurate` limitation is resolved by the updated handoff)_

## Acceptance criteria

1. `npm run typecheck`: zero TypeScript errors.
2. Working section list (`GET /me`) response is parsed with `allows_batch_working`; `WorkingSectionViewModel.allowsBatchWorking` is populated.
3. Opening a non-batch section (`allowsBatchWorking === false`) shows no changes to existing behaviour.
4. Opening a batch section (`allowsBatchWorking === true`) renders `BatchSelectableTaskStepCard` cards with no three-dot button and no `TaskStepActionButton`.
5. Selecting one card shows the floating "Start Tasks" button and hides `LastActiveStepCard`.
6. Tapping "Start Tasks" calls `POST /api/v1/tasks/steps/transition-batch` with only `pending → working` eligible steps; on success, selection is cleared and list refetches.
7. An atomic batch failure surfaces the backend error message; no partial success is shown.
8. `GET /steps/user-last-active` with non-null `active_batch_steps` renders a batch card in `LastActiveStepCard`.
9. Tapping the batch card opens `BatchDetailSlidePage` with back button, section image/name header, circular action button, and step list.
10. The circular action button pauses all `working` steps / resumes all `paused|ended_shift` steps via the batch endpoint; only legally-transitionable steps are sent.
11. Tapping "Complete Tasks" in batch detail opens `CompleteBatchTaskStepsConfirmationSlidePage`.
12. Confirming completion calls the batch endpoint with `new_state: "completed"`, only `working` steps, and `mark_closing_record_inaccurate` per item matching the user's time-accuracy selection.
13. Manager working-section create/edit form accepts and persists `allows_batch_working`.
14. Realtime `task:step-state-changed` coalesced event updates/refetches all affected sections and the resume card in a single pass.
15. (Correction 17 — manager check) Manager app: after saving `allows_batch_working: true` on a section, a worker opening that section sees `BatchSelectableTaskStepCard` cards immediately (no additional toggle needed on the worker side).
16. (Correction 17 — realtime check) After a batch start via the endpoint, the coalesced `task:step-state-changed` socket event triggers exactly one `invalidateQueries` call for `taskStepKeys.userLastActive()` — not one per step. Verify by adding a temporary `console.count` or by watching network requests: only one `GET /steps/user-last-active` fires.
17. (Correction 17 — zero bare-type check) After implementation, search the codebase for `getQueryData<TaskStep | null>(taskStepKeys.userLastActive())` and `setQueryData(taskStepKeys.userLastActive(), <non-payload>)` — zero matches.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query patterns (query key factories, `useQuery`, `useMutation`, invalidation)
- `architecture/07_components.md`: component conventions, `memo`, prop naming
- `architecture/08_hooks.md`: controller/action hook patterns, optimistic-update shape, rollback
- `architecture/14_styling.md`: Tailwind conventions
- `architecture/23_providers.md`: context provider shell
- `architecture/31_animations.md`: `AnimatePresence`, `m.div`, slide surfaces

### Local extensions loaded

- `architecture/12_auth_local.md`: `useAuth`, workspace roles
- `architecture/28_surfaces_local.md`: surface registration, `lazyWithPreload`, `SurfaceRegistrations`

### File read intent — pattern vs. relational

Permitted relational reads (what exists):
- `task_steps/types.ts` — verify `TaskStep`, `StepState`, `STEP_TERMINAL_STATES`, `STEP_QUICK_TRANSITION`, `TaskStepCardViewModel`, `toTaskStepCardViewModel` exact shapes.
- `task_steps/api/fetch-user-last-active-step.ts` — verify current response schema to update.
- `task_steps/api/use-user-last-active-step.ts` — verify current return type.
- `task_steps/api/transition-step-state.ts` — read to understand envelope + request shape for the analogous batch function.
- `task_steps/actions/use-transition-step-state.ts` — read to understand cache snapshot/rollback and `userLastActive` patch patterns; specifically the `onMutate` cache shape for `taskStepKeys.userLastActive()`.
- `task_steps/controllers/use-last-active-step-card.controller.ts` — read to understand how `step` is derived and what `LastActiveStepCardController` exposes.
- `task_steps/socket-events.ts` — read all handlers that reference `taskStepKeys.userLastActive()`.
- `working_sections/types.ts` — read `WorkerWorkingSectionSchema` + `WorkingSectionViewModel` to add field.
- `task_steps/surface-ids.ts` — read to understand prop-type pattern before adding new IDs.
- `task_steps/surfaces.ts` — read `lazyWithPreload` registration pattern before adding new surfaces.
- `task_steps/components/TaskStepCard.tsx` — read `StepThumbnail` extraction and card structure before writing `BatchSelectableTaskStepCard`.
- `pages/task_steps/TaskDetailSlidePage.tsx` — read `TaskStepCircularActionButton` component to reuse in `BatchDetailSlidePage`.
- `app/AppShell.tsx` — verify `forceHidden` prop usage before adding provider.
- Manager app: locate working-section create/edit form files (see step 18 below).

Prohibited pattern reads (contract covers):
- Reading another context provider to understand shell shape → `23_providers.md`
- Reading another mutation hook to understand cache snapshot shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another surface registration to understand `lazyWithPreload` pattern → `28_surfaces_local.md`

### Skill selection

- Primary skill: `skills/component/SKILL.md`, `skills/mutation/SKILL.md`
- Trigger terms: `React component`, `useMutation`, `Tailwind`, `surface`, `socket`

---

## Implementation plan

### Step 1 — New shared type: `UserLastActivePayload` + batch transition types + legal-transition helpers
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`
**Action:** Modify (add to end of file)

Add:

```ts
// Resume-card API payload (replaces bare TaskStep | null in cache)
export type UserLastActivePayload = {
  step: TaskStep | null;
  batchSteps: TaskStep[] | null;
};

// Batch transition API shapes
export type BatchStepTransitionItem = {
  task_id: TaskId;
  step_id: TaskStepId;
  mark_closing_record_inaccurate?: boolean;
};

export type BatchStepTransitionRequest = {
  items: BatchStepTransitionItem[];
  new_state: StepState;
  reason?: string | null;
  description?: string | null;
};

export type BatchStepTransitionResponseItem = {
  step_id: TaskStepId;
  new_state: StepState;
  last_state_record: LastStateRecord;
};

export type BatchStepTransitionResponse = {
  items: BatchStepTransitionResponseItem[];
};
```

Add legal-transition helpers (centralized for use in both `WorkingSectionStepsView` and `BatchDetailSlidePage`):

```ts
export function canTransitionToWorking(step: TaskStep): boolean {
  return step.state === "pending" || step.state === "paused" || step.state === "ended_shift";
}

export function canTransitionToPaused(step: TaskStep): boolean {
  return step.state === "working";
}

export function canTransitionToCompleted(step: TaskStep): boolean {
  return step.state === "working";
}

// targetState is narrowed to the three batch UI flows. Unsupported states are a
// type error rather than silently returning an empty list.
export function getBatchTransitionItems(
  steps: TaskStep[],
  targetState: "working" | "paused" | "completed",
  markInaccurate = false,
): BatchStepTransitionItem[] {
  const canTransition =
    targetState === "working"
      ? canTransitionToWorking
      : targetState === "paused"
        ? canTransitionToPaused
        : canTransitionToCompleted;

  // When accurate, omit mark_closing_record_inaccurate entirely (do not send false).
  // When inaccurate, set mark_closing_record_inaccurate: true on each item.
  return steps.filter(canTransition).map((step) => ({
    task_id: step.task_id,
    step_id: step.client_id,
    ...(markInaccurate && { mark_closing_record_inaccurate: true }),
  }));
}
```

---

### Step 2 — Working-section schema: add `allows_batch_working`
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/types.ts`
**Action:** Modify

In `WorkerWorkingSectionSchema`:
```ts
allows_batch_working: z.boolean(),
```

In `WorkingSectionViewModel`:
```ts
allowsBatchWorking: boolean;
```

In `toWorkingSectionViewModel`:
```ts
allowsBatchWorking: section.allows_batch_working,
```

---

### Step 3 — Update resume-card fetch to return `UserLastActivePayload`
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/fetch-user-last-active-step.ts`
**Action:** Modify

Update `ResponseDataSchema`:
```ts
const ResponseDataSchema = z.object({
  user_last_active_step_record: TaskStepSchema.nullable(),
  active_batch_steps: z.array(TaskStepSchema).nullable(),
});
```

Change return type and function body:
```ts
export async function fetchUserLastActiveStep(): Promise<UserLastActivePayload> {
  const envelope = await apiClient.get(...);
  return {
    step: envelope.data.user_last_active_step_record,
    batchSteps: envelope.data.active_batch_steps ?? null,
  };
}
```

---

### Step 4 — Update resume-card query hook
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/use-user-last-active-step.ts`
**Action:** Modify

```ts
export function useUserLastActiveStepQuery() {
  return useQuery<UserLastActivePayload>({
    queryKey: taskStepKeys.userLastActive(),
    queryFn: fetchUserLastActiveStep,
  });
}
```

---

### Step 5 — New batch transition API function
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/api/transition-batch-step-states.ts`
**Action:** New file

```ts
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import { LastStateRecordSchema, StepStateSchema } from "../types";
import type { BatchStepTransitionRequest, BatchStepTransitionResponse } from "../types";

const ResponseDataSchema = z.object({
  items: z.array(
    z.object({
      step_id: z.string(),
      new_state: StepStateSchema,
      last_state_record: LastStateRecordSchema,
    }),
  ),
});

export async function transitionBatchStepStates(
  input: BatchStepTransitionRequest,
): Promise<BatchStepTransitionResponse> {
  const envelope = await apiClient.post(
    "/api/v1/tasks/steps/transition-batch",
    ApiEnvelopeSchema(ResponseDataSchema),
    input,
  );
  return envelope.data as BatchStepTransitionResponse;
}
```

---

### Step 6 — New batch transition mutation hook
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/actions/use-transition-batch-step-states.ts`
**Action:** New file

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import type { WorkingSectionId } from "@beyo/lib";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { transitionBatchStepStates } from "../api/transition-batch-step-states";
import { taskStepKeys } from "../api/task-step-keys";
import type { BatchStepTransitionRequest } from "../types";

type BatchTransitionInput = BatchStepTransitionRequest & {
  working_section_id: WorkingSectionId;
};

export function useTransitionBatchStepStates() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ working_section_id: _id, ...input }: BatchTransitionInput) =>
      transitionBatchStepStates(input),

    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(variables.working_section_id),
      });
      void queryClient.invalidateQueries({
        queryKey: workerWorkingSectionKeys.mine(),
      });
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.userLastActive(),
      });
    },

    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Batch action failed.";
      notify.error("Batch action failed", message);
    },
  });

  return {
    transitionBatch: mutation.mutate,
    transitionBatchAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export type TransitionBatchStepStatesAction = ReturnType<
  typeof useTransitionBatchStepStates
>;
```

**Note:** No optimistic update — batch is atomic all-or-nothing. A failed call changes nothing; just show the error and refetch.

---

### Step 7 — `BatchSelectionOverlayProvider`
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/providers/BatchSelectionOverlayProvider.tsx`
**Action:** New file

Small context that lets any descendant signal to `AppShell` that a batch selection is active (which should suppress `LastActiveStepCard`).

```ts
import { createContext, useCallback, useContext, useState } from "react";

type BatchSelectionOverlayContextValue = {
  isSelecting: boolean;
  setIsSelecting: (value: boolean) => void;
};

const BatchSelectionOverlayContext =
  createContext<BatchSelectionOverlayContextValue | null>(null);

export function BatchSelectionOverlayProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [isSelecting, setIsSelectingState] = useState(false);
  const setIsSelecting = useCallback((v: boolean) => setIsSelectingState(v), []);
  return (
    <BatchSelectionOverlayContext.Provider value={{ isSelecting, setIsSelecting }}>
      {children}
    </BatchSelectionOverlayContext.Provider>
  );
}

export function useBatchSelectionOverlay(): BatchSelectionOverlayContextValue {
  const ctx = useContext(BatchSelectionOverlayContext);
  if (!ctx) throw new Error("useBatchSelectionOverlay must be inside BatchSelectionOverlayProvider");
  return ctx;
}
```

---

### Step 8 — Update `AppShell` to provide `BatchSelectionOverlayProvider`
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/app/AppShell.tsx`
**Action:** Modify

**Correction 16 — Import path alias verification:**
Before writing the import, Codex must check how `AppShell.tsx` currently imports from `src/providers/` (or equivalent). Look at the existing imports at the top of the file:
- If existing providers are imported as `"@/providers/..."`, use `"@/providers/BatchSelectionOverlayProvider"`.
- If existing providers are imported as relative paths (e.g. `"../../providers/..."`), use the same relative pattern.
- Do not assume `@/` is configured — confirm by reading the file's current imports first.

1. Import `BatchSelectionOverlayProvider` and `useBatchSelectionOverlay`.
2. Move `AppShell` body into an inner component (or read from context after adding the provider at the outer level).

Cleanest approach: split into `AppShellInner` that reads from the context:

```tsx
import { BatchSelectionOverlayProvider, useBatchSelectionOverlay } from "@/providers/BatchSelectionOverlayProvider";

function AppShellInner(): React.JSX.Element {
  const location = useLocation();
  const { isSelecting } = useBatchSelectionOverlay();
  const shouldHideLastActiveStepCard =
    isSelecting || isPathInHiddenCardSection(location.pathname);

  return (
    <AppScrollElementProvider>
      <TabBadgeCountsProvider>
        <LastActiveStepCardProvider>
          <div ...>
            ...
            <LastActiveStepCard forceHidden={shouldHideLastActiveStepCard} />
            <BottomTabBar />
          </div>
        </LastActiveStepCardProvider>
      </TabBadgeCountsProvider>
    </AppScrollElementProvider>
  );
}

export function AppShell(): React.JSX.Element {
  return (
    <BatchSelectionOverlayProvider>
      <AppShellInner />
    </BatchSelectionOverlayProvider>
  );
}
```

---

### Step 9 — New `BatchSelectableTaskStepCard` component
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/BatchSelectableTaskStepCard.tsx`
**Action:** New file

Based on `TaskStepCard` structure. Key differences:
- No `ThreeDotIcon` / actions button in header row
- No `TaskStepActionButton` at bottom
- Right column: selection button (`w-14 flex shrink-0 items-center justify-center border-l border-border`) with `Check` icon — `bg-primary text-card` when selected, `text-muted-foreground` when not
- Outer wrapper: adds `ring-1 ring-primary` when selected, `ring-transparent` when not

**Thumbnail strategy:** `StepThumbnail` in `TaskStepCard.tsx` is a local non-exported memo. Before inlining it in `BatchSelectableTaskStepCard`, Codex must verify whether it contains hidden business logic (image-annotation rendering, signed-URL caching, etc.). If the thumbnail is purely visual markup (~30 lines), inline it. If it carries non-trivial logic, extract it to a shared file (e.g. `task_steps/components/StepThumbnail.tsx`) and export from both cards. Do not blindly copy a large block without reading the implementation first.

Props:
```ts
type BatchSelectableTaskStepCardProps = {
  card: TaskStepCardViewModel;
  selected: boolean;
  onToggleSelect: (stepId: TaskStepId) => void;
  onTapImage: (stepId: TaskStepId) => void;
  onTapCard: (stepId: TaskStepId, taskId: TaskId) => void;
};
```

Structure:
```tsx
<div className={cn(
  "mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm border-soft-container ring-1",
  selected ? "ring-primary" : "ring-transparent",
)} data-testid={`batch-step-card-${stepId}`}>
  {/* Thumbnail (same markup as TaskStepCard's StepThumbnail) */}
  {/* Body (same as TaskStepCard body div — article label, type icon, ready-by date) */}
  {/* NO three-dot button in body */}
  {/* Selection column — stopPropagation required so clicking the check button
      does NOT trigger the card/body onTapCard. Same isolation pattern that
      TaskStepCard uses for the image button and three-dot button. */}
  <button
    aria-label={selected ? "Deselect step" : "Select step"}
    aria-pressed={selected}
    className={cn(
      "flex w-14 shrink-0 items-center justify-center border-l border-border",
      selected ? "bg-primary text-card" : "text-muted-foreground",
    )}
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onToggleSelect(stepId);
    }}
  >
    <Check aria-hidden="true" className="size-5" />
  </button>
</div>
```

**Event isolation contract (required):**
- Selection button click must call `event.stopPropagation()` — do not let it bubble to the card body's `onTapCard` handler.
- The image button (thumbnail) must also call `event.stopPropagation()` — same as `TaskStepCard`'s existing image button pattern.
- The card body div is the only element that triggers `onTapCard`.
- Keyboard handlers (`onKeyDown`) on the body must not fire when focus is on the selection or image button.

---

### Step 10 — Update `WorkingSectionStepsView` with batch mode
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/WorkingSectionStepsView.tsx`
**Action:** Modify

Add batch mode branch. `WorkingSectionStepsView` already receives `section: WorkingSectionViewModel` — now also reads `section.allowsBatchWorking`.

**Batch-mode state (local to view):**
```ts
const [selectedStepIds, setSelectedStepIds] = useState<Set<TaskStepId>>(
  () => new Set(),
);
```

**Sync selection state to overlay context:**
```ts
const { setIsSelecting } = useBatchSelectionOverlay();
useEffect(() => {
  setIsSelecting(selectedStepIds.size > 0);
  return () => setIsSelecting(false); // clear on unmount (section back)
}, [selectedStepIds.size, setIsSelecting]);
```

**Prune stale selectedStepIds when rawSteps changes:**

Selections must be cleaned up after refetches, socket events, search filter changes, and step state changes. Steps that are no longer present in `rawSteps` (deleted, completed elsewhere, or filtered out) must be removed.

Decision: **drop selections that no longer exist in rawSteps**. Keep selections that exist but are hidden by search (the step exists, just not visible). This means `eligibleSelectedSteps` must be derived from the unfiltered `rawSteps`, not the visible filtered `steps`.

```ts
// Prune selected IDs that no longer exist in the unfiltered rawSteps
useEffect(() => {
  if (rawSteps.length === 0) return;
  const existingIds = new Set(rawSteps.map((s) => s.client_id));
  setSelectedStepIds((prev) => {
    const pruned = new Set([...prev].filter((id) => existingIds.has(id)));
    return pruned.size === prev.size ? prev : pruned; // stable reference if unchanged
  });
}, [rawSteps]);
```

**Derive eligible selected steps (can legally transition to `working`):**

```ts
// eligibleSelectedSteps = selected + exist in rawSteps + can start
const eligibleSelectedSteps = useMemo(
  () => rawSteps.filter(
    (s) => selectedStepIds.has(s.client_id) && canTransitionToWorking(s),
  ),
  [rawSteps, selectedStepIds],
);
```

**Helpers:**
```ts
function handleToggleSelect(stepId: TaskStepId) {
  setSelectedStepIds((prev) => {
    const next = new Set(prev);
    if (next.has(stepId)) { next.delete(stepId); } else { next.add(stepId); }
    return next;
  });
}
```

**Batch start mutation (with size guard):**
```ts
const { transitionBatch, isPending: isBatchTransitioning } = useTransitionBatchStepStates();

function handleBatchStart() {
  const items = getBatchTransitionItems(eligibleSelectedSteps, "working");

  if (items.length === 0) return; // guard: nothing eligible

  if (items.length > 100) {
    notify.error(
      "Too many tasks selected",
      "Please select 100 or fewer tasks to start at once.",
    );
    return;
  }

  transitionBatch(
    { items, new_state: "working", reason: null, description: null, working_section_id: sectionId },
    { onSuccess: () => setSelectedStepIds(new Set()) },
  );
}
```

> Note: `query.data` is not currently accessible in `WorkingSectionStepsView` — it goes through the controller. The controller's `steps` are view models (include `taskId` and `stepId`). However, `getBatchTransitionItems` needs `TaskStep` (for the state check). Two options:
> a) Expose raw `TaskStep[]` from the controller as `rawSteps` alongside the view models.
> b) Add a `getStepsForBatch(ids: Set<TaskStepId>): BatchStepTransitionItem[]` helper to the controller.
>
> **Decision:** Add `rawSteps: TaskStep[]` to `WorkingSectionStepsController` (alongside `steps: TaskStepCardViewModel[]`). This keeps the controller as the single source of truth. The view uses `rawSteps.filter(s => selectedStepIds.has(s.client_id))` to build the batch items.

**In `use-working-section-steps.controller.ts`:**
Add to `WorkingSectionStepsController`:
```ts
rawSteps: TaskStep[];
```
And to the return:
```ts
rawSteps: query.data?.items ?? [],
```

**Render branch:**

In the non-empty list branch:
```tsx
{section.allowsBatchWorking ? (
  <div className="flex flex-col gap-4 py-2 pb-10" data-testid="batch-steps-list">
    {steps.map((card) => (
      <BatchSelectableTaskStepCard
        key={card.stepId}
        card={card}
        selected={selectedStepIds.has(card.stepId)}
        onToggleSelect={handleToggleSelect}
        onTapImage={handleOpenImageViewer}
        onTapCard={handleOpenTaskDetail}
      />
    ))}
  </div>
) : (
  // existing TaskStepCard list
  <div className="flex flex-col gap-4 py-2 pb-10" data-testid="working-section-steps-list">
    {steps.map((card) => ( <TaskStepCard ... /> ))}
  </div>
)}
```

**Floating "Start Tasks" button (batch mode only):**

Rendered as an `absolute` element inside the outer `flex flex-col` wrapper, above the `PullToRefresh`. Shown when `section.allowsBatchWorking && selectedStepIds.size > 0`. Disabled (not hidden) when `eligibleSelectedSteps.length === 0` (e.g. all selected steps are already `working` or terminal).

The button label uses `eligibleSelectedSteps.length`, not `selectedStepIds.size`, so it accurately reflects how many items will actually be sent to the endpoint.

```tsx
{section.allowsBatchWorking && selectedStepIds.size > 0 ? (
  <div className="absolute bottom-[calc(var(--safe-bottom,0)+1rem)] left-0 right-0 z-20 px-4">
    <button
      className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card shadow-lg transition-opacity disabled:opacity-60"
      disabled={isBatchTransitioning || eligibleSelectedSteps.length === 0}
      type="button"
      onClick={handleBatchStart}
    >
      {isBatchTransitioning
        ? "Starting…"
        : `Start Tasks (${eligibleSelectedSteps.length})`}
    </button>
  </div>
) : null}
```

Position the outer wrapper as `relative` to contain the absolute button.

---

### Step 11 — Update `use-last-active-step-card.controller.ts` for batch
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-last-active-step-card.controller.ts`
**Action:** Modify

`useUserLastActiveStepQuery()` now returns `UserLastActivePayload`. Update reads:

```ts
const payload = query.data ?? { step: null, batchSteps: null };
const step = payload.step;
const batchSteps = payload.batchSteps ?? null;
const isBatchCard = Boolean(batchSteps?.length);
```

For the batch card, derive `batchVms: TaskStepCardViewModel[]` from `batchSteps`:
```ts
const batchVms = useMemo(
  () => (batchSteps ?? []).map(toTaskStepCardViewModel),
  [batchSteps],
);
```

Add `handleBatchTransition` (pause/resume the batch group):
```ts
const { transitionBatchAsync } = useTransitionBatchStepStates();

const handleBatchTransition = useCallback(
  async (targetState: "working" | "paused") => {
    if (!batchSteps?.length) return;
    const items = getBatchTransitionItems(batchSteps, targetState);
    if (items.length === 0) return;

    const workingSectionId = batchSteps[0].working_section_id;
    await transitionBatchAsync({
      items,
      new_state: targetState,
      reason: null,
      description: null,
      working_section_id: workingSectionId,
    });
  },
  [batchSteps, transitionBatchAsync],
);
```

Add `handleOpenBatchDetail`:

> **Field verification (correction 10):** Before using `batchSteps[0].working_section_id`, Codex must confirm this field exists on `TaskStepSchema` (it does — `TaskStepSchema` includes `working_section_id: WorkingSectionIdSchema`). `working_section_name_snapshot` is also present as `working_section_name_snapshot: z.string()`. Both fields are safe to use.

Surface props pass **step IDs only** (not full `TaskStep` objects). `BatchDetailSlidePage` is responsible for deriving live steps from the query cache using these IDs. This is the freshness contract.

```ts
const handleOpenBatchDetail = useCallback(() => {
  if (!batchSteps?.length) return;
  openSurface(BATCH_DETAIL_SLIDE_SURFACE_ID, {
    workingSectionId: batchSteps[0].working_section_id,
    workingSectionNameSnapshot: batchSteps[0].working_section_name_snapshot,
    batchStepIds: batchSteps.map((s) => s.client_id),
  } as BatchDetailSlideSurfaceProps);
}, [batchSteps, openSurface]);
```

Export additions in return:
```ts
return {
  step,
  vm,
  batchSteps,
  batchVms,
  isBatchCard,
  isPending: query.isPending,
  isTransitioning: isTransitioning && pendingStepId === step?.client_id,
  handleTransition,
  handleBatchTransition,
  handleOpenDetail,
  handleOpenBatchDetail,
  handleOpenImageViewer,
};
```

Also update `useEntityView` call — when in batch mode, track all batch step IDs:
```ts
// Track single step for realtime entity view
useEntityView("task_step", isBatchCard ? null : (step?.client_id ?? null));
// For batch, rely on workspace-level socket events (no per-entity subscription needed)
```

---

### Step 12 — Update `LastActiveStepCard` for batch card variant
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/LastActiveStepCard.tsx`
**Action:** Modify

The context now exposes `isBatchCard`, `batchVms`, `handleBatchTransition`, `handleOpenBatchDetail`.

Add a `BatchCard` sub-component (internal) rendered when `isBatchCard === true`:

```tsx
// BatchCard renders when isBatchCard is true
// Layout:
// - Left: first batch step's thumbnail (same CardThumbnail, from batchVms[0])
// - Center body: working section name + "N tasks" label + aggregate state indicator
// - Right: pause/resume action button for the batch
// - Tone: same as existing cardToneClass logic but based on majority batch state
//   (if any step is "working", tone = working; else tone = paused)
// - Tap: calls handleOpenBatchDetail
```

Determine majority batch action:
```ts
const batchHasWorking = batchVms.some((vm) => vm.state === "working");
const batchNextState: "working" | "paused" = batchHasWorking ? "paused" : "working";
const BatchActionIcon = batchHasWorking ? Pause : Play;
const batchActionLabel = batchHasWorking ? "Pause all" : "Resume all";

// Derive valid items for the intended transition — used to disable the button
// when no steps can actually be transitioned (e.g. all terminal).
// batchSteps is the raw TaskStep array from the controller (not vms).
const batchActionItems = batchSteps
  ? getBatchTransitionItems(batchSteps, batchNextState)
  : [];
const isBatchActionDisabled = batchActionItems.length === 0 || isBatchTransitioning;
```

The batch card displays:
- Thumbnail of `batchVms[0]` (first step, most recently active)
- Body: `batchVms[0].task.working_section_name_snapshot` as primary line
- Subline: mixed-state label such as `"2 working · 1 paused"` — compute counts from `batchVms` states. If all are the same state: `"3 working"`.
- Right side: pause/resume button — **disabled** when `isBatchActionDisabled` is true

Use `handleOpenBatchDetail` as the card's `onClick`.

The `hasCard` check changes:
```ts
const hasCard = isBatchCard ? Boolean(batchVms.length > 0) : Boolean(step && vm);
```

Wrap both single and batch variants in the same `AnimatePresence` + `m.div` shell. Use `key="last-active-batch-card"` for the batch variant, `key="last-active-step-card"` for the single variant.

---

### Step 13 — Add surface IDs for batch surfaces
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`
**Action:** Modify

Add:
```ts
export const BATCH_DETAIL_SLIDE_SURFACE_ID = "batch-detail-slide";
export const COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID =
  "batch-complete-confirmation-slide";
```

Add prop types:
```ts
// batchStepIds is the stable identity list — BatchDetailSlidePage derives
// live step data from useUserLastActiveStepQuery() using these IDs.
// Passing IDs (not full TaskStep objects) avoids stale-props problems after
// pause/resume/complete mutations or realtime updates.
export type BatchDetailSlideSurfaceProps = {
  workingSectionId: WorkingSectionId;
  workingSectionNameSnapshot: string;
  batchStepIds: TaskStepId[];
};

export type CompleteBatchTaskStepsConfirmationSlideSurfaceProps = {
  workingSectionId: WorkingSectionId;
  workingSteps: Array<{
    taskId: TaskId;
    stepId: TaskStepId;
    totalWorkingSeconds: number;
    totalPauseSeconds: number;
    lastStateRecordEnteredAt: string | null;
  }>;
  onConfirm: (markInaccurate: boolean) => void;
};
```

---

### Step 14 — Register batch surfaces in `surfaces.ts`
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`
**Action:** Modify

Add two `lazyWithPreload` registrations following the existing pattern:

```ts
function loadBatchDetailSlidePage() {
  return import("@/pages/task_steps/BatchDetailSlidePage").then((module) => ({
    default: module.BatchDetailSlidePage,
  }));
}

function loadCompleteBatchTaskStepsConfirmationSlidePage() {
  return import(
    "@/pages/task_steps/CompleteBatchTaskStepsConfirmationSlidePage"
  ).then((module) => ({
    default: module.CompleteBatchTaskStepsConfirmationSlidePage,
  }));
}

const batchDetailSlide = lazyWithPreload(loadBatchDetailSlidePage);
const completeBatchTaskStepsConfirmationSlide = lazyWithPreload(
  loadCompleteBatchTaskStepsConfirmationSlidePage,
);
```

Add preload exports:
```ts
export const preloadBatchDetailSlideSurface = batchDetailSlide.preload;
export const preloadCompleteBatchTaskStepsConfirmationSlideSurface =
  completeBatchTaskStepsConfirmationSlide.preload;
```

Add to `taskStepSurfaces`:
```ts
[BATCH_DETAIL_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: batchDetailSlide.Component,
},
[COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: completeBatchTaskStepsConfirmationSlide.Component,
},
```

---

### Step 15 — New `BatchDetailSlidePage`
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/BatchDetailSlidePage.tsx`
**Action:** New file

Props received via `useSurfaceProps<BatchDetailSlideSurfaceProps>()`:
- `workingSectionId`: for section image lookup + used in batch transition calls
- `workingSectionNameSnapshot`: displayed in header
- `batchStepIds: TaskStepId[]`: stable identity — derive live steps from query cache using these IDs

**Freshness strategy (correction 1):**

The page does **not** use `batchSteps` from props as the source of truth after mount. Instead it subscribes to `useUserLastActiveStepQuery()` and filters by `batchStepIds`:

```ts
const { data: lastActivePayload } = useUserLastActiveStepQuery();
const liveBatchSteps = useMemo(
  () => (lastActivePayload?.batchSteps ?? []).filter(
    (s) => batchStepIds.includes(s.client_id),
  ),
  [lastActivePayload?.batchSteps, batchStepIds],
);
```

After every batch mutation `useTransitionBatchStepStates` invalidates `taskStepKeys.userLastActive()`, triggering a refetch. `liveBatchSteps` is recomputed from fresh data — the page never stays on a stale snapshot.

When `liveBatchSteps.length === 0` (all steps terminal or removed from batch): show an empty state or auto-close the surface.

**Section image:** Look up from `workerWorkingSectionKeys.mine()` cache using `useQueryClient().getQueryData(...)`. Fall back to `null` if not cached — do not fire a new query.

**Header:**
```tsx
<header>
  <button onClick={() => close(BATCH_DETAIL_SLIDE_SURFACE_ID)} aria-label="Back">
    <ArrowLeft className="size-5" />
  </button>
  <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
    {sectionImageUrl ? <img src={sectionImageUrl} ... /> : <ImagePlaceholder />}
  </div>
  <span className="truncate text-lg font-semibold">{workingSectionNameSnapshot}</span>
</header>
```

**Batch action button (large circular):**
Reuse `TaskStepCircularActionButton` from `TaskDetailSlidePage` if it is exported. If not exported, read that file and adapt the same design (large `size-20 rounded-full bg-primary text-card` button with the relevant icon).

Determine batch action from `liveBatchSteps`:
```ts
const batchHasWorking = liveBatchSteps.some(s => s.state === "working");
const targetState: "working" | "paused" = batchHasWorking ? "paused" : "working";
const ActionIcon = batchHasWorking ? Pause : Play;
const batchActionItems = getBatchTransitionItems(liveBatchSteps, targetState);
const isBatchActionDisabled = batchActionItems.length === 0 || isBatchTransitioning;
```

On tap: call `useTransitionBatchStepStates().transitionBatch` with `batchActionItems`. After success `userLastActive` invalidates and `liveBatchSteps` refreshes automatically.

**Step list:**
Render `WorkingSectionStepsProvider` for the section (so individual `TaskStepCard` taps can open the detail slide with full context). Use the existing `TaskStepCard` component (full individual actions, no selection checkboxes). Use `liveBatchSteps` (derived from live query, not props) to drive the list — this ensures cards show current state after any mutation.

Alternative to avoid double-provider nesting: render cards directly using `useTransitionStepState` instantiated locally. However, the cleanest approach is to provide a `WorkingSectionStepsProvider` scoped to `workingSectionId` so individual card actions work seamlessly.

**Footer "Complete Tasks" button:**
```tsx
<div className="absolute bottom-[calc(var(--safe-bottom,0)+1rem)] left-0 right-0 px-4">
  <button
    className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"
    disabled={workingSteps.length === 0}
    type="button"
    onClick={handleOpenCompleteBatchConfirmation}
  >
    Complete Tasks
  </button>
</div>
```

`workingSteps` = `liveBatchSteps.filter(s => s.state === "working")`.

`handleOpenCompleteBatchConfirmation` opens `COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID` with:
```ts
{
  workingSectionId,
  workingSteps: workingSteps.map(s => ({
    taskId: s.task_id,
    stepId: s.client_id,
    totalWorkingSeconds: s.total_working_seconds,
    totalPauseSeconds: s.total_pause_seconds,
    lastStateRecordEnteredAt: s.last_state_record?.entered_at ?? null,
  })),
  onConfirm: (markInaccurate) => {
    // Omit mark_closing_record_inaccurate when accurate (do not send false).
    // Set to true per item only when the worker marks timing as inaccurate.
    const items = workingSteps.map(s => ({
      task_id: s.task_id,
      step_id: s.client_id,
      ...(markInaccurate && { mark_closing_record_inaccurate: true }),
    }));
    transitionBatch(
      { items, new_state: "completed", reason: null, description: null, working_section_id: workingSectionId },
      {
        onSuccess: () => {
          // Post-completion cleanup (correction 15):
          // 1. Close confirmation slide.
          close(COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID);
          // 2. Close batch detail slide.
          close(BATCH_DETAIL_SLIDE_SURFACE_ID);
          // 3. userLastActive is already invalidated by the mutation hook.
          //    If no active batch steps remain, the resume card will disappear
          //    on its own when the query returns null/empty batchSteps.
        },
      },
    );
  },
}
```

---

### Step 16 — New `CompleteBatchTaskStepsConfirmationSlidePage`
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/CompleteBatchTaskStepsConfirmationSlidePage.tsx`
**Action:** New file

Mirror `CompleteTaskStepConfirmationSlidePage` structure.

Props via `useSurfaceProps<CompleteBatchTaskStepsConfirmationSlideSurfaceProps>()`:
- `workingSteps` array
- `onConfirm(markInaccurate: boolean)`

**Time stats shown:**
- Total working time: sum of `totalWorkingSeconds` + ticking offset from most recent `lastStateRecordEnteredAt` (use the one with the most recent `entered_at` across all working steps).
- Total paused time: sum of `totalPauseSeconds` across all working steps.

**Step count label:**
```tsx
<p className="text-sm text-muted-foreground">
  Completing {workingSteps.length} task{workingSteps.length !== 1 ? "s" : ""}
</p>
```

**Time accuracy question:** Identical to `CompleteTaskStepConfirmationSlidePage` — same radio cards.

**Confirm button:**

Do **not** close the confirmation slide from the button's `onClick`. Closing is handled by the `onSuccess` callback (defined in `BatchDetailSlidePage`) after the mutation resolves. Closing before success would leave the batch detail slide in a stale open state if the mutation subsequently fails.

```tsx
<button
  disabled={selection === null || isConfirming}
  type="button"
  onClick={() => {
    if (selection === null) return;
    onConfirm(selection === "inaccurate");
    // Do NOT call close() here — onConfirm's onSuccess closes both slides.
  }}
>
  Complete Tasks
</button>
```

`isConfirming` — a local boolean set when `onConfirm` is called and cleared on error (if `onConfirm` is async) or managed by the mutation's `isPending` state. The simplest approach: `onConfirm` receives the mutation's `isPending` as a prop alongside `onConfirm`.

---

### Step 17 — Update socket event handlers
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`
**Action:** Modify

**Correction 9 — Coalesced event shape and single-invalidate contract:**

The backend broadcasts a single `task:step-state-changed` `BatchWorkspaceEvent` for every batch transition. The socket event payload carries an `items` array (not individual payloads):

```ts
// Socket event shape for task:step-state-changed (coalesced)
type StepStateChangedPayload = {
  items: Array<{ client_id: TaskStepId; new_state: StepState }>;
};
```

Before checking anything, extract **all** changed `client_id`s at once:
```ts
const changedClientIds = new Set(event.items.map((i: { client_id: string }) => i.client_id));
```

This set is then used for all subsequent checks (terminal match, batch terminal, deleted step match). There must be exactly **one** call to `invalidateQueries({ queryKey: taskStepKeys.userLastActive() })` per event — never one per changed item.

Codex must read the existing `socket-events.ts` to check what shape the handler already uses (`payloads` array vs `items` array vs single item). If the existing handler already uses an `items` array (as indicated by the handoff document), verify the variable name used and update accordingly. Do not rename or restructure the handler shape unless needed for correctness.

Every handler that reads `queryClient.getQueryData<TaskStep | null>(taskStepKeys.userLastActive())` must now read `UserLastActivePayload`:

```ts
const cachedPayload = queryClient.getQueryData<UserLastActivePayload>(taskStepKeys.userLastActive());
```

**`task:step-state-changed`:** Extract all changed IDs, then check terminal states. One invalidate call at the end:
```ts
// Extract all changed IDs from the coalesced event (one item per changed step)
const changedClientIds = new Set(event.items.map((i) => i.client_id));

const cachedPayload = queryClient.getQueryData<UserLastActivePayload>(taskStepKeys.userLastActive());

// Single mode: if the active single step hit terminal, clear immediately (no network)
if (!cachedPayload?.batchSteps?.length && cachedPayload?.step) {
  if (
    changedClientIds.has(cachedPayload.step.client_id) &&
    event.items.some(
      (i) => i.client_id === cachedPayload.step!.client_id &&
        STEP_TERMINAL_STATES.has(i.new_state),
    )
  ) {
    queryClient.setQueryData<UserLastActivePayload>(taskStepKeys.userLastActive(), {
      step: null,
      batchSteps: null,
    });
    return;
  }
}

// Batch mode: if ALL batch steps hit terminal, clear immediately
if (cachedPayload?.batchSteps?.length) {
  const allTerminal = cachedPayload.batchSteps.every((bs) =>
    event.items.some(
      (i) => i.client_id === bs.client_id && STEP_TERMINAL_STATES.has(i.new_state),
    ),
  );
  if (allTerminal) {
    queryClient.setQueryData<UserLastActivePayload>(taskStepKeys.userLastActive(), {
      step: null,
      batchSteps: null,
    });
    return;
  }
}

// Single invalidate — not one per changed item
void queryClient.invalidateQueries({ queryKey: taskStepKeys.userLastActive(), refetchType: "active" });
```

**`task:step-deleted`:** Same cache shape update for `activeStep` check:
```ts
const cachedPayload = queryClient.getQueryData<UserLastActivePayload>(taskStepKeys.userLastActive());
const activeStepId = cachedPayload?.step?.client_id;
const deletedIds = new Set(event.items.map((i) => i.client_id));
if (activeStepId && deletedIds.has(activeStepId)) {
  queryClient.setQueryData<UserLastActivePayload>(taskStepKeys.userLastActive(), {
    step: null,
    batchSteps: null,
  });
} else {
  void queryClient.invalidateQueries({ queryKey: taskStepKeys.userLastActive(), refetchType: "active" });
}
```

**`task:updated` and `task:state-changed`:**
```ts
const cachedPayload = queryClient.getQueryData<UserLastActivePayload>(taskStepKeys.userLastActive());
const activeTaskId =
  cachedPayload?.step?.task.client_id ??
  cachedPayload?.batchSteps?.[0]?.task.client_id;
const changedTaskIds = new Set(event.items.map((i) => i.client_id));
if (activeTaskId && changedTaskIds.has(activeTaskId)) {
  void queryClient.invalidateQueries({ queryKey: taskStepKeys.userLastActive(), refetchType: "active" });
}
```

---

### Step 18 — Update `use-transition-step-state.ts` for new cache shape
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/actions/use-transition-step-state.ts`
**Action:** Modify

**Correction 7 — Full `UserLastActivePayload` cache migration checklist:**

Before touching any single file, Codex must audit _every_ place that reads or writes `taskStepKeys.userLastActive()`. The complete list of files that must be updated:

1. `task_steps/api/fetch-user-last-active-step.ts` — return type changed to `UserLastActivePayload` (Step 3)
2. `task_steps/api/use-user-last-active-step.ts` — query generic changed to `useQuery<UserLastActivePayload>` (Step 4)
3. `task_steps/controllers/use-last-active-step-card.controller.ts` — reads `payload.step` and `payload.batchSteps` (Step 11)
4. `task_steps/socket-events.ts` — all handlers that `getQueryData` or `setQueryData` on `userLastActive` (Step 17)
5. `task_steps/actions/use-transition-step-state.ts` — `onMutate`, `onError` rollback, `onSuccess` patch (this step)
6. `app/AppShell.tsx` — no direct `getQueryData` call, but if `LastActiveStepCardProvider` reads the query key internally, that must be audited too.

After all files are updated there should be **zero** references to `getQueryData<TaskStep | null>(taskStepKeys.userLastActive())` and **zero** `setQueryData(taskStepKeys.userLastActive(), <bare TaskStep | null>)` anywhere in the codebase.

**Correction 8 — Single-step optimistic update contract:**

The existing individual `use-transition-step-state.ts` optimistic update must be modified to **only patch `payload.step`** and leave `payload.batchSteps` completely unchanged. The following invariants are required:

- `setQueryData<UserLastActivePayload>` never overwrites the whole object with a bare `TaskStep | null`.
- The `setQueryData` updater function always starts from the current `UserLastActivePayload`, spreads it, and replaces only the `step` field.
- If `current` is `undefined` (query not yet loaded), return `{ step: null, batchSteps: null }` — not a bare `null`.
- If a worker is currently in batch mode (batchSteps is non-null) and transitions an individual step simultaneously (race condition), the optimistic patch must not wipe `batchSteps`.

This means the updater MUST use the functional form (`(current) => ...`) and MUST be typed `setQueryData<UserLastActivePayload>` — never `setQueryData(key, newValue)` with a direct value.

Every `queryClient.getQueryData<TaskStep | null>(taskStepKeys.userLastActive())` / `queryClient.setQueryData(taskStepKeys.userLastActive(), ...)` must use the new shape.

`onMutate` snapshot read:
```ts
const previousLastActive = queryClient.getQueryData<UserLastActivePayload>(
  taskStepKeys.userLastActive(),
);
```

Rollback in `onError`:
```ts
queryClient.setQueryData(taskStepKeys.userLastActive(), context?.previousLastActive ?? { step: null, batchSteps: null });
```

`onMutate` optimistic update — update `step` field within the payload:
```ts
queryClient.setQueryData<UserLastActivePayload>(
  taskStepKeys.userLastActive(),
  (current) => {
    if (!current) return { step: null, batchSteps: null };
    return {
      ...current,
      step: patchOptimisticLastActiveStep(
        current.step,
        sectionListLookup,
        step_id,
        new_state,
        now,
      ),
    };
  },
);
```

`onSuccess` patch (paused/ended_shift fast-path):
```ts
queryClient.setQueryData<UserLastActivePayload>(
  taskStepKeys.userLastActive(),
  (currentPayload) => {
    if (!currentPayload?.step || currentPayload.step.client_id !== data.step_id) {
      return currentPayload ?? { step: null, batchSteps: null };
    }
    return {
      ...currentPayload,
      step: { ...currentPayload.step, state: data.new_state, last_state_record: data.last_state_record },
    };
  },
);
```

---

### Step 19 — Update `task_steps/index.ts` exports
**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/index.ts`
**Action:** Modify

Add:
```ts
export { BatchSelectableTaskStepCard } from "./components/BatchSelectableTaskStepCard";
export {
  BATCH_DETAIL_SLIDE_SURFACE_ID,
  COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID,
} from "./surface-ids";
export type {
  BatchDetailSlideSurfaceProps,
  CompleteBatchTaskStepsConfirmationSlideSurfaceProps,
  UserLastActivePayload,
  BatchStepTransitionRequest,
} from "./types"; // adjust as needed based on what other files need
export {
  canTransitionToWorking,
  canTransitionToPaused,
  canTransitionToCompleted,
  getBatchTransitionItems,
} from "./types";
export {
  preloadBatchDetailSlideSurface,
  preloadCompleteBatchTaskStepsConfirmationSlideSurface,
} from "./surfaces";
```

---

### Step 20 — Manager app: `allows_batch_working` toggle
**File(s):** Manager app working-section create/edit forms
**Action:** Locate + modify

**Correction 11 — Explicit schema/form/request/label detail:**

Codex must first locate all relevant files before touching any of them:

**Locate commands (run all before modifying):**
```sh
# Find all manager working-section form/schema files
grep -r "working.section\|WorkingSection" apps/managers-app --include="*.ts" --include="*.tsx" -l

# Find the create mutation (PUT)
grep -r "PUT.*working.section\|working.sections.*PUT\|/working-sections\"" apps/managers-app --include="*.ts" --include="*.tsx" -l

# Find the edit/patch mutation
grep -r "PATCH.*working.section\|working-section.*PATCH\|working_section_id" apps/managers-app --include="*.ts" --include="*.tsx" -l

# Find the Zod schema for the full working section
grep -r "WorkingSectionSchema\|WorkingSection.*Schema\|z\.object.*working_section" apps/managers-app --include="*.ts" -l
```

**Schema changes — working-section Zod schema:**

In the full working-section schema (used for `GET /api/v1/working-sections/{id}` responses):
```ts
allows_batch_working: z.boolean(),
```

If the schema also has a `WorkingSectionViewModel` equivalent, add:
```ts
allowsBatchWorking: boolean;
```
And in the mapper:
```ts
allowsBatchWorking: raw.allows_batch_working,
```

**Create form (`PUT /api/v1/working-sections`) changes:**

Zod form schema — add field:
```ts
allows_batch_working: z.boolean().default(false),
```

Request body — include field:
```ts
allows_batch_working: form.values.allows_batch_working,
```

Form default values — add:
```ts
allows_batch_working: false,
```

**Edit form (`PATCH /api/v1/working-sections/{id}`) changes:**

Same Zod field addition as create. In the initial values loaded from the existing section:
```ts
allows_batch_working: existingSection.allows_batch_working ?? false,
```

Request body — include field (omit if the form treats `undefined` as "no change" — check existing PATCH pattern):
```ts
allows_batch_working: form.values.allows_batch_working,
```

**UI toggle element — label and position:**

Find where other boolean toggles (e.g. visibility, availability) are placed in the form and insert the new toggle in the same section:

```tsx
<label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
  <div className="flex flex-col gap-0.5">
    <span className="text-sm font-medium text-foreground">Allow batch working</span>
    <span className="text-xs text-muted-foreground">
      Workers can start and manage multiple tasks simultaneously.
    </span>
  </div>
  <Switch
    checked={form.values.allows_batch_working}
    onCheckedChange={(checked) => form.setFieldValue("allows_batch_working", checked)}
  />
</label>
```

Use the existing `Switch` component from the managers app's UI library if present. If there is no `Switch` component, use an `<input type="checkbox" />` with the same Tailwind class pattern used by other boolean toggles in that form.

---

## Risks and mitigations

- Risk: `UserLastActivePayload` cache shape change breaks `use-transition-step-state.ts` optimistic logic.
  Mitigation: Step 18 explicitly updates every read/write point; the `onMutate` only patches `payload.step` (the individual step field), leaving `batchSteps` unchanged.

- Risk: `LastActiveStepCard` shows both batch card and single card stacked if keys are wrong.
  Mitigation: Use distinct `key` values (`"last-active-step-card"` vs `"last-active-batch-card"`) inside `AnimatePresence` — only one `m.div` renders at a time via conditional.

- Risk: `BatchDetailSlidePage` opens with stale `batchSteps` (server sent active_batch_steps, user pauses one, card shows old list).
  Mitigation: Tapping the batch card passes the current `batchSteps` from the live query cache. After any transition the `userLastActive` is invalidated and the card refetches; re-opening the detail will use fresh data. Accept brief staleness between open and next refetch — batch detail only renders from a tap so this is acceptable.

- Risk: Manager app forms differ significantly from the workers app patterns — search results may find multiple candidate files.
  Mitigation: Step 20 provides a specific grep command; Codex should inspect each candidate before modifying.

- Risk: `TaskStepCircularActionButton` in `TaskDetailSlidePage` may not be exported.
  Mitigation: Codex reads the file; if not exported, inlines an identical button locally in `BatchDetailSlidePage`.

- Risk: Batch `"Start Tasks"` floating button overlaps the bottom tab bar on devices with a large safe-area-inset.
  Mitigation: Uses `bottom-[calc(var(--safe-bottom,0)+1rem)]` which accounts for the safe area. `LastActiveStepCard` uses the same bottom offset pattern — follow it exactly.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- Manual — Scenario 1 (non-batch section): open a section with `allowsBatchWorking === false` → existing behaviour, existing cards, no selection UI visible.
- Manual — Scenario 2 (batch section, select + start): open batch section → `BatchSelectableTaskStepCard` renders; tap 2 cards → "Start Tasks (2)" button appears; `LastActiveStepCard` disappears; tap button → steps become `working`; selection clears.
- Manual — Scenario 3 (batch resume card): start batch steps → resume card shows batch variant; tap card → `BatchDetailSlidePage` opens with correct header, circular action button, step list.
- Manual — Scenario 4 (batch pause/resume via batch card): circular button in detail page sends batch endpoint; steps update; realtime `task:step-state-changed` event arrives; card updates.
- Manual — Scenario 5 (complete batch): in batch detail, tap "Complete Tasks" → confirmation slide opens; select accuracy; confirm → batch endpoint called with `new_state: "completed"` and correct `mark_closing_record_inaccurate` flags; steps disappear from active batch.
- Manual — Scenario 6 (atomic failure): select a step already in `completed` state (or reject from server) → error toast appears; no steps change state; list refetches.
- Manual — Scenario 7 (manager toggle): in managers app, create/edit a working section with `allows_batch_working: true`; save; fetch that section → confirm field is persisted.
- Manual — Scenario 8 (mixed-state batch — correction 18): start a batch of 3 steps → 2 become `working`, 1 becomes `paused` (simulate via individual step pause). Verify:
  - `LastActiveStepCard` batch card shows `"2 working · 1 paused"` subline.
  - Circular pause button in `BatchDetailSlidePage` sends only the 2 `working` steps (not the already-paused one) to the batch endpoint with `new_state: "paused"`.
  - After pause, subline updates to `"3 paused"`; circular button switches to Play (resume).
  - "Start Tasks (N)" in `WorkingSectionStepsView` shows only `N` eligible steps (those that can transition to `working`) — not all selected steps regardless of state.
  - `eligibleSelectedSteps` count matches what was actually sent to the endpoint.

---

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
