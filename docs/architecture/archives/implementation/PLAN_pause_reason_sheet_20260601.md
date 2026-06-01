# PLAN_pause_reason_sheet_20260601

## Metadata

- Plan ID: `PLAN_pause_reason_sheet_20260601`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-06-01T00:00:00Z`
- Last updated at (UTC): `2026-06-01T06:16:51Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Implement a "Pause Reason" bottom-sheet surface that intercepts every "→ paused" transition in the workers app, collects the reason from the worker, and fires the correct state transition with that reason.
- Business/user intent: Workers must declare why they are pausing a task step before the pause is committed. The selection also determines the actual target state (`paused` vs `ended_shift`) and, for "other task priority", captures a free-text description.
- Non-goals: No new query hooks, API functions, or data-layer changes. The existing `useTransitionStepState` action and `transitionStepState` API already accept `reason` and `description` fields. No changes to the backend schema.

## Scope

- In scope:
  - New `sheet` surface `task-step-pause-reason-sheet` (page + surface registration)
  - Two-view animated slide layout inside the sheet (box picker → textarea)
  - Interception of `nextState === "paused"` in all three entry-point controllers
  - Exporting the new surface ID and preload function from the feature's `index.ts`
- Out of scope:
  - Box option icons/images — user will provide them later; slots are present but `image` field left `null` until assets are delivered
  - Playwright e2e spec — to be added once icons and copy are finalised
  - Any changes to manager app

## Clarifications required

- [ ] For `PAUSE_ENDED_SHIFT` should `reason: "pause_ended_shift"` be sent alongside `new_state: "ended_shift"`? The spec says the state becomes `ended_shift` (not `paused`), but the backend may still want the reason for audit. Assume **yes, send reason** unless told otherwise — it is optional on the backend and costs nothing.

## Acceptance criteria

1. Tapping the pause button on `TaskStepActionButton`, `TaskStepCircularActionButton`, or `LastActiveStepCard` opens the bottom sheet instead of firing the transition immediately.
2. Selecting `waiting_for_upholstery`, `pause_lunch_break`, `pause_coffee_break`, or `pause_meeting` fires `transitionStepState({ new_state: "paused", reason: <selected> })` and closes the sheet.
3. Selecting `pause_ended_shift` fires `transitionStepState({ new_state: "ended_shift", reason: "pause_ended_shift" })` and closes the sheet.
4. Selecting `pause_other_task_priority` slides the sheet to a textarea view (direction = 1, index = 1).
5. Tapping "Pause task" on the textarea view fires `transitionStepState({ new_state: "paused", reason: "pause_other_task_priority", description: <text> })` and closes the sheet.
6. The textarea auto-focuses only after the slide-in animation completes.
7. TypeScript reports zero errors (`npm run typecheck`).

## Contracts and skills

### Contracts loaded

- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface type selection (`sheet`), `BottomSheetSurface`, close-animation timing
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` from `@beyo/ui`, `preloadXxx` export convention
- `architecture/08_hooks.md`: action hook usage (`useTransitionStepState`), mutation pattern
- `architecture/15_feature_structure.md`: surface-id constants in `surface-ids.ts`, lazy surface in `surfaces.ts`, page in `pages/<domain>/`
- `architecture/31_animations.md`: `AnimatePresence`, `m.div`, `tabVariants`, `transitions.tab` for internal slide animation

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types — `sheet` confirmed for bottom overlays
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` from `@beyo/ui`, `usePreloadSurface` from `@/hooks/use-preload-surface`

### File read intent — pattern vs. relational

Permitted reads used:
- `src/features/task_steps/types.ts`: established `StepTransitionReason`, `StepState`, `TransitionStepStateInput` (reason + description already present), `STEP_QUICK_TRANSITION`
- `src/features/task_steps/surface-ids.ts`: verified existing surface IDs and prop types
- `src/features/task_steps/surfaces.ts`: verified `lazyWithPreload` pattern in use
- `src/features/task_steps/actions/use-transition-step-state.ts`: verified action already accepts `reason` and `description`
- `src/features/task_steps/controllers/*.ts`: verified where `handleTransition` calls `transitionStepState` in each controller
- `src/features/home/route-entry.tsx`: verified `tabVariants`, `transitions.tab`, `AnimatePresence`, direction-index pattern
- `packages/ui/src/components/primitives/box-picker/*`: verified `BoxPickerOption`, `BoxPickerProps`, `mode="single"`, `columns={2}`

