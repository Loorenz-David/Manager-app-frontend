# PLAN_step_dependency_warning_sheet_20260602

## Metadata

- Plan ID: `PLAN_step_dependency_warning_sheet_20260602`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-06-02T00:00:00Z`
- Last updated at (UTC): `2026-06-02T15:01:02Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_step_dependency_working_sections_contract_20260602`
- Intention plan: N/A (driven by backend handoff)

---

## Goal and intent

- **Goal:** When a worker attempts to start (`pending → working`) a task step whose dependencies are not all completed, intercept the transition and open a bottom-sheet warning. The sheet shows the incomplete dependency working sections and lets the worker dismiss or proceed anyway.
- **Business/user intent:** Workers should be aware of unfinished prerequisite working sections before beginning a step, but should not be hard-blocked — they can always override the warning.
- **Non-goals:**
  - No changes to the API call or mutation logic itself.
  - No changes to the `readiness_status` field already on `TaskStep`.
  - No changes to the `LastActiveStepCard` or its controller (it only handles resume transitions from already-started steps, never `pending → working`).
  - No manager-app changes.

---

## Scope

- **In scope:**
  - Extending `TaskStepSchema` with the new `dependency_working_sections` array from the backend handoff.
  - New surface ID, surface props type, and page component for the warning sheet.
  - Guard logic injected into `handleTransition` in both `useWorkingSectionStepsController` and `useTaskStepDetailController`.
  - Registering the new surface in `surfaces.ts`.
- **Out of scope:**
  - Showing the dependency list anywhere other than this warning sheet.
  - Any changes to `useLastActiveStepCardController` (resumes are not first starts).
  - Any changes to the `TaskStepActionButton` or `TaskStepCircularActionButton` components themselves — they only call `onTransition`, which is handled at the controller layer.
- **Assumptions:**
  - `dependency_working_sections` is always present on the response (never missing/undefined) — Zod schema uses `z.array(...)` without `.optional()`.
  - A step with `completed_dependencies === total_dependencies` (all deps done) will still return a `dependency_working_sections` array containing only terminal-state entries. The filter on the frontend correctly produces an empty `incompleteDeps` list, so no sheet opens.
  - `failed` and `cancelled` prerequisite states are treated as terminal and do NOT trigger a blocking warning (consistent with `STEP_TERMINAL_STATES`).
  - `skipped` prerequisite states are also terminal and do NOT trigger a warning.

---

## Clarifications required

_None — all questions answered by the codebase and handoff document._

---

## Acceptance criteria

1. A task step with `readiness_status !== "ready"` and at least one non-terminal `prerequisite_step_state` in `dependency_working_sections` opens the warning sheet when the worker taps "Start" from `WorkingSectionStepsView`, `TaskDetailSlidePage`.
2. The warning sheet displays each incomplete dependency as a box: working section image (or placeholder), name, and state label.
3. "Start anyway" in the sheet triggers `transitionStepState({ new_state: "working" })` and closes the sheet.
4. "Close" dismisses the sheet without any transition.
5. A step already in `working`, `paused`, or `ended_shift` state does **not** trigger the warning when the worker resumes (transitions `paused → working` or `ended_shift → working`).
6. A step with all dependencies completed (all entries have terminal `prerequisite_step_state`) does **not** open the warning sheet.
7. `npm run typecheck` passes with zero errors after all changes.

---

## Contracts and skills

### Contracts loaded

- `../architecture/08_hooks.md`: action hook pattern (guard inside `handleTransition`; no new action hook needed)
- `../architecture/28_surfaces.md` + `../architecture/28_surfaces_local.md`: sheet surface type, `lazyWithPreload`, surface registration
- `../architecture/07_components.md`: presentational component for the dependency box
- `../architecture/24_dto.md`: `IncompleteDependencyViewModel` type and `toIncompleteDependencyViewModels` helper
- `../architecture/02_types.md`: Zod schema extension pattern

### Local extensions loaded

- `../architecture/28_surfaces_local.md`: confirms `sheet` is a valid surface type; `drawer` is excluded

### File read intent — pattern vs. relational

Permitted reads performed:
- `src/features/task_steps/types.ts` — established actual field names, `StepStateSchema`, `STEP_TERMINAL_STATES`, existing `TaskStepSchema` shape
- `src/features/task_steps/surface-ids.ts` — verified surface ID naming convention and props shape pattern
- `src/features/task_steps/surfaces.ts` — verified `lazyWithPreload` and `SurfaceRegistrations` usage
- `src/features/task_steps/controllers/use-working-section-steps.controller.ts` — understood how `handleTransition` calls `transitionStepState` and how `query.data?.items` is accessible
- `src/features/task_steps/controllers/use-task-step-detail.controller.ts` — understood how `step` (raw `TaskStep`) is in scope, and how `handleTransition` closes over it
- `src/features/task_steps/controllers/use-last-active-step-card.controller.ts` — confirmed it only handles resume transitions; no changes needed
- `src/pages/task_steps/TaskDetailSlidePage.tsx` — understood `handleTransition` wire-up
- `src/features/task_steps/components/WorkingSectionStepsView.tsx` — understood `handleTransition` wire-up

### Skill selection

- Primary skill: `skills/feature_crud/SKILL.md` is not applicable — this is a targeted interception and new sheet, not a full CRUD feature.
- No skill applies directly; the plan follows the architecture contracts.

---

## Domain schemas consulted

- `src/features/task_steps/types.ts`:
  - Entity: `TaskStep`, `StepState`
  - Existing fields: `client_id: TaskStepId`, `task_id: TaskId`, `state: StepState`, `readiness_status: "ready" | "blocked" | "pending"`, `total_dependencies: number`, `completed_dependencies: number`, `working_section_id: WorkingSectionId`
  - New field to add: `dependency_working_sections: StepDependencyEntry[]`
  - `STEP_TERMINAL_STATES = Set<StepState>(["completed", "skipped", "failed", "cancelled"])`
  - `STEP_QUICK_TRANSITION: { pending → working, working → paused, paused → working, ended_shift → working }`

---

## Implementation plan

### Step 1 — `types.ts`: Add new Zod schemas and view model type

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

**Add after `WorkingSectionIdSchema` (line 11):**

```typescript
export const DependencyWorkingSectionRefSchema = z.object({
  client_id: WorkingSectionIdSchema,
  name: z.string(),
  image: z.string().nullable(),
  order_list: z.number(),
});
export type DependencyWorkingSectionRef = z.infer<typeof DependencyWorkingSectionRefSchema>;

