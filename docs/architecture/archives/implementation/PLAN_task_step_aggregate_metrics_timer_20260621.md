# PLAN_task_step_aggregate_metrics_timer_20260621

## Metadata

- Plan ID: `PLAN_task_step_aggregate_metrics_timer_20260621`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-21T00:00:00Z`
- Last updated at (UTC): `2026-06-21T15:31:11Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_task_step_aggregate_metrics_20260621`
- Intention plan: `—` (driven directly by backend handoff)

## Goal and intent

- Goal: Consume the 9 new aggregate metric fields returned by both step endpoints; replace the current timer strategy (elapsed since `last_state_record.entered_at` only) with accumulated working time (`total_working_seconds` + current-interval elapsed when live, frozen `total_working_seconds` when paused/ended_shift).
- Business/user intent: Workers can see the true total time a step has taken across all working intervals — not just the current one — both while active and while paused.
- Non-goals: Rendering `total_pause_seconds`, `total_cost_minor`, or any other aggregate metric beyond the timer. The analytics worker backfill is a backend concern; the frontend handles the zero-state display only.

## Scope

- In scope:
  - Add 9 new fields to `TaskStepSchema` (Zod).
  - Expose `totalWorkingSeconds: number` in `TaskStepCardViewModel`.
  - Extend `TickingTimer` with an `offsetSeconds?: number` prop so the displayed time = `formatElapsed(offsetSeconds * 1000 + currentElapsed)`.
  - Working state — `TickingTimer` with `offsetSeconds={totalWorkingSeconds}` and `startedAtIso={lastStateRecord.entered_at}`.
  - Paused / ended_shift state — frozen `HH:MM:SS` span (`total_working_seconds`); show `—` when value is `0` (analytics worker not yet live for this step).
  - Both timer surfaces: `LastActiveStepCard` and `TaskStepCircularActionButton` (detail page).
- Out of scope:
  - `TaskStepCard` (list card) — has no timer; no change.
  - `total_pause_seconds`, `total_ended_shift_seconds`, issue/cost fields — parsed into schema but not rendered.
  - Analytics worker backfill logic.
- Assumptions:
  - Both endpoints always return all 9 new keys on every step object (confirmed by handoff: additive, no breaking changes).
  - `total_working_seconds` is `0` (not null) until the analytics worker runs for that step.
  - `TickingTimer` is used in exactly two places for the step-timer feature: `LastActiveStepCard` and `TaskStepCircularActionButton`.

## Clarifications required

_None — handoff is complete and implementation surface is clear._

## Acceptance criteria

1. When a step is in `working` state, the displayed timer ticks and equals `total_working_seconds + elapsed since lastStateRecord.entered_at` (HH:MM:SS).
2. When a step is in `paused` or `ended_shift` state, the displayed timer is frozen at the formatted `total_working_seconds` value.
3. When `total_working_seconds === 0` and the step is paused/ended_shift, the frozen display shows `—` instead of `00:00:00`.
4. `npm run typecheck` reports zero new TypeScript errors.
5. No regression on existing step card behaviour (article label, action buttons, state pills, dependency warnings).

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: Zod schema extension pattern for new API fields.
- `architecture/24_dto.md`: ViewModel extension — add `totalWorkingSeconds` to `TaskStepCardViewModel`, map in `toTaskStepCardViewModel()`.
- `architecture/08_hooks.md`: Controller shape — no new controller logic needed; `vm` already flows to components.

### Local extensions loaded

- `—`

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading another DTO file to understand view model transformer shape → `24_dto.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`

Permitted (relational reads — understanding what exists):
- Reading `types.ts` to confirm exact field names already in `TaskStepSchema` ✓ (already done)
- Reading `TickingTimer.tsx` to confirm current props and `formatElapsed` internals ✓ (already done)
- Reading `TaskStepCircularActionButton.tsx` and `LastActiveStepCard.tsx` to confirm prop signatures and render paths ✓ (already done)
- Reading `TaskDetailSlidePage.tsx` to confirm how `TaskStepCircularActionButton` is called ✓ (already done)

### Skill selection

- Primary skill: `—` (no dedicated skill; surgical file edits only)
- Trigger terms: `—`
- Excluded alternatives: `—`

## Implementation plan

### Step 1 — Extend `TickingTimer` with `offsetSeconds` prop

**File:** `packages/ui/src/components/primitives/ticking-timer/TickingTimer.tsx`

Add `offsetSeconds?: number` to `TickingTimerProps` (default `0`). Update the rendered output from `formatElapsed(elapsed)` to `formatElapsed(offsetSeconds * 1000 + elapsed)`. No change to the subscription logic.

```ts
// Before
export type TickingTimerProps = {
  startedAtIso: string;
  className?: string;
  "data-testid"?: string;
};