### Skill selection

- Primary skill: `architecture/15_feature_structure.md` (surface feature structure)
- Trigger terms: `sheet`, `surface`, `lazyWithPreload`, `AnimatePresence`

## Domain types established

From `src/features/task_steps/types.ts`:
- `StepTransitionReason` = `"waiting_for_upholstery" | "pause_lunch_break" | "pause_coffee_break" | "pause_ended_shift" | "pause_meeting" | "pause_other_task_priority"`
- `StepState` includes `"paused"` and `"ended_shift"`
- `TransitionStepStateInput.reason?: StepTransitionReason` — already in the type, already sent in the API call body
- `TransitionStepStateInput.description?: string` — same

## Implementation plan

### Step 1 — `surface-ids.ts` (modify)

File: `src/features/task_steps/surface-ids.ts`

Add:
```ts
export const PAUSE_REASON_SHEET_SURFACE_ID = "task-step-pause-reason-sheet";

export type PauseReasonSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
};
```

---

### Step 2 — `surfaces.ts` (modify)

File: `src/features/task_steps/surfaces.ts`

Add a lazy surface for `PauseReasonSheetPage` and register it as `sheet`:

```ts
function loadPauseReasonSheetPage() {
  return import("@/pages/task_steps/PauseReasonSheetPage").then((module) => ({
    default: module.PauseReasonSheetPage,
  }));
}

const pauseReasonSheet = lazyWithPreload(loadPauseReasonSheetPage);

export const preloadPauseReasonSheetSurface = pauseReasonSheet.preload;

// Add to taskStepSurfaces:
[PAUSE_REASON_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: pauseReasonSheet.Component,
},
```

---

### Step 3 — `PauseReasonSheetPage.tsx` (new)

File: `src/pages/task_steps/PauseReasonSheetPage.tsx`

#### 3a — Options constant

```ts
const PAUSE_REASON_OPTIONS: BoxPickerOption<StepTransitionReason>[] = [
  { value: "waiting_for_upholstery", label: "Waiting upholstery", image: null },
  { value: "pause_lunch_break",      label: "Lunch break",         image: null },
  { value: "pause_coffee_break",     label: "Coffee break",        image: null },
  { value: "pause_ended_shift",      label: "Ended shift",         image: null },
  { value: "pause_meeting",          label: "Meeting",             image: null },
  { value: "pause_other_task_priority", label: "Other task",       image: null },
];
```

(`image: null` is a placeholder — icons will be added when assets are delivered)

#### 3b — Component structure

```
PauseReasonSheetPage
  useSurfaceProps<PauseReasonSheetSurfaceProps>()   → stepId, taskId, workingSectionId
  useSurface()                                       → close
  useTransitionStepState()                           → transitionStepState, isPending
  local state: view (0 | 1), direction (1 | -1), otherDescription (string)

  function handleOptionSelect(reason: StepTransitionReason):
    if reason === "pause_other_task_priority":
      setDirection(1); setView(1)
      return
    const newState = reason === "pause_ended_shift" ? "ended_shift" : "paused"
    transitionStepState({ task_id, step_id, new_state: newState, reason, working_section_id })
    close()

  function handlePauseWithDescription():
    transitionStepState({
      task_id, step_id,
      new_state: "paused",
      reason: "pause_other_task_priority",
      description: otherDescription.trim() || undefined,
      working_section_id,
    })
    close()

  JSX:
  <div className="overflow-hidden" ...>
    <AnimatePresence custom={direction} initial={false}>
      {view === 0 ? (
        <m.div key="picker" variants={tabVariants} custom={direction} ...>
          {/* header title */}
          <BoxPicker
            mode="single"
            value={null}
            options={PAUSE_REASON_OPTIONS}
            columns={2}
            onValueChange={handleOptionSelect}
            data-testid="pause-reason-picker"
          />
        </m.div>
      ) : (
        <m.div
          key="other"
          variants={tabVariants}
          custom={direction}
          onAnimationComplete={() => textareaRef.current?.focus()}
          ...
        >
          {/* back button */}
          <textarea
            ref={textareaRef}
            value={otherDescription}
            onChange={(e) => setOtherDescription(e.target.value)}
            placeholder="Describe the reason..."
            data-testid="pause-reason-description-input"
            ...
          />
          <button
            type="button"
            className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-[var(--color-card)] disabled:opacity-50"
            data-testid="pause-reason-submit-button"
            disabled={isPending}
            onClick={handlePauseWithDescription}
          >
            Pause task
          </button>
        </m.div>
      )}
    </AnimatePresence>
  </div>
```

