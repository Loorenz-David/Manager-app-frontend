# PLAN_complete_task_step_confirmation_20260622

## Metadata

- Plan ID: `PLAN_complete_task_step_confirmation_20260622`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T13:14:02Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Intercept the "Complete task" action with a confirmation slide that displays accumulated working/pause time and requires the worker to declare whether the recorded time is accurate or inaccurate before the state transition fires.
- Business/user intent: Workers sometimes work with an item for an undeclared period before the app timer is running. This extra confirmation step surfaces that discrepancy and allows it to be flagged at close time so managers can identify unreliable time records.
- Non-goals: Backend changes, changes to the timer/state logic for any state other than `completed`, changes to the Pause or Start flows.

## Scope

- In scope:
  - New `slide` surface `CompleteTaskStepConfirmationSlidePage` rendered on top of `TaskDetailSlidePage`
  - Live working-time stat box (bluish) and static pause-time stat box (light yellow) derived from existing step fields + elapsed transition time
  - Single-select accurate / inaccurate options; save button disabled until one is chosen
  - Passing `mark_closing_record_inaccurate: true` in the transition payload when inaccurate is chosen
  - Downgrade the `ConfirmActionButton` in `TaskDetailSlidePage` to a plain green button (no double-tap)
- Out of scope:
  - Any backend schema changes
  - Changes to the paused / working / ended-shift transitions
  - Changes to the pending-completion undo flow
- Assumptions:
  - The backend already accepts `mark_closing_record_inaccurate` as an optional boolean body field on the `POST /api/v1/tasks/:task_id/steps/:step_id/transition` endpoint
  - The step is always in `working` state when "Complete task" is tapped (guarded by `canShowCompletionAction = controller.vm.state === "working"`)

## Clarifications required

_None blocking — all decisions derived from codebase and user spec._

## Acceptance criteria

1. Tapping "Complete task" on `TaskDetailSlidePage` opens a new slide (not a double-tap confirm) showing accumulated working time and pause time.
2. The working-time box shows a live ticking value = `totalWorkingSeconds` + elapsed since `lastStateRecord.entered_at`.
3. The pause-time box shows the static `totalPauseSeconds` formatted as HH:MM:SS.
4. The "Complete task" save button in the confirmation slide is disabled until the worker selects accurate or inaccurate.
5. Selecting inaccurate and saving fires the transition with `mark_closing_record_inaccurate: true` in the body.
6. Selecting accurate and saving fires the transition without that key.
7. `npm run typecheck` reports zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: app layer overview
- `architecture/02_types.md`: Zod schema and ViewModel patterns
- `architecture/04_api_client.md`: `apiClient.post` calling convention
- `architecture/05_server_state.md`: TanStack Query setup
- `architecture/06_client_state.md`: local UI state rules
- `architecture/08_hooks.md`: action hook and optimistic-update shape
- `architecture/13_errors.md`: error handling patterns
- `architecture/15_feature_structure.md`: file placement rules
- `architecture/28_surfaces.md`: slide / sheet surface registration
- `architecture/30_dynamic_loading.md`: `lazyWithPreload` pattern

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`; `drawer` excluded)
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path, `usePreloadSurface` hook

### File read intent — pattern vs. relational

Permitted reads already taken (relational — understanding what exists):
- `src/features/task_steps/types.ts` — exact field names (`total_working_seconds`, `total_pause_seconds`, `TransitionStepStateInput`, `TaskStepCardViewModel`)
- `src/features/task_steps/surface-ids.ts` — existing surface IDs and props types
- `src/features/task_steps/surfaces.ts` — existing `lazyWithPreload` registration pattern
- `src/features/task_steps/actions/use-transition-step-state.ts` — how `transitionStepState` is called, what its input type consumes
- `src/features/task_steps/controllers/use-task-step-detail.controller.ts` — `handleComplete` shape, controller interface
- `src/pages/task_steps/TaskDetailSlidePage.tsx` — current `ConfirmActionButton` usage and button styling
- `src/features/task_steps/components/TaskStepActionButton.tsx` — state color tokens
- `src/features/task_steps/components/detail/TaskStepCircularActionButton.tsx` — state color tokens
- `src/features/task_steps/index.ts` — public API exports

### Skill selection

- Primary skill: `skills/new-surface-slide/SKILL.md` (surface registration + page scaffold)
- Trigger terms: `slide`, `surface`, `lazyWithPreload`
- Excluded alternatives: sheet surface — user spec explicitly says slide

## Domain schemas consulted

- `src/features/task_steps/types.ts`:
  - Entity: `TaskStep`, `TaskStepCardViewModel`, `TransitionStepStateInput`
  - Fields used: `total_working_seconds`, `total_pause_seconds`, `last_state_record.entered_at`, `new_state: "completed"`, `task_id`, `step_id`, `working_section_id`
  - `TaskStepCardViewModel` currently lacks `totalPauseSeconds` — must be added

## Implementation plan

### Step 1 — `src/features/task_steps/types.ts`

Two additions:

**a) Add `totalPauseSeconds` to `TaskStepCardViewModel`:**
```ts
// in TaskStepCardViewModel type
totalPauseSeconds: number;
```
Set it in `toTaskStepCardViewModel`:
```ts
totalPauseSeconds: step.total_pause_seconds,
```

**b) Add optional flag to `TransitionStepStateInput`:**
```ts
export type TransitionStepStateInput = {
  task_id: TaskId;
  step_id: TaskStepId;
  new_state: StepState;
  credited_user_id?: UserId;
  reason?: StepTransitionReason;
  description?: string;
  mark_closing_record_inaccurate?: boolean;   // ← add this line
};
```

---

### Step 2 — `src/features/task_steps/surface-ids.ts`

Add after the existing constants and types:

```ts
export const COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID =
  "task-step-complete-confirmation-slide";

export type CompleteTaskStepConfirmationSlideSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  totalWorkingSeconds: number;
  totalPauseSeconds: number;
  lastStateRecordEnteredAt: string | null;
  onConfirm: (markInaccurate: boolean) => void;
};
```

---

### Step 3 — `src/features/task_steps/surfaces.ts`

**a)** Import the new surface ID at the top:
```ts
import {
  // existing imports …
  COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID,
} from "./surface-ids";
```

**b)** Add loader function:
```ts
function loadCompleteTaskStepConfirmationSlidePage() {
  return import(
    "@/pages/task_steps/CompleteTaskStepConfirmationSlidePage"
  ).then((module) => ({
    default: module.CompleteTaskStepConfirmationSlidePage,
  }));
}
```

**c)** Create lazy instance and export preloader:
```ts
const completeTaskStepConfirmationSlide = lazyWithPreload(
  loadCompleteTaskStepConfirmationSlidePage,
);

export const preloadCompleteTaskStepConfirmationSlideSurface =
  completeTaskStepConfirmationSlide.preload;
```

**d)** Register in `taskStepSurfaces`:
```ts
[COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: completeTaskStepConfirmationSlide.Component,
},
```

---

### Step 4 — `src/features/task_steps/controllers/use-task-step-detail.controller.ts`

**a)** Add to imports from `surface-ids`:
```ts
COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID,
type CompleteTaskStepConfirmationSlideSurfaceProps,
```

**b)** Replace `handleComplete` implementation.

_Current:_
```ts
const handleComplete = useCallback(() => {
  if (!vm || STEP_TERMINAL_STATES.has(vm.state)) return;
  transitionStepState({
    task_id: resolvedTaskId,
    step_id: resolvedStepId,
    new_state: "completed",
    working_section_id: resolvedWorkingSectionId,
  });
}, [vm, resolvedTaskId, resolvedStepId, resolvedWorkingSectionId, transitionStepState]);
```

_New:_
```ts
const handleComplete = useCallback(() => {
  if (!vm || STEP_TERMINAL_STATES.has(vm.state)) return;

  openSurface(COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID, {
    stepId: resolvedStepId,
    taskId: resolvedTaskId,
    workingSectionId: resolvedWorkingSectionId,
    totalWorkingSeconds: vm.totalWorkingSeconds,
    totalPauseSeconds: vm.totalPauseSeconds,
    lastStateRecordEnteredAt: vm.lastStateRecord?.entered_at ?? null,
    onConfirm: (markInaccurate: boolean) => {
      transitionStepState({
        task_id: resolvedTaskId,
        step_id: resolvedStepId,
        new_state: "completed",
        working_section_id: resolvedWorkingSectionId,
        ...(markInaccurate ? { mark_closing_record_inaccurate: true } : {}),
      });
    },
  } satisfies CompleteTaskStepConfirmationSlideSurfaceProps);
}, [
  vm,
  resolvedTaskId,
  resolvedStepId,
  resolvedWorkingSectionId,
  openSurface,
  transitionStepState,
]);
```

No change to the `TaskStepDetailController` interface type — `handleComplete: () => void` is unchanged.

---

### Step 5 — `src/pages/task_steps/TaskDetailSlidePage.tsx`

Remove `ConfirmActionButton` import and usage. Replace with a plain green button:

_Remove import:_
```ts
// remove: ConfirmActionButton from "@beyo/ui"
```

_Replace JSX block inside the `canShowCompletionAction` footer:_
```tsx
<div className="px-4 pb-[calc(var(--safe-bottom,0)+5.25rem)] pt-3">
  <button
    className="w-full rounded-xl py-3.5 text-center font-semibold transition-opacity disabled:opacity-60"
    data-testid="task-step-complete-button"
    disabled={isStepTransitioning}
    style={{
      backgroundColor: "#eaf8ef",
      color: "#1e7a46",
      border: "1px solid #9ed9b5",
    }}
    type="button"
    onClick={controller.handleComplete}
  >
    Complete task
  </button>
