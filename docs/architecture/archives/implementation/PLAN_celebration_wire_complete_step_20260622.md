# PLAN_celebration_wire_complete_step_20260622

## Metadata

- Plan ID: `PLAN_celebration_wire_complete_step_20260622`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T14:13:40Z`
- Related issue/ticket: `-`
- Intention plan: `-`
- Depends on: `PLAN_celebration_overlay_20260622` (must be implemented first — `@beyo/celebration` package must exist)

## Goal and intent

- Goal: Wire the `@beyo/celebration` trigger into the task step completion flow so the overlay fires when a worker completes a step and has marked the time as accurate.
- Business/user intent: Workers who confirm their time was accurate get the full celebration moment (confetti + message + sound). Workers who mark inaccurate time get no animation — the completion still works normally, just no reward signal.
- Non-goals: Changes to the confirmation UI, the time accuracy logic, the transition API, or any other animation variants. This plan only wires the trigger.

## Scope

- In scope:
  - One file changed: `src/features/task_steps/controllers/use-task-step-detail.controller.ts`
  - Add `useCelebration` and `celebrationPresets` imports from `@beyo/celebration`
  - Add `decodeTokenClaims` import from `@beyo/api-client`
  - Call `useCelebration()` once at the top of `useTaskStepDetailController`
  - Update the `onConfirm` callback inside `handleComplete` to call `transitionStepState` with an `onSuccess` per-call callback
  - In that `onSuccess`: trigger celebration only when `!markInaccurate` and `data.kind === "immediate"`
  - Add `triggerCelebration` to the `handleComplete` `useCallback` dependency array

- Out of scope:
  - Changes to `CompleteTaskStepConfirmationSlidePage`
  - Changes to `useTransitionStepState` action hook
  - Changes to `@beyo/celebration` package
  - Sound file — already placed at `public/sounds/celebration.mp3` by the previous plan
  - Any new Playwright specs (existing spec coverage applies)

## Clarifications required

None — all types confirmed:
- `data.kind === "immediate"` is the discriminant for a fully completed step (from `transition-step-state.ts` — `ImmediateTransitionDataSchema` adds `kind: "immediate" as const`)
- `data.kind === "pending_completion"` means the step entered a pending/waiting state, not yet complete
- `markInaccurate: boolean` is passed directly from `CompleteTaskStepConfirmationSlideSurfaceProps.onConfirm`
- `transitionStepState` is `mutation.mutate` from TanStack Query v5 — accepts `(variables, { onSuccess })` as per TQ5's `MutateFunction` signature

## Acceptance criteria

1. When a worker selects "Accurate time" and taps "Complete task", and the backend returns `kind: "immediate"`, the `CelebrationOverlay` fires with confetti and "Great job\n{username}" text.
2. When a worker selects "Inaccurate time" and taps "Complete task", no celebration fires — completion proceeds normally.
3. When the backend returns `kind: "pending_completion"` (regardless of time accuracy), no celebration fires.
4. `decodeTokenClaims()` is called at trigger time (not at hook mount time) so it always reflects the current session.
5. TypeScript strict mode passes with zero errors — `triggerCelebration` is in the `useCallback` dependency array.

## Contracts and skills

### Contracts loaded

- `architecture/31_animations.md`: Calling `triggerCelebration()` from the controller is a state setter call (analogous to `notify.error()`), not animation logic. Animation logic lives inside the `@beyo/celebration` package. This is compliant — the controller does not import framer-motion, canvas-confetti, or any animation primitive.
- `architecture/06_client_state.md`: The celebration store is Zustand client state; the controller calls `trigger()` which is a store action setter — this is the correct access pattern (not reading backend data from Zustand, not storing derived state).
- `architecture/28_surfaces.md` (local): `surface.open()` and `surface.close()` must not be called from action hooks — they belong in controllers. The same principle applies here: `triggerCelebration()` is a UI-layer side effect that belongs in the controller, not in the action hook.

### File read intent

Permitted reads for codex:
- `src/features/task_steps/controllers/use-task-step-detail.controller.ts` — the only file being changed (relational: understand exact insertion points)
- `src/features/task_steps/api/transition-step-state.ts` — to confirm `TransitionStepStateOutput` type and `data.kind` discriminants (relational: what exists)

Prohibited:
- Reading other controllers to understand controller structure → `08_hooks.md` covers this
- Reading `@beyo/celebration` package internals to understand celebration → `index.ts` public API is sufficient

## Implementation plan

### Single file change: `use-task-step-detail.controller.ts`

**1. Add imports** (alongside existing imports at the top of the file):

```ts
import { celebrationPresets, useCelebration } from "@beyo/celebration";
import { decodeTokenClaims } from "@beyo/api-client";
```

**2. Add hook call** inside `useTaskStepDetailController`, alongside the other hook calls (after `const { open: openSurface } = useSurface()`):

```ts
const { trigger: triggerCelebration } = useCelebration();
```

**3. Update `handleComplete`** — replace the existing `onConfirm` body so that `transitionStepState` receives a per-call `onSuccess` callback. The outer `markInaccurate` boolean is captured in the closure:

Current code (lines 329–358):
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
        ...(markInaccurate
          ? { mark_closing_record_inaccurate: true }
          : {}),
      });
    },
  } satisfies CompleteTaskStepConfirmationSlideSurfaceProps);
}, [
  openSurface,
  vm,
  resolvedTaskId,
  resolvedStepId,
  resolvedWorkingSectionId,
  transitionStepState,
]);
```