Animation pattern follows `src/features/home/route-entry.tsx` exactly:
- Import `tabVariants`, `transitions` from `@beyo/lib`
- `m.div` props: `key`, `animate="center"`, `exit="exit"`, `initial="enter"`, `custom={direction}`, `variants={tabVariants}`, `transition={transitions.tab}`
- Outer container: `relative overflow-hidden` with explicit height to contain the animation

Sheet layout sizing: The outer container must have a fixed or min height so both sub-pages have the same bounding box. Use `min-h-[320px]` or similar so the sheet doesn't jump when sliding to the textarea view.

Back button on view 1: `setDirection(-1); setView(0)` — slides back to the picker.

#### 3c — `data-testid` inventory

| Element | `data-testid` |
|---|---|
| Sheet root | `pause-reason-sheet` |
| BoxPicker | `pause-reason-picker` |
| Textarea | `pause-reason-description-input` |
| Pause task button | `pause-reason-submit-button` |
| Back button | `pause-reason-back-button` |

---

### Step 4 — `use-working-section-steps.controller.ts` (modify)

In `handleTransition`, intercept before calling `transitionStepState`:

```ts
const handleTransition = useCallback(
  (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => {
    if (nextState === "paused") {
      openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
        stepId,
        taskId,
        workingSectionId: sectionId,
      } as PauseReasonSheetSurfaceProps);
      return;
    }
    transitionStepState({
      task_id: taskId,
      step_id: stepId,
      new_state: nextState,
      working_section_id: sectionId,
    });
  },
  [transitionStepState, sectionId, openSurface],
);
```

Add imports: `PAUSE_REASON_SHEET_SURFACE_ID`, `PauseReasonSheetSurfaceProps` from `../surface-ids`.

---

### Step 5 — `use-last-active-step-card.controller.ts` (modify)

Same interception in `handleTransition`:

```ts
const handleTransition = useCallback(
  (stepId: TaskStepId, taskId: TaskId, nextState: StepState) => {
    if (!step) return;
    if (nextState === "paused") {
      openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
        stepId,
        taskId,
        workingSectionId: step.working_section_id,
      } as PauseReasonSheetSurfaceProps);
      return;
    }
    transitionStepState({
      task_id: taskId,
      step_id: stepId,
      new_state: nextState,
      working_section_id: step.working_section_id,
    });
  },
  [step, transitionStepState, openSurface],
);
```

Add imports: `PAUSE_REASON_SHEET_SURFACE_ID`, `PauseReasonSheetSurfaceProps` from `../surface-ids`.

---

### Step 6 — `use-task-step-detail.controller.ts` (modify)

Same interception in `handleTransition`:

```ts
const handleTransition = useCallback(
  (targetStepId: TaskStepId, targetTaskId: TaskId, nextState: StepState) => {
    if (nextState === "paused") {
      openSurface(PAUSE_REASON_SHEET_SURFACE_ID, {
        stepId: targetStepId,
        taskId: targetTaskId,
        workingSectionId: resolvedWorkingSectionId,
      } as PauseReasonSheetSurfaceProps);
      return;
    }
    transitionStepState({
      task_id: targetTaskId,
      step_id: targetStepId,
      new_state: nextState,
      working_section_id: resolvedWorkingSectionId,
    });
  },
  [transitionStepState, resolvedWorkingSectionId, openSurface],
);
```

