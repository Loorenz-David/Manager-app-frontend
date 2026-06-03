# PLAN_workers_step_deferred_completion_20260602

## Metadata

- Plan ID: `PLAN_workers_step_deferred_completion_20260602`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-02T00:00:00Z`
- Last updated at (UTC): `2026-06-02T08:29:55Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: When a worker taps "Complete task" on the task detail slide, the backend schedules the completion for 5 seconds later instead of applying it immediately. The frontend must optimistically treat the step as completed, display a countdown undo button during the window, fire deferred query invalidation on expiry, and call the cancel API if the user taps undo.
- Business/user intent: Workers sometimes tap "Complete" by mistake. The 5-second window gives them a safe escape without degrading the normal completion UX — the step visually completes instantly, and cancellation is a tap away.
- Non-goals: Changing non-`completed` transitions (working, paused, ended_shift, failed, cancelled) — those remain synchronous and unchanged.

## Scope

- In scope:
  - Update `TransitionStepStateOutput` to a discriminated union that handles the new `pending_completion` response shape for `completed` transitions.
  - Update `transitionStepState` API function Zod schema to parse the union response.
  - Add `cancelPendingCompletion` API function (`DELETE /api/v1/tasks/{task_id}/steps/{step_id}/pending-completion`).
  - Update `useTransitionStepState` action hook: suppress `onSettled` invalidation for `completed`; store `pendingCompletion` state; expose it.
  - Add `useCancelPendingStepCompletion` action hook.
  - Update `useTaskStepDetailController`: add `pendingCompletion`, `handleCancelCompletion`, `handleCompletionExpired`, `isCancellingCompletion`.
  - Add `TaskStepCompletionUndoButton` component: countdown, undo tap, auto-expiry callback.
  - Update `TaskDetailSlidePage` to conditionally render the undo button or the complete button.
- Out of scope:
  - Task step list (WorkingSectionStepsView / TaskStepCard) — already reads optimistic state from the shared cache; no list-level UI change required.
  - LastActiveStepCard — no UI change required.
  - Non-completed transitions in `useTransitionStepState`.
  - Real-time socket integration for the deferred completion event.
- Assumptions:
  - Backend returns `{ "pending_completion_id": "dsch_xxx", "expires_at": "<ISO>" }` (not the normal `{ step_id, new_state, last_state_record }`) for `completed` transitions. **Confirmed by handoff.**
  - `DELETE /api/v1/tasks/{task_id}/steps/{step_id}/pending-completion` returns `{ "cancelled": true }` within the window, or `{ "ok": false, "error": "No active pending completion found…" }` after expiry. The `apiClient` will throw on the error shape; `onError` in the cancel mutation handles it. **Confirmed by handoff.**
  - Step state on the backend remains `working` during the undo window — only the worker finalizes it after `expires_at`. The frontend optimistic write is the only source of truth during that window.
  - `expires_at` timing is scheduler-driven and may not be exactly 5.0s — the countdown must be driven by the `expires_at` ISO timestamp from the server, not a fixed `setTimeout(5000)`.
  - Realtime events (`task:step-state-changed`, `task:step-readiness-changed`, `task:state-changed`) are dispatched by the backend worker after finalization. These will update the cache via existing socket listeners independently of the deferred `invalidateQueries` in `handleCompletionExpired`. Both paths are safe to coexist.

## Clarifications required

- [x] Confirm the cancel endpoint path — **resolved**: `DELETE /api/v1/tasks/{task_id}/steps/{step_id}/pending-completion` confirmed by backend handoff doc.
- [x] Confirm whether the `ConflictError` on cancel-after-expiry should silently invalidate or surface a toast — **resolved**: show a `notify.error` toast (confirmed by user).

## Acceptance criteria