// After
export type TickingTimerProps = {
  startedAtIso: string;
  offsetSeconds?: number;   // accumulated seconds to add (default: 0)
  className?: string;
  "data-testid"?: string;
};
```

In the component body:
```tsx
const elapsed = useTickingElapsed(startedAtMs);
// change:
return <span ...>{formatElapsed((offsetSeconds ?? 0) * 1000 + elapsed)}</span>;
```

---

### Step 2 — Add 9 aggregate fields to `TaskStepSchema` + extend `TaskStepCardViewModel`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

**2a — `TaskStepSchema` Zod extension**

Append the 9 new fields inside the `z.object({...})` call for `TaskStepSchema`:

```ts
total_working_seconds: z.number().int(),
total_pause_seconds: z.number().int(),
total_ended_shift_seconds: z.number().int(),
total_working_count: z.number().int(),
total_pause_count: z.number().int(),
total_ended_shift_count: z.number().int(),
total_issues_count: z.number().int(),
total_issues_resolved_count: z.number().int(),
total_cost_minor: z.number().int().nullable(),
```

**2b — `TaskStepCardViewModel` extension**

Add one field to the type (only what the timer needs):

```ts
totalWorkingSeconds: number;
```

**2c — `toTaskStepCardViewModel()` mapper**

Inside the returned object literal, add:

```ts
totalWorkingSeconds: step.total_working_seconds,
```

---

### Step 3 — Update `TaskStepCircularActionButton` (detail page timer)

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepCircularActionButton.tsx`

**3a — Props**

Add `totalWorkingSeconds: number` to `TaskStepCircularActionButtonProps`.

**3b — Timer render logic**

Current code in the `<div className="h-5">` block:

```tsx
{showTimer ? (
  <TickingTimer
    className="font-mono text-sm text-muted-foreground"
    data-testid={`task-step-circular-timer-${stepId}`}
    startedAtIso={lastStateRecord.entered_at}
  />
) : null}
```

Replace with:

```tsx
{isWorking && lastStateRecord ? (
  // Ticking: accumulated seconds + current-interval elapsed
  <TickingTimer
    className="font-mono text-sm text-muted-foreground"
    data-testid={`task-step-circular-timer-${stepId}`}
    startedAtIso={lastStateRecord.entered_at}
    offsetSeconds={totalWorkingSeconds}
  />
) : state === "paused" || state === "ended_shift" ? (
  // Frozen: total working seconds at last fetch
  <span
    className="font-mono text-sm text-muted-foreground"
    data-testid={`task-step-circular-timer-${stepId}`}
  >
    {totalWorkingSeconds > 0 ? formatSecondsHHMMSS(totalWorkingSeconds) : "—"}
  </span>
) : null}
```

**3c — Local formatter**

Add this pure helper at the top of the file (module scope, not exported):

```ts
function formatSecondsHHMMSS(totalSeconds: number): string {
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
```

Remove the now-unused `showTimer` variable.

---