export const StepDependencyEntrySchema = z.object({
  working_section: DependencyWorkingSectionRefSchema,
  prerequisite_step_state: StepStateSchema,
});
export type StepDependencyEntry = z.infer<typeof StepDependencyEntrySchema>;
```

**Extend `TaskStepSchema` — add one new field inside `.object({...})`:**

Add after `cases_summary: CasesSummarySchema.nullable().optional()` (currently the last field):

```typescript
dependency_working_sections: z.array(StepDependencyEntrySchema),
```

**Add new view model type and helper after `toTaskStepCardViewModel`:**

```typescript
export type IncompleteDependencyViewModel = {
  workingSectionClientId: WorkingSectionId;
  name: string;
  imageUrl: string | null;
  prerequisiteStepState: StepState;
};

export function toIncompleteDependencyViewModels(
  entries: StepDependencyEntry[],
): IncompleteDependencyViewModel[] {
  return entries
    .filter((entry) => !STEP_TERMINAL_STATES.has(entry.prerequisite_step_state))
    .map((entry) => ({
      workingSectionClientId: entry.working_section.client_id,
      name: entry.working_section.name,
      imageUrl: entry.working_section.image,
      prerequisiteStepState: entry.prerequisite_step_state,
    }));
}
```

---

### Step 2 — `surface-ids.ts`: Add new surface ID and props type

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`

**Add after existing exports:**

```typescript
export const STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID =
  "task-step-dependency-warning-sheet";

export type StepDependencyWarningSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  incompleteDependencies: import("./types").IncompleteDependencyViewModel[];
};
```

---

### Step 3 — `surfaces.ts`: Register new surface

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`

**Add import of new surface ID at top (alongside existing imports from `./surface-ids`):**

```typescript
import {
  // ...existing imports...
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
} from "./surface-ids";
```

**Add lazy loader function:**

```typescript
function loadStepDependencyWarningSheetPage() {
  return import("@/pages/task_steps/StepDependencyWarningSheetPage").then(
    (module) => ({
      default: module.StepDependencyWarningSheetPage,
    }),
  );
}
```

**Add lazy component and preload export:**

```typescript
const stepDependencyWarningSheet = lazyWithPreload(
  loadStepDependencyWarningSheetPage,
);
export const preloadStepDependencyWarningSheetSurface =
  stepDependencyWarningSheet.preload;