1. Tapping "Complete task" replaces the complete button with an undo button that counts down from ~5 to 0. The step card in the section list and the detail header show `completed` state optimistically during this window.
2. Tapping undo within the window calls `DELETE …/pending-completion`, clears the undo button, and queries refetch showing the step back as `working`.
3. When the countdown reaches 0 without a cancel, queries are invalidated to sync the server-confirmed `completed` state; the undo button disappears.
4. If the complete API call fails (network error etc.), the optimistic state is rolled back immediately (existing `onError` rollback behavior — unchanged).
5. Tapping undo after the window has closed (race condition) shows an error toast and syncs queries to `completed`.
6. Non-completed transitions are completely unaffected.
7. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: action hook structure, optimistic snapshot / rollback pattern, `onMutate` / `onSuccess` / `onError` / `onSettled` lifecycle.
- `architecture/05_server_state.md`: `invalidateQueries` / `setQueriesData` / `cancelQueries` usage, query key hierarchy.
- `architecture/07_components.md`: feature component authoring, context consumption.
- `architecture/15_feature_structure.md`: file placement rules — api/, actions/, components/, controllers/, providers/.

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`); no impact on this plan.

### File read intent — pattern vs. relational

Permitted relational reads already done:
- `features/task_steps/types.ts` — established `StepState`, `STEP_TERMINAL_STATES`, `TransitionStepStateOutput`, `LastStateRecord`, `TaskStep`, `TaskStepsPagination`.
- `features/task_steps/api/task-step-keys.ts` — confirmed `sectionListsBySection`, `userLastActive`, `sectionLists` key shapes.
- `features/task_steps/api/transition-step-state.ts` — established current response schema and API call shape.
- `features/task_steps/actions/use-transition-step-state.ts` — established full optimistic mutation lifecycle.
- `features/task_steps/controllers/use-task-step-detail.controller.ts` — established `TaskStepDetailController` type and `handleComplete` callback.
- `pages/task_steps/TaskDetailSlidePage.tsx` — established current button layout and context consumption.

Prohibited pattern reads:
- No other action hooks read (pattern is covered by `08_hooks.md`).
- No other providers read (pattern is covered by `23_providers.md`).

### Skill selection

- Primary skill: `skills/action-hook/SKILL.md` (if available) — action hook with optimistic updates.
- Trigger terms: `useMutation`, `onMutate`, `onSettled`, `invalidateQueries`, `setQueriesData`.

## Domain schemas consulted

- `src/features/task_steps/types.ts`:
  - Entity: `TaskStep`, `TaskStepId`, `TaskId`, `WorkingSectionId`
  - States: `StepState`, `STEP_TERMINAL_STATES` (`completed`, `skipped`, `failed`, `cancelled`)
  - Records: `LastStateRecord` — `{ state, entered_at, exited_at, last_action_by?, first_started_at? }`
  - Current output type: `TransitionStepStateOutput = { step_id: TaskStepId; new_state: StepState; last_state_record: LastStateRecord }`
  - Cache shape: `TaskStepsPagination = { items: TaskStep[]; limit; offset; has_more }`

## Implementation plan

### Step 1 — Types (`features/task_steps/types.ts`)

Add a `PendingStepCompletion` type and update `TransitionStepStateOutput` to a discriminated union.

```ts
// New type for pending completion payload coming back from the action hook
export type PendingStepCompletion = {
  pendingCompletionId: string;
  expiresAt: string;       // ISO timestamp from server
  stepId: TaskStepId;
  workingSectionId: WorkingSectionId;
};

// Updated output — discriminated union
export type TransitionStepStateOutput =
  | {
      kind: "immediate";
      step_id: TaskStepId;
      new_state: StepState;
      last_state_record: LastStateRecord;
    }
  | {
      kind: "pending_completion";
      pending_completion_id: string;
      expires_at: string;
    };

// New cancel output
export type CancelPendingCompletionOutput = { cancelled: true };
```

### Step 2 — Update `api/transition-step-state.ts`

Replace `TransitionResponseDataSchema` with a `z.union` that tries the pending-completion shape first (it has unique fields), then falls back to the immediate shape. Add `kind` discriminant via `.transform()`.

```ts
const PendingCompletionDataSchema = z
  .object({
    pending_completion_id: z.string(),
    expires_at: z.string(),
  })
  .transform((d) => ({ kind: "pending_completion" as const, ...d }));

const ImmediateTransitionDataSchema = z
  .object({
    step_id: z.string().transform((v) => v as TaskStepId),
    new_state: StepStateSchema,
    last_state_record: LastStateRecordSchema,
  })
  .transform((d) => ({ kind: "immediate" as const, ...d }));