### Step 4 — Update `LastActiveStepCard` (floating card timer)

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/LastActiveStepCard.tsx`

The card reads from context: both `step` (full `TaskStep`) and `vm` (`TaskStepCardViewModel`) are available. Use `vm.totalWorkingSeconds`.

Current timer block (inside the right-side `<div className="flex items-center gap-2 pr-6">`):

```tsx
{isWorking && vm.lastStateRecord ? (
  <TickingTimer
    className="font-mono text-sm text-current opacity-80"
    data-testid="last-active-card-timer"
    startedAtIso={vm.lastStateRecord.entered_at}
  />
) : null}
```

Replace with:

```tsx
{isWorking && vm.lastStateRecord ? (
  // Ticking: accumulated seconds + current-interval elapsed
  <TickingTimer
    className="font-mono text-sm text-current opacity-80"
    data-testid="last-active-card-timer"
    startedAtIso={vm.lastStateRecord.entered_at}
    offsetSeconds={vm.totalWorkingSeconds}
  />
) : (vm.state === "paused" || vm.state === "ended_shift") ? (
  // Frozen: total working seconds at last fetch
  <span
    className="font-mono text-sm text-current opacity-80"
    data-testid="last-active-card-timer"
  >
    {vm.totalWorkingSeconds > 0 ? formatSecondsHHMMSS(vm.totalWorkingSeconds) : "—"}
  </span>
) : null}
```

**Add the same local formatter** at the top of the file (module scope, not exported):

```ts
function formatSecondsHHMMSS(totalSeconds: number): string {
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
```

---

### Step 5 — Pass `totalWorkingSeconds` to `TaskStepCircularActionButton` in `TaskDetailSlidePage`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`

Locate the `<TaskStepCircularActionButton ... />` usage and add the new prop:

```tsx
<TaskStepCircularActionButton
  isTransitioning={isStepTransitioning}
  lastStateRecord={controller.vm.lastStateRecord}
  state={controller.vm.state}
  stepId={controller.vm.stepId}
  taskId={controller.vm.taskId}
  totalWorkingSeconds={controller.vm.totalWorkingSeconds}  // ← add this
  onTransition={controller.handleTransition}
/>
```

---

## Risks and mitigations

- Risk: `total_working_seconds` defaults to `0` for steps pre-dating the analytics worker. When the step is `working`, the timer shows only the current-interval elapsed — this is correct and expected behaviour (the offset is simply 0).
  Mitigation: No special handling needed for the working state; `offsetSeconds={0}` makes `TickingTimer` behave exactly as before.

- Risk: Zod parse error if backend returns a field with an unexpected type (e.g., `total_cost_minor` as a float instead of integer).
  Mitigation: `z.number().int()` will throw at the schema boundary and surface as a query error; the existing error state UI handles this. The backend contract specifies integers.

- Risk: `TaskStep.total_working_seconds` not yet available on the cached query result after the schema change until a refetch occurs.
  Mitigation: Both query hooks (`useUserLastActiveStepQuery`, `useWorkingSectionStepsQuery`) re-parse on every fetch. Stale cache entries that pre-date the new fields will fail Zod validation and produce query errors, prompting a refetch. This is acceptable transient behaviour.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test — working step: timer ticks forward at `total_working_seconds + elapsed` (e.g., step with `total_working_seconds = 3600` should show `01:XX:XX` from the moment of load)
- Manual smoke test — paused step: timer is frozen at formatted `total_working_seconds`; pausing the step stops the ticking and shows the accumulated total
- Manual smoke test — zero-state (step with `total_working_seconds = 0`, paused): frozen display shows `—` not `00:00:00`
- Manual smoke test — `LastActiveStepCard` and `TaskStepCircularActionButton` (detail page) both behave consistently

## Review log

- `2026-06-21` `codex`: Implemented aggregate metric schema/view-model plumbing, switched step timers to accumulated working time, added frozen paused/ended-shift displays, and included `TaskStepActionButton` because it is an active timer surface in the current UI.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex`