```

**Add to `taskStepSurfaces`:**

```typescript
[STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: stepDependencyWarningSheet.Component,
},
```

---

### Step 4 — New page: `StepDependencyWarningSheetPage.tsx`

File: `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/StepDependencyWarningSheetPage.tsx`

This page is a `sheet` surface. It:
1. Reads props via `useSurfaceProps<StepDependencyWarningSheetSurfaceProps>()`.
2. Instantiates `useTransitionStepState()` for the "Start anyway" action.
3. Calls `header?.requestClose()` after firing the transition.
4. Renders: warning text → scrollable row of dependency boxes → two-button footer.

**Full implementation:**

```tsx
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { humanizeStepState, STEP_STATE_VARIANT } from "@beyo/tasks";
import { ImagePlaceholder, StatePill } from "@beyo/ui";
import { useTransitionStepState } from "@/features/task_steps/actions/use-transition-step-state";
import type {
  StepDependencyWarningSheetSurfaceProps,
} from "@/features/task_steps/surface-ids";

export function StepDependencyWarningSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { stepId, taskId, workingSectionId, incompleteDependencies } =
    useSurfaceProps<StepDependencyWarningSheetSurfaceProps>();

  const resolvedStepId = stepId!;
  const resolvedTaskId = taskId!;
  const resolvedWorkingSectionId = workingSectionId!;
  const deps = incompleteDependencies ?? [];

  const { transitionStepState, isPending } = useTransitionStepState();

  useEffect(() => {
    header?.setTitle("Dependencies pending");
    header?.setActions(null);
  }, [header]);

  function handleStartAnyway(): void {
    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: "working",
      working_section_id: resolvedWorkingSectionId,
    });
    header?.requestClose();
  }

  return (
    <div
      className="flex flex-col gap-5 bg-background px-5 pb-[calc(var(--safe-bottom,0)+1.25rem)] pt-4"
      data-testid="step-dependency-warning-sheet"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-warning"
        />
        <p className="text-sm text-foreground">
          Some required sections haven't finished yet. You can still start, but
          be aware that these dependencies are not completed.
        </p>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-1"
        data-testid="step-dependency-warning-list"
      >
        {deps.map((dep, index) => (
          <div
            key={`${dep.workingSectionClientId}-${index}`}
            className="flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-xl border border-light-border bg-card px-2 py-3"
            data-testid={`step-dependency-box-${dep.workingSectionClientId}`}
          >
            <div className="relative size-10 overflow-hidden rounded-full bg-muted">
              {dep.imageUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  draggable={false}
                  loading="lazy"
                  src={dep.imageUrl}
                />
              ) : (
                <ImagePlaceholder iconClassName="size-4 text-muted-foreground/60" />
              )}
            </div>
            <span className="w-full truncate text-center text-xs font-medium text-foreground">
              {dep.name}
            </span>
            <StatePill
              label={humanizeStepState(dep.prerequisiteStepState) || dep.prerequisiteStepState}
              variant={STEP_STATE_VARIANT[dep.prerequisiteStepState]}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          className="flex-1 rounded-xl border border-light-border bg-card py-3 text-sm font-semibold text-foreground"
          data-testid="step-dependency-warning-close"
          type="button"
          onClick={() => header?.requestClose()}
        >
          Close
        </button>
        <button
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="step-dependency-warning-start-anyway"
          disabled={isPending}
          type="button"
          onClick={handleStartAnyway}
        >
          Start anyway
        </button>
      </div>
    </div>
  );
}
```

**Notes on this component:**
- Uses `humanizeStepState` (from `@beyo/tasks`) for human-readable state labels.
- Uses `STEP_STATE_VARIANT` (from `@beyo/tasks`) to drive `StatePill` variant — same pattern used in `TaskStepDetailHeader`.
- Uses `ImagePlaceholder` (from `@beyo/ui`) for null images.
- The `key` on each dependency box uses both `workingSectionClientId` and `index` because the handoff explicitly states two entries from the same working section are possible.
- `AlertTriangle` icon should use a `text-warning` color token. If that token doesn't exist in the project, use `text-yellow-500` as fallback (Copilot: check the CSS variables in `packages/styles/src/index.css` before deciding).

---

### Step 5 — `use-working-section-steps.controller.ts`: Add dependency guard

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-working-section-steps.controller.ts`

**Add new imports at top:**

```typescript
import {
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
  type StepDependencyWarningSheetSurfaceProps,
} from "../surface-ids";
import {
  toIncompleteDependencyViewModels,
  // ...existing imports from types...
} from "../types";
```

**Replace the entire `handleTransition` useCallback:**

```typescript
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

    if (nextState === "working") {
      const rawStep = query.data?.items.find((s) => s.client_id === stepId);
      if (rawStep && rawStep.state === "pending") {
        const incompleteDependencies = toIncompleteDependencyViewModels(
          rawStep.dependency_working_sections,
        );
        if (incompleteDependencies.length > 0) {
          openSurface(STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID, {
            stepId,
            taskId,
            workingSectionId: sectionId,
            incompleteDependencies,
          } as StepDependencyWarningSheetSurfaceProps);
          return;
        }
      }
    }

    transitionStepState({
      task_id: taskId,
      step_id: stepId,
      new_state: nextState,
      working_section_id: sectionId,
    });
  },
  [transitionStepState, sectionId, openSurface, query.data?.items],
);
```

**Important:** `query.data?.items` is added to the `useCallback` dependency array. This is intentional — the guard needs the latest step state to check `rawStep.state === "pending"`.

---

### Step 6 — `use-task-step-detail.controller.ts`: Add dependency guard

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

**Add new imports:**

```typescript
import {
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
  type StepDependencyWarningSheetSurfaceProps,
  // ...existing imports from surface-ids...
} from "../surface-ids";
import {
  toIncompleteDependencyViewModels,
  STEP_TERMINAL_STATES,
  // ...existing imports from types...
} from "../types";
```

**Replace the `handleTransition` useCallback:**

```typescript
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

    if (nextState === "working" && step?.state === "pending") {
      const incompleteDependencies = toIncompleteDependencyViewModels(
        step.dependency_working_sections,
      );
      if (incompleteDependencies.length > 0) {
        openSurface(STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID, {
          stepId: targetStepId,
          taskId: targetTaskId,
          workingSectionId: resolvedWorkingSectionId,
          incompleteDependencies,
        } as StepDependencyWarningSheetSurfaceProps);
        return;
      }
    }

    transitionStepState({
      task_id: targetTaskId,
      step_id: targetStepId,
      new_state: nextState,
      working_section_id: resolvedWorkingSectionId,
    });
  },
  [transitionStepState, resolvedWorkingSectionId, openSurface, step],
);
```

**Important:** `step` is added to the `useCallback` dependency array (it was not there before). This is required so the guard reads the current step state correctly.

---

## Risks and mitigations

- **Risk:** `step` added to `handleTransition` deps in `useTaskStepDetailController` could cause instability if `step` reference changes frequently on refetch.
  **Mitigation:** The step reference only changes when query data changes (the whole `step` object is replaced). The `handleTransition` function recreation cost is negligible and the correctness benefit outweighs it. If profiling shows an issue, the guard can be extracted to a stable `useRef` callback.

- **Risk:** `query.data?.items` in the `useCallback` dep array in `useWorkingSectionStepsController` causes the handler to recreate on every refetch.
  **Mitigation:** Same as above — correctness first. The image URL stability ref pattern already exists in the controller; this dep follows the same principle.

- **Risk:** `STEP_TERMINAL_STATES` used in `toIncompleteDependencyViewModels` may not align with what the backend considers "completed" for `completed_dependencies` count.
  **Mitigation:** The filter only drives the _warning display_. The backend's `completed_dependencies` counter remains the authoritative count. If backend semantics differ, only the warning list rows are affected (not the transition itself).

- **Risk:** `text-warning` CSS token may not exist in the design system.
  **Mitigation:** Copilot must check `packages/styles/src/index.css` for the token before using it. Fallback is `text-yellow-500`.

- **Risk:** `humanizeStepState` or `STEP_STATE_VARIANT` may not cover all values returned in `prerequisite_step_state`.
  **Mitigation:** Both utilities already handle the full `StepState` enum (they are used in `TaskStepDetailHeader` with the same enum). No risk.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test — step with incomplete deps:
  1. Navigate to a working section with a step that has non-terminal dependency entries.
  2. Tap "Start" on the step card — warning sheet should open.
  3. Verify all incomplete deps appear as boxes with image/placeholder, name, and state pill.
  4. Tap "Close" — sheet dismisses, step remains `pending`.
  5. Tap "Start" again, then "Start anyway" — step transitions to `working`, sheet closes.
  6. Observe `LastActiveStepCard` appears.
  7. Pause and resume the step — NO warning sheet on resume.
- Manual smoke test — step with all deps completed:
  1. Tap "Start" on a step with `dependency_working_sections` all terminal — step transitions directly, no sheet.
- Manual smoke test — step with zero deps:
  1. Tap "Start" on a step with `dependency_working_sections: []` — step transitions directly, no sheet.

---

## Review log

_(empty — awaiting first review)_

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