const TransitionResponseDataSchema = z.union([
  PendingCompletionDataSchema,
  ImmediateTransitionDataSchema,
]);
```

Return type of `transitionStepState` changes to `Promise<TransitionStepStateOutput>`.

### Step 3 — New `api/cancel-pending-completion.ts`

```ts
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import type { TaskId, TaskStepId } from "@beyo/lib";
import type { CancelPendingCompletionOutput } from "../types";

const CancelResponseSchema = z.object({ cancelled: z.literal(true) });

export async function cancelPendingCompletion(input: {
  task_id: TaskId;
  step_id: TaskStepId;
}): Promise<CancelPendingCompletionOutput> {
  const envelope = await apiClient.delete(
    `/api/v1/tasks/${input.task_id}/steps/${input.step_id}/pending-completion`,
    ApiEnvelopeSchema(CancelResponseSchema),
  );
  return envelope.data;
}
```

> Verify that `apiClient.delete` exists and accepts the same signature as `apiClient.post`. If not, use `apiClient.request("DELETE", …)` per the api-client contract.

### Step 4 — Update `actions/use-transition-step-state.ts`

**Four changes:**

**4a. Add `pendingCompletion` state** inside the hook (above the `useMutation` call):
```ts
const [pendingCompletion, setPendingCompletion] =
  useState<PendingStepCompletion | null>(null);
```

**4b. Update `onSuccess`** — narrow on `data.kind`:
```ts
onSuccess: (data, variables) => {
  if (data.kind === "pending_completion") {
    // Optimistic state from onMutate stays in cache — do not patch or invalidate.
    // Store pending info so the controller can drive the undo button.
    setPendingCompletion({
      pendingCompletionId: data.pending_completion_id,
      expiresAt: data.expires_at,
      stepId: variables.step_id,
      workingSectionId: variables.working_section_id,
    });
    return;
  }
  // kind === "immediate" — existing behavior unchanged
  patchStepStateInSectionCache(
    queryClient,
    variables.working_section_id,
    data.step_id,
    data.new_state,
    data.last_state_record,
  );
  if (data.new_state === "paused" || data.new_state === "ended_shift") {
    queryClient.setQueryData<TaskStep | null>(
      taskStepKeys.userLastActive(),
      (currentLastActive) => { /* existing in-place patch */ },
    );
  }
},
```

**4c. Update `onSettled`** — skip all invalidations for `completed` (deferred to the 5-second timer):
```ts
onSettled: (_data, _err, { working_section_id, new_state }) => {
  if (new_state === "completed") {
    // Invalidation is deferred: controller fires it via handleCompletionExpired
    // after the undo window closes, or via handleCancelCompletion on undo.
    return;
  }
  void queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionListsBySection(working_section_id),
  });
  void queryClient.invalidateQueries({
    queryKey: workerWorkingSectionKeys.mine(),
  });
  if (new_state === "working" || STEP_TERMINAL_STATES.has(new_state)) {
    void queryClient.invalidateQueries({
      queryKey: taskStepKeys.userLastActive(),
    });
  }
},
```

**4d. Expose new fields** in the return value:
```ts
return {
  transitionStepState: mutation.mutate,
  transitionStepStateAsync: mutation.mutateAsync,
  isPending: mutation.isPending,
  pendingStepId: mutation.isPending ? mutation.variables?.step_id : null,
  error: mutation.error,
  pendingCompletion,
  clearPendingCompletion: () => setPendingCompletion(null),
};
```

Update `TransitionStepStateAction` export type to include the new fields.

### Step 5 — New `actions/use-cancel-pending-step-completion.ts`

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type WorkingSectionId } from "@beyo/lib";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { cancelPendingCompletion } from "../api/cancel-pending-completion";
import { taskStepKeys } from "../api/task-step-keys";
import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";

type CancelInput = {
  task_id: TaskId;
  step_id: TaskStepId;
  working_section_id: WorkingSectionId;
};

function invalidateAllCompletionRelatedQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  working_section_id: WorkingSectionId,
) {
  void queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionListsBySection(working_section_id),
  });
  void queryClient.invalidateQueries({
    queryKey: workerWorkingSectionKeys.mine(),
  });
  void queryClient.invalidateQueries({
    queryKey: taskStepKeys.userLastActive(),
  });
}

export function useCancelPendingStepCompletion() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ task_id, step_id }: CancelInput) =>
      cancelPendingCompletion({ task_id, step_id }),

    onSuccess: (_data, { working_section_id }) => {
      // Backend reverted — refetch to show "working" state again.
      invalidateAllCompletionRelatedQueries(queryClient, working_section_id);
    },

    onError: (_err, { working_section_id }) => {
      // ConflictError means the window already expired and the step is completed.
      // Invalidate to sync the real server state.
      invalidateAllCompletionRelatedQueries(queryClient, working_section_id);
      notify.error(
        "Could not undo",
        "The completion window has already passed.",
      );
    },
  });

  return {
    cancelCompletion: mutation.mutate,
    isCancelling: mutation.isPending,
  };
}
```