Replace with:
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
      transitionStepState(
        {
          task_id: resolvedTaskId,
          step_id: resolvedStepId,
          new_state: "completed",
          working_section_id: resolvedWorkingSectionId,
          ...(markInaccurate
            ? { mark_closing_record_inaccurate: true }
            : {}),
        },
        {
          onSuccess: (data) => {
            if (markInaccurate || data.kind !== "immediate") return;
            const claims = decodeTokenClaims();
            triggerCelebration(
              celebrationPresets.TASK_COMPLETE(claims?.username ?? ""),
            );
          },
        },
      );
    },
  } satisfies CompleteTaskStepConfirmationSlideSurfaceProps);
}, [
  openSurface,
  vm,
  resolvedTaskId,
  resolvedStepId,
  resolvedWorkingSectionId,
  transitionStepState,
  triggerCelebration,
]);
```

That is the complete change. No other files are touched.

---

## Risks and mitigations

- Risk: `onSuccess` fires after a network round-trip, which may be outside the browser's user-gesture window on some mobile browsers — sound autoplay could be blocked.
  Mitigation: `useCelebrationSound` already swallows autoplay errors silently. Confetti and text still play. Sound failure is not a regression.

- Risk: If `transitionStepState` is exposed from the action as `mutation.mutate`, TQ5 requires the per-call `onSuccess` to have the correct generic types inferred. If TypeScript infers `data` as `unknown`, add an explicit type annotation: `onSuccess: (data: TransitionStepStateOutput) => { ... }` importing `TransitionStepStateOutput` from `../types`.
  Mitigation: Read the type of `transitionStepState` before writing — if it's already `UseMutateFunction<TransitionStepStateOutput, ...>`, inference works automatically and no annotation is needed.

- Risk: `triggerCelebration` is a stable store reference (Zustand actions don't change between renders), but it must be in the `useCallback` dep array to satisfy `noUnusedLocals` / exhaustive-deps rules.
  Mitigation: Already included in the replacement dep array above.

## Validation plan

- `pnpm typecheck`: zero TypeScript errors
- Manual test — accurate time: open a `working` step → tap "Complete task" → select "Accurate time" → tap "Complete task" in confirmation → overlay fires with confetti and username
- Manual test — inaccurate time: same flow → select "Inaccurate time" → tap "Complete task" → no overlay fires, step completes normally
- Manual test — tap overlay to dismiss early: fires, user taps → immediately dismisses
- Manual test — auto-dismiss: fires, user waits 5 seconds → overlay dismisses on its own

## Review log

- `2026-06-22` `david`: Plan created

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