</div>
```

---

### Step 6 (new file) — `src/pages/task_steps/CompleteTaskStepConfirmationSlidePage.tsx`

Full page implementation:

```tsx
import { useState } from "react";
import { Check } from "lucide-react";
import { useSurface, useSurfaceProps } from "@beyo/hooks";
import { TickingTimer } from "@beyo/ui";
import { cn } from "@beyo/lib";
import { formatSecondsHHMMSS } from "@/features/task_steps/domain/formatSecondsHHMMSS";
import type { CompleteTaskStepConfirmationSlideSurfaceProps } from "@/features/task_steps/surface-ids";

type TimeAccuracy = "accurate" | "inaccurate";

function StatBox({
  label,
  colorClass,
  children,
}: {
  label: string;
  colorClass: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl p-4", colorClass)}>
      <span className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold">{children}</span>
    </div>
  );
}

export function CompleteTaskStepConfirmationSlidePage(): React.JSX.Element {
  const {
    totalWorkingSeconds = 0,
    totalPauseSeconds = 0,
    lastStateRecordEnteredAt = null,
    onConfirm,
  } = useSurfaceProps<CompleteTaskStepConfirmationSlideSurfaceProps>();

  const { close } = useSurface();
  const [selection, setSelection] = useState<TimeAccuracy | null>(null);

  function handleSave() {
    if (!selection || !onConfirm) return;
    onConfirm(selection === "inaccurate");
    close();
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 className="text-lg font-semibold">Complete task</h2>
        <button
          aria-label="Close"
          className="text-sm text-muted-foreground"
          type="button"
          onClick={close}
        >
          Cancel
        </button>
      </div>

      {/* Stat boxes */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Working time — bluish */}
          <StatBox
            colorClass="bg-blue-50 text-blue-800"
            label="Time worked"
          >
            {lastStateRecordEnteredAt ? (
              <TickingTimer
                className="font-mono text-2xl font-semibold"
                data-testid="confirmation-working-timer"
                offsetSeconds={totalWorkingSeconds}
                startedAtIso={lastStateRecordEnteredAt}
              />
            ) : (
              formatSecondsHHMMSS(totalWorkingSeconds)
            )}
          </StatBox>

          {/* Pause time — light yellow */}
          <StatBox
            colorClass="bg-yellow-50 text-yellow-800"
            label="Total paused"
          >
            <span data-testid="confirmation-pause-time">
              {formatSecondsHHMMSS(totalPauseSeconds)}
            </span>
          </StatBox>
        </div>

        {/* Accuracy selection */}
        <div className="mt-8 flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">
            Is the recorded time accurate?
          </p>

          {(
            [
              {
                value: "accurate" as TimeAccuracy,
                label: "Accurate time",
                description: "The recorded time reflects my actual work time.",
                testId: "accuracy-option-accurate",
              },
              {
                value: "inaccurate" as TimeAccuracy,
                label: "Inaccurate time",
                description: "The timer does not match my actual work time.",
                testId: "accuracy-option-inaccurate",
              },
            ] as const
          ).map(({ value, label, description, testId }) => {
            const isSelected = selection === value;
            return (
              <button
                key={value}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card",
                )}
                data-testid={testId}
                type="button"
                onClick={() => setSelection(value)}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40",
                  )}
                >
                  {isSelected && (
                    <Check aria-hidden="true" className="size-3 text-white stroke-[3]" />
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-3">
        <button
          className="w-full rounded-xl bg-primary py-3.5 text-center font-semibold text-card transition-opacity disabled:opacity-40"
          data-testid="complete-step-confirm-button"
          disabled={selection === null}
          type="button"
          onClick={handleSave}
        >
          Complete task
        </button>
      </div>
    </div>
  );
}
```

---

### Step 7 — `src/features/task_steps/index.ts`

Export the new preloader and surface ID for app-level wiring (if needed by the surface registry):

```ts
// add to existing exports:
export { preloadCompleteTaskStepConfirmationSlideSurface } from "./surfaces";
export { COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID } from "./surface-ids";
```

## Risks and mitigations

- Risk: `onConfirm` callback captured over stale `step` data if the query refetches between tap and confirm.
  Mitigation: `onConfirm` is constructed inside `handleComplete` which closes over `resolvedStepId / resolvedTaskId / resolvedWorkingSectionId` — opaque IDs that do not change; `mark_closing_record_inaccurate` is derived from user selection inside the slide, not from query data.

- Risk: `TickingTimer` keeps ticking even after the slide is dismissed without confirming.
  Mitigation: Timer is mounted only while the slide is open; it unmounts on `close()`. No side effects.

- Risk: `useSurface().close` may not be available inside this page if `useSurface` is scoped to the parent.
  Mitigation: Confirm against `28_surfaces_local.md` — `useSurface` is always available inside a registered surface page.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep task_steps`: existing tests unaffected (no logic changed on non-complete transitions)
- Manual smoke test (mobile):
  1. Open a task step in `working` state
  2. Tap "Complete task" → confirmation slide opens
  3. Stat boxes render with correct values; save button is disabled
  4. Select "Accurate time" → save enables; tap save → transition fires without flag → step moves to completed
  5. Repeat with "Inaccurate time" → verify `mark_closing_record_inaccurate: true` in network payload
  6. Tap "Cancel" on the slide → slide closes, step remains in working state

## Review log

_None yet._

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