### Step 6 — Update `controllers/use-task-step-detail.controller.ts`

**6a. Import** `useCancelPendingStepCompletion` and `PendingStepCompletion`.

**6b. Instantiate** the cancel hook:
```ts
const { cancelCompletion, isCancelling: isCancellingCompletion } =
  useCancelPendingStepCompletion();
```

**6c. Destructure `pendingCompletion` and `clearPendingCompletion`** from `useTransitionStepState`:
```ts
const {
  transitionStepState,
  isPending: isTransitioning,
  pendingStepId,
  pendingCompletion,
  clearPendingCompletion,
} = useTransitionStepState();
```

**6d. Add `handleCancelCompletion`**:
```ts
const handleCancelCompletion = useCallback(() => {
  if (!pendingCompletion) return;
  clearPendingCompletion();
  cancelCompletion({
    task_id: resolvedTaskId,
    step_id: resolvedStepId,
    working_section_id: resolvedWorkingSectionId,
  });
}, [pendingCompletion, clearPendingCompletion, cancelCompletion, resolvedTaskId, resolvedStepId, resolvedWorkingSectionId]);
```

**6e. Add `handleCompletionExpired`** — called by the undo button component when the countdown reaches 0:
```ts
const handleCompletionExpired = useCallback(() => {
  if (!pendingCompletion) return;
  clearPendingCompletion();
  // Now that the server has finalized, sync all affected queries.
  void queryClient.invalidateQueries({
    queryKey: taskStepKeys.sectionListsBySection(resolvedWorkingSectionId),
  });
  void queryClient.invalidateQueries({
    queryKey: workerWorkingSectionKeys.mine(),
  });
  void queryClient.invalidateQueries({
    queryKey: taskStepKeys.userLastActive(),
  });
}, [pendingCompletion, clearPendingCompletion, queryClient, resolvedWorkingSectionId]);
```

**6f. Update `TaskStepDetailController` type** to add:
```ts
pendingCompletion: PendingStepCompletion | null;
handleCancelCompletion: () => void;
handleCompletionExpired: () => void;
isCancellingCompletion: boolean;
```

**6g. Add to the return object**: all four new fields.

Note: `useQueryClient()` must be added to the controller's hook imports if not already present. Check the current imports — it is not currently imported; add it.

### Step 7 — New `components/detail/TaskStepCompletionUndoButton.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

type Props = {
  expiresAt: string;
  onUndo: () => void;
  onExpired: () => void;
  isCancelling: boolean;
};

export function TaskStepCompletionUndoButton({
  expiresAt,
  onUndo,
  onExpired,
  isCancelling,
}: Props): React.JSX.Element {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );
  const expiredFired = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);

      if (remaining <= 0 && !expiredFired.current) {
        expiredFired.current = true;
        onExpired();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card disabled:opacity-50"
      data-testid="task-step-complete-undo-button"
      disabled={isCancelling || secondsLeft <= 0}
      onClick={onUndo}
    >
      <ArrowLeft className="h-4 w-4 text-card" />
      <span>Undo</span>
      <span>{secondsLeft}s</span>
    </button>
  );
}
```

Key decisions:
- `200ms` interval for a smooth countdown display (not perceptible jitter).
- `expiredFired` ref guards against `onExpired` being called more than once if the component re-renders mid-interval.
- Colors: `bg-primary` (CSS var `--color-primary`), `text-card` on both text and icon (`text-card` applied to button, icon inherits via `currentColor`; explicit `text-card` class on icon enforces it regardless of cascade).
- Not full-width: `inline-flex` instead of `w-full flex`.

### Step 8 — Update `components/detail/index.ts`

Add:
```ts
export { TaskStepCompletionUndoButton } from "./TaskStepCompletionUndoButton";
```

### Step 9 — Update `pages/task_steps/TaskDetailSlidePage.tsx`

In `TaskDetailSlidePageContent`, read new controller fields:
```ts
const controller = useTaskStepDetailContext();
// existing...
const pendingCompletion =
  controller.pendingCompletion?.stepId === controller.vm?.stepId
    ? controller.pendingCompletion
    : null;