Add imports: `PAUSE_REASON_SHEET_SURFACE_ID`, `PauseReasonSheetSurfaceProps` from `../surface-ids`.

---

### Step 7 — `index.ts` (modify)

Add exports:

```ts
export { PAUSE_REASON_SHEET_SURFACE_ID } from "./surface-ids";
export { preloadPauseReasonSheetSurface } from "./surfaces";
```

---

### Build order summary

```
surface-ids.ts (add ID + props type)
  → surfaces.ts (add lazy registration)
  → pages/task_steps/PauseReasonSheetPage.tsx (new)
  → controllers (modify handleTransition ×3)
  → index.ts (new exports)
```

## File change matrix

| File | Action | Change summary |
|---|---|---|
| `src/features/task_steps/surface-ids.ts` | Modify | Add `PAUSE_REASON_SHEET_SURFACE_ID` constant and `PauseReasonSheetSurfaceProps` type |
| `src/features/task_steps/surfaces.ts` | Modify | Add `pauseReasonSheet` lazy surface + `preloadPauseReasonSheetSurface` + register as `sheet` in `taskStepSurfaces` |
| `src/pages/task_steps/PauseReasonSheetPage.tsx` | New | Self-contained sheet page: 2-view animated layout, BoxPicker, textarea, transition logic |
| `src/features/task_steps/controllers/use-working-section-steps.controller.ts` | Modify | Intercept `nextState === "paused"` in `handleTransition` → open sheet |
| `src/features/task_steps/controllers/use-last-active-step-card.controller.ts` | Modify | Same interception |
| `src/features/task_steps/controllers/use-task-step-detail.controller.ts` | Modify | Same interception |
| `src/features/task_steps/index.ts` | Modify | Export new surface ID and preload function |

**No new providers, query hooks, API functions, or DTO files required.**

## Risks and mitigations

- Risk: Sheet height jumps when sliding from picker (compact) to textarea (taller).
  Mitigation: Wrap the AnimatePresence container in `overflow-hidden` with `min-h-[320px]` or use `position: relative` + `absolute inset-0` on sub-page `m.div`s so both views occupy the same bounding box. The sheet surface will stretch to the container height without layout shift.

- Risk: `close()` fires before the optimistic cache update in `onMutate`, causing the UI to flash the old state while the cache catches up.
  Mitigation: `close()` is called synchronously after `transitionStepState()` (which is `mutate`, not `mutateAsync`). The optimistic patch in `onMutate` runs synchronously before the request, so the cache is updated before the sheet closes. No await needed.

- Risk: `direction` state is stale when the back button is tapped.
  Mitigation: Set `direction` and `view` atomically via `useReducer` or set them in two synchronous `setState` calls — React batches them in the same event handler (React 18+), so there is no intermediate render with mismatched direction and view.

- Risk: `tabVariants` exit animation runs on the wrong direction when navigating back.
  Mitigation: Use the same `custom={direction}` pattern as `HomeRouteEntry` — `tabVariants` reads `custom` to determine exit translation direction.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test (mobile viewport):
  1. Open any task step card in "working" state → tap "Pause Task" → verify sheet opens with 6 options in 2-column grid
  2. Tap "Lunch break" → verify sheet closes, step state becomes `paused`
  3. Re-open pause sheet → tap "Ended shift" → verify sheet closes, step state becomes `ended_shift`
  4. Re-open pause sheet (step must be back in `working` first) → tap "Other task" → verify sheet slides to textarea view
  5. Type description → tap "Pause task" → verify sheet closes, step state becomes `paused`
  6. Verify same flow from `LastActiveStepCard` pause button
  7. Verify same flow from `TaskDetailSlidePage` circular pause button
- `npm run test -- --grep pause-reason`: (no unit tests authored yet — add once icons are finalised)

## Review log

- `2026-06-01` copilot: plan authored
- `2026-06-01` github-copilot: implemented, typechecked, summarized, and archived

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `github-copilot`