```

Replace the complete-button block with conditional rendering:
```tsx
{!controller.isStepTerminal && canTransitionToCompleted ? (
  <div
    className={cn(
      "absolute inset-x-0 bottom-0 z-0 transition-transform duration-300",
      isHidden ? "translate-y-full" : "translate-y-0",
    )}
  >
    <div className="px-4 pb-[calc(var(--safe-bottom,0)+5.25rem)] pt-3">
      {pendingCompletion ? (
        <TaskStepCompletionUndoButton
          expiresAt={pendingCompletion.expiresAt}
          isCancelling={controller.isCancellingCompletion}
          onUndo={controller.handleCancelCompletion}
          onExpired={controller.handleCompletionExpired}
        />
      ) : (
        <button
          type="button"
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="task-step-complete-button"
          disabled={isStepTransitioning}
          onClick={controller.handleComplete}
        >
          Complete task
        </button>
      )}
    </div>
  </div>
) : null}
```

Import `TaskStepCompletionUndoButton` from `@/features/task_steps/components/detail`.

## Risks and mitigations

- Risk: `apiClient.delete` may not exist on the client — `transition-step-state.ts` only uses `apiClient.post`.
  Mitigation: Check `@beyo/api-client` exports before writing `cancel-pending-completion.ts`. Use `apiClient.request("DELETE", …)` if `.delete` is not a named method.

- Risk: The countdown `onExpired` fires in a stale closure if `handleCompletionExpired` identity changes between renders.
  Mitigation: The `expiresAt` prop drives the interval; `onExpired` is passed as a stable callback from the controller via `useCallback` with correct deps. The `expiredFired` ref ensures a single call even if `onExpired` changes identity mid-interval.

- Risk: User navigates away (closes the surface) during the 5-second window. The `pendingCompletion` state is destroyed; queries remain stale with the optimistic "completed" cache until next observer mount or PullToRefresh.
  Mitigation: Acceptable — within 5 seconds the backend finalises the completion and any re-mount will refetch fresh data. No additional handling needed.

- Risk: Race condition: user taps undo just as the window expires. The cancel API returns `ConflictError`.
  Mitigation: `onError` in `useCancelPendingStepCompletion` calls `invalidateAllCompletionRelatedQueries` and shows a toast. Queries sync to the server-confirmed `completed` state.

- Risk: `z.union` tries `PendingCompletionDataSchema` first. If the backend ever returns a `pending_completion_id` field on an immediate response for some reason, it would be mis-parsed.
  Mitigation: The two shapes are structurally disjoint. `pending_completion_id` is never in an immediate response per the backend contract. The union order is safe.

## Validation plan

- `npm run typecheck`: zero TypeScript errors. Focus areas: `TransitionStepStateOutput` discriminated union narrowing in `onSuccess`; `TaskStepDetailController` type completeness; `PendingStepCompletion` imported correctly where used.
- Manual flow — complete path: tap "Complete task" → undo button appears with countdown → wait 5 seconds → button disappears, section list shows `completed` confirmed.
- Manual flow — undo path: tap "Complete task" → tap undo within window → section list reverts to `working` state.
- Manual flow — undo after expiry: tap "Complete task" → wait >5 seconds → tap undo button (disabled by then, so not possible) — `secondsLeft <= 0` disables the button. This case is not reachable via UI.
- Manual flow — API error: simulate network failure on POST → optimistic state rolls back (existing behavior unchanged).
- `npx playwright test --grep "deferred-completion" --project=mobile`: undo flow, expiry flow.

## Review log

- (empty)

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
