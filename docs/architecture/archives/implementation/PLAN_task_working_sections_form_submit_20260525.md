# PLAN_task_working_sections_form_submit_20260525

## Metadata

- Plan ID: `PLAN_task_working_sections_form_submit_20260525`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-25T00:00:00Z`
- Last updated at (UTC): `2026-05-25T08:41:47Z`
- Related issue/ticket: —
- Precondition plan: `PLAN_task_working_sections_slide_full_20260525` (already executed)

## Goal and intent

- Goal: (1) Fix the four bugs identified in the post-implementation review of the working sections slide. (2) Convert the working sections selector from immediate-mutation mode to a deferred form-submit model: changes are staged locally, a "Save & Close" bar appears at the bottom when there are pending changes, and closing with unsaved changes triggers a close-guard sheet. (3) Save is **optimistic**: the page closes immediately when the user taps "Save & Close"; mutations fire in the background; on any mutation failure the slide is re-opened with the snapshotted pending state so the user can retry.
- Business/user intent: Immediate mutations on each tap felt unstable — a single stray tap would fire a server request. The form-submit model lets the user compose their final selection freely and commit it in one intentional action. Optimistic close removes the "Saving…" wait and keeps the app feeling instant.
- Non-goals: "Live Flow" and "Stats" tabs remain stubs. No changes to worker picker surface or working section query. No changes to `TaskWorkingSectionsField` trigger counts (they update automatically once the mutations fire on save).

## Scope

- In scope:
  - Fix 1: `getLatestStepForSection` — exclude `skipped` steps, preventing deleted steps from appearing as "active" or "completed" after server invalidation.
  - Fix 2: Remove `StatePillVariant` import from `@/components/primitives` in the controller; replace with a local type alias.
  - Fix 3: Remove `?? ''` defensive fallbacks on `activeStep?.client_id`; the buttons are only rendered when `activeStep` is non-null so the fallback is unreachable and would silently send empty string IDs on any regression.
  - Fix 4: Rename / wire `isMutating` → `isSaving` (used once mutations actually fire during save).
  - New primitive — `StagedForm` `footer` slot: add `footer?: ReactNode` prop to render a custom element below the scroll area (same `shrink-0` slot as the navigation bar). `showNavigation={false}` continues to mean no footer.
  - New primitive — `SlidePageSurface` close interceptor: add `setCloseInterceptor` to `SurfaceHeaderValue` so pages can intercept the header back button.
  - New surface — `TaskWorkingSectionsDiscardChangesSheetPage`: a sheet with "Save & Close" and "Discard changes" buttons, following the `ImageEditorDiscardChangesSheetPage` pattern.
  - Controller refactor: replace immediate mutations with pending state (`pendingAdds`, `pendingRemoveIds`, `pendingReassignments`). Expose `effectiveTaskSteps` (server state + pending delta) for `sectionEntries` derivation. Expose `hasUnsavedChanges`, `isSaving`, `handleSaveAndClose`, `handleCloseWithGuard`.
  - Optimistic save + recovery: `handleSaveAndClose` closes the page immediately, runs mutations in the background, and on failure re-opens `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID` with a `recoveredPendingAdds / recoveredPendingRemoveIds / recoveredPendingReassignments` props snapshot so the user can retry from where they left off.
  - `TaskWorkingSectionsSurfaceProps`: add optional recovery fields `recoveredPendingAdds`, `recoveredPendingRemoveIds`, `recoveredPendingReassignments` (typed via exported `RecoveredPendingAdd` / `RecoveredPendingReassignment` types in `surfaces.ts`).
  - `TaskWorkingSectionsProvider`: accept `initialPendingAdds / initialPendingRemoveIds / initialPendingReassignments` props and forward them to the controller so state is seeded from recovery data when the page is re-opened.
  - Page update: wire the `footer` save bar and the close interceptor using `hasUnsavedChanges`. Read recovery props from surface props and pass to provider.
- Out of scope:
  - Error recovery UI when a save mutation fails (the slide re-opens with the snapshot; no additional toast or banner needed).
  - Changes to `TaskWorkingSectionsStepList.tsx` component — it calls `controller.handleSectionPress` and `controller.handleRemoveStep` which are still the same API; only their internal behaviour changes.
  - Changes to `BottomSheetSurface` or `ModalSurface`.
- Assumptions:
  - `PLAN_task_working_sections_slide_full_20260525` has been executed. All three API files, three action hooks, controller, provider, step list component, and the slide page exist.
  - JavaScript async functions continue executing after component unmount — `handleSaveAndClose` closes the page then `await`s mutations in the same async function body; the `catch` block calls `useSurfaceStore.getState().open(...)` (direct store access, not the unmounted hook).
  - Sequential `mutateAsync` is safe: each call fires after the previous one settles and re-invalidates the cache. Partial save (some ops succeed, others fail) results in a re-open with the full original snapshot — the user sees the entire pending selection again and can retry; succeeded ops are already permanent in the cache.

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: `mutateAsync` sequential pattern, `onMutate` / `onError` / `onSettled`
- `architecture/07_components.md`: components consume context only; no logic layer imports
- `architecture/23_providers.md`: provider/context shell — provider updated to forward initial pending state props to controller
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md`: sheet surface registration

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`); discard changes sheet uses `sheet`

### File read intent — pattern vs. relational

Permitted reads completed:

- `src/features/images/pages/ImageEditorPage.tsx` — existing close-guard pattern (open discard sheet on `handleClose`, `handleSaveAndCloseRef` pattern)
- `src/features/images/pages/ImageEditorDiscardChangesSheetPage.tsx` — discard sheet layout
- `src/features/images/surfaces.ts` — discard surface type and registration pattern
- `src/components/surfaces/SlidePageSurface.tsx` — current header context value, back button wiring
- `src/providers/SurfaceProvider.tsx` — `SurfaceHeaderValue` type
- `src/components/primitives/staged-form/StagedForm.tsx` — current footer slot implementation (`showNavigation`)
- `src/components/primitives/staged-form/staged-form.types.ts` — `StagedFormProps`
- `src/components/primitives/staged-form/StagedFormNavigation.tsx` — bottom bar dimensions: `border-t border-border/50 bg-background px-6 pt-3 pb-4`, buttons use `py-3.5`

## Domain schemas consulted

- `src/features/tasks/types.ts`: `task_steps` — `state: z.string()` (open), `closed_at: string | null`, `working_section_id: string | null`. When backend soft-deletes a step, it sets `state: 'skipped'`. The field is a plain string so `'skipped'` is a valid value and must be explicitly excluded in step lookup logic.

## Implementation plan

### Step 1 — `staged-form/staged-form.types.ts`: add `footer` prop

In `StagedFormProps`, add one optional property after `showNavigation`:

```ts
footer?: ReactNode;
```

No other changes.

### Step 2 — `staged-form/StagedForm.tsx`: render `footer` prop

Destructure `footer` from props.

Replace the existing navigation block:

```tsx
{
  showNavigation ? (
    <div className="relative z-10 shrink-0">
      <StagedFormNavigation />
    </div>
  ) : null;
}
```

With:

```tsx
{
  footer ? (
    <div className="relative z-10 shrink-0">{footer}</div>
  ) : showNavigation ? (
    <div className="relative z-10 shrink-0">
      <StagedFormNavigation />
    </div>
  ) : null;
}
```

All existing pages that use `showNavigation={false}` and pass no `footer` are unchanged. All pages that use `showNavigation={true}` (default) are unchanged. `footer` takes precedence over `showNavigation` only when truthy.

### Step 3 — `SurfaceProvider.tsx`: add `setCloseInterceptor` to `SurfaceHeaderValue`

In the `SurfaceHeaderValue` type, add:

```ts
setCloseInterceptor: (fn: (() => void) | null) => void;
```

No implementation here — the implementation is in `SlidePageSurface`. This type change is backward-compatible: no existing page calls `setCloseInterceptor`, so no existing code breaks.

### Step 4 — `SlidePageSurface.tsx`: implement close interceptor

Add `closeInterceptor` state and a `handleClose` wrapper. The back button calls `handleClose` instead of `onClose` directly. The context value includes `setCloseInterceptor`.

Full replacement of `SlidePageSurface.tsx`:

```tsx
import { useState, type ReactNode } from "react";
import { m } from "framer-motion";
import { transitions } from "@/lib/animation";
import { SurfaceHeaderContext } from "@/providers/SurfaceProvider";

type Props = {
  onClose: () => void;
  zIndex: number;
  isTopmost: boolean;
  children: ReactNode;
};

export function SlidePageSurface({
  onClose,
  zIndex,
  isTopmost: _isTopmost,
  children,
}: Props): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [actions, setActions] = useState<ReactNode>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [closeInterceptor, setCloseInterceptorState] = useState<
    (() => void) | null
  >(null);

  const setCloseInterceptor = (fn: (() => void) | null) => {
    setCloseInterceptorState(() => fn);
  };

  const handleClose = () => {
    closeInterceptor ? closeInterceptor() : onClose();
  };

  return (
    <SurfaceHeaderContext.Provider
      value={{
        setTitle,
        setActions,
        requestClose: onClose,
        setHeaderHidden,
        setCloseInterceptor,
      }}
    >
      <m.div
        animate={{ x: 0 }}
        className="fixed inset-0 flex flex-col overflow-hidden bg-background pt-[var(--safe-top)] focus:outline-none transform-gpu [will-change:transform]"
        exit={{ x: "100%" }}
        initial={{ x: "100%" }}
        style={{ zIndex }}
        transition={transitions.slide}
      >
        {!headerHidden ? (
          <header className="flex min-h-14 shrink-0 items-center gap-3 px-4 py-3">
            <button
              aria-label="Go back"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
              onClick={handleClose}
              type="button"
            >
              ‹
            </button>
            <h1
              className="flex-1 truncate text-base font-semibold"
              id="surface-slide-title"
            >
              {title}
            </h1>
            {actions ? (
              <div className="flex items-center gap-1">{actions}</div>
            ) : null}
          </header>
        ) : null}

        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </div>
      </m.div>
    </SurfaceHeaderContext.Provider>
  );
}
```

Key changes:

- `closeInterceptor` state (using functional setter to avoid React treating `fn` as a state-updater function)
- `setCloseInterceptor(fn)` wraps it in `() => fn` pattern for `setState`
- `handleClose` calls interceptor or fallback
- Back button uses `handleClose`
- `requestClose` remains `onClose` (for programmatic closes that bypass the guard)

### Step 5 — `tasks/surfaces.ts`: register discard changes sheet + recovery types

#### 5a — Update `TaskWorkingSectionsSurfaceProps` and export recovery types

Add before the existing `TaskWorkingSectionsSurfaceProps` (or replace it if it currently only has `taskId`):

```ts
export type RecoveredPendingAdd = {
  _pendingId: string;
  working_section_id: string;
  worker_id: string | null;
  working_section_name_snapshot: string | null;
  assigned_worker_display_name_snapshot: string | null;
};

export type RecoveredPendingReassignment = {
  step_id: string;
  worker_id: string;
  display_name: string | null;
};

export type TaskWorkingSectionsSurfaceProps = {
  taskId: string;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
};
```

These types are exported so the controller can use them in `useSurfaceStore.getState().open(...)` after page close.

#### 5b — Register discard changes sheet

Add constant and props type after `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID`:

```ts
export const TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID =
  "task-working-sections-discard-changes";

export type TaskWorkingSectionsDiscardChangesSurfaceProps = {
  onDiscardAndClose: () => void;
  onSaveAndClose: () => void;
};
```

Add loader function:

```ts
function loadTaskWorkingSectionsDiscardChangesSheetPage() {
  return import("@/pages/tasks/TaskWorkingSectionsDiscardChangesSheetPage").then(
    (module) => ({
      default: module.TaskWorkingSectionsDiscardChangesSheetPage,
    }),
  );
}
```

Add to `taskSurfaces` map:

```ts
[TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID]: {
  surface: 'sheet',
  component: lazy(loadTaskWorkingSectionsDiscardChangesSheetPage),
},
```

Use bare `lazy()` (not `lazyWithPreload`) — this sheet is a rare secondary surface, no preload needed.

### Step 5c — `TaskWorkingSectionsProvider.tsx`: forward initial pending state

Update provider props to accept the three optional recovery arrays and forward them to the controller:

```tsx
import type {
  RecoveredPendingAdd,
  RecoveredPendingReassignment,
} from "../surfaces";

type TaskWorkingSectionsProviderProps = {
  taskId: string;
  initialPendingAdds?: RecoveredPendingAdd[];
  initialPendingRemoveIds?: string[];
  initialPendingReassignments?: RecoveredPendingReassignment[];
  children: ReactNode;
};

export function TaskWorkingSectionsProvider({
  taskId,
  initialPendingAdds,
  initialPendingRemoveIds,
  initialPendingReassignments,
  children,
}: TaskWorkingSectionsProviderProps): React.JSX.Element {
  const controller = useTaskWorkingSectionsController(taskId, {
    initialPendingAdds,
    initialPendingRemoveIds,
    initialPendingReassignments,
  });

  return (
    <TaskWorkingSectionsContext.Provider value={controller}>
      {children}
    </TaskWorkingSectionsContext.Provider>
  );
}
```

`useTaskWorkingSectionsContext` is unchanged.

### Step 6 — NEW `TaskWorkingSectionsDiscardChangesSheetPage.tsx`

Create `src/pages/tasks/TaskWorkingSectionsDiscardChangesSheetPage.tsx`:

```tsx
import { useSurfaceProps } from "@/hooks/use-surface-props";
import type { TaskWorkingSectionsDiscardChangesSurfaceProps } from "@/features/tasks/surfaces";

export function TaskWorkingSectionsDiscardChangesSheetPage(): React.JSX.Element {
  const { onDiscardAndClose, onSaveAndClose } =
    useSurfaceProps<TaskWorkingSectionsDiscardChangesSurfaceProps>();

  return (
    <div
      className="flex flex-col px-4 pb-4 pt-2"
      data-testid="working-sections-discard-sheet"
    >
      <p
        className="mb-4 px-2 text-sm text-muted-foreground"
        data-testid="working-sections-discard-sheet-message"
      >
        You have unsaved changes. If you close now, your selection will be lost.
      </p>
      <button
        aria-label="Discard changes and close"
        className="mb-3 flex h-12 w-full items-center justify-center rounded-2xl border border-border text-md text-destructive transition-colors duration-150 hover:bg-destructive/10"
        data-testid="working-sections-discard-sheet-discard"
        type="button"
        onClick={onDiscardAndClose}
      >
        Discard changes
      </button>
      <button
        aria-label="Save changes and close"
        className=" flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-md font-medium text-background transition-opacity duration-150 hover:opacity-90"
        data-testid="working-sections-discard-sheet-save"
        type="button"
        onClick={onSaveAndClose}
      >
        Save & Close
      </button>
    </div>
  );
}
```

### Step 7 — `use-task-working-sections.controller.ts`: bug fixes + pending state

This is the largest change. Replace the entire file.

#### Bug fix 1: local `StepStateVariant` type (replaces `@/components/primitives` import)

Remove:

```ts
import type { StatePillVariant } from "@/components/primitives";
```

Add local type (same string union — TypeScript structural typing means this is assignable to `StatePillVariant`):

```ts
type StepStateVariant = "neutral" | "active" | "warning" | "success" | "danger";
```

In `TaskWorkingSectionEntry`, replace `stateVariant: StatePillVariant` with `stateVariant: StepStateVariant`.
In `TASK_STEP_STATE_VARIANT`, change type from `Record<string, StatePillVariant>` to `Record<string, StepStateVariant>`.

#### Bug fix 2: `getLatestStepForSection` — exclude skipped steps

```ts
function getLatestStepForSection(
  taskSteps: TaskStep[],
  sectionId: string,
): TaskStep | null {
  // Exclude skipped steps: the backend sets state='skipped' when a step is soft-deleted.
  const visibleSteps = [...taskSteps]
    .filter(
      (step) =>
        step.working_section_id === sectionId && step.state !== "skipped",
    )
    .reverse();

  const activeStep = visibleSteps.find((step) => !isCompletedStep(step));
  if (activeStep) return activeStep;

  return visibleSteps[0] ?? null;
}
```

#### Bug fix 3: remove `?? ''` fallbacks

In `handleSectionPress` where `entry.activeStep?.client_id ?? ''` is used, change to `entry.activeStep.client_id` (non-optional). The guard `if (entry.activeStep)` above ensures it is non-null. Same for `handleRemoveStep` call site.

#### Bug fix 4: rename `isMutating` to `isSaving` and wire correctly

`isMutating` is removed. `isSaving` state is added (a `useState<boolean>`, not derived from mutation `isPending` flags). It is exposed in the return value.

#### Controller signature — accept initial pending state

```ts
type InitialPendingState = {
  initialPendingAdds?: RecoveredPendingAdd[];
  initialPendingRemoveIds?: string[];
  initialPendingReassignments?: RecoveredPendingReassignment[];
};

export function useTaskWorkingSectionsController(
  taskId: string,
  initialState?: InitialPendingState,
): TaskWorkingSectionsController {
  // ...
}
```

Import `RecoveredPendingAdd` and `RecoveredPendingReassignment` from `'../surfaces'`.

#### Pending state

`PendingAdd` and `PendingReassignment` local types are structurally identical to `RecoveredPendingAdd` / `RecoveredPendingReassignment` — they exist as local aliases for clarity. State is seeded from `initialState` to support recovery re-opens:

```ts
type PendingAdd = {
  _pendingId: string;
  working_section_id: string;
  worker_id: string | null;
  working_section_name_snapshot: string | null;
  assigned_worker_display_name_snapshot: string | null;
};

type PendingReassignment = {
  step_id: string;
  worker_id: string;
  display_name: string | null;
};

const [pendingAdds, setPendingAdds] = useState<PendingAdd[]>(
  initialState?.initialPendingAdds ?? [],
);
const [pendingRemoveIds, setPendingRemoveIds] = useState<string[]>(
  initialState?.initialPendingRemoveIds ?? [],
);
const [pendingReassignments, setPendingReassignments] = useState<
  PendingReassignment[]
>(initialState?.initialPendingReassignments ?? []);
const [isSaving, setIsSaving] = useState(false);

const hasUnsavedChanges =
  pendingAdds.length > 0 ||
  pendingRemoveIds.length > 0 ||
  pendingReassignments.length > 0;
```

#### `effectiveTaskSteps` — server state + pending delta

```ts
const serverTaskSteps = taskQuery.data?.task_steps ?? [];

const effectiveTaskSteps = useMemo((): TaskStep[] => {
  // 1. Remove pending-deleted steps
  const withRemovals = serverTaskSteps.filter(
    (s) => !pendingRemoveIds.includes(s.client_id),
  );

  // 2. Apply pending reassignments
  const withReassignments = withRemovals.map((s) => {
    const reassignment = pendingReassignments.find(
      (r) => r.step_id === s.client_id,
    );
    return reassignment
      ? {
          ...s,
          assigned_worker_id: reassignment.worker_id,
          assigned_worker_display_name_snapshot: reassignment.display_name,
        }
      : s;
  });

  // 3. Append synthetic steps for pending adds
  const syntheticSteps: TaskStep[] = pendingAdds.map((add) => ({
    client_id: add._pendingId,
    task_id: taskId,
    state: "pending",
    readiness_status: "ready",
    sequence_order: null,
    working_section_id: add.working_section_id,
    assigned_worker_id: add.worker_id,
    total_dependencies: 0,
    completed_dependencies: 0,
    working_section_name_snapshot: add.working_section_name_snapshot,
    assigned_worker_display_name_snapshot:
      add.assigned_worker_display_name_snapshot,
    created_at: new Date().toISOString(),
    closed_at: null,
    latest_state_records: null,
  }));

  return [...withReassignments, ...syntheticSteps];
}, [
  serverTaskSteps,
  pendingAdds,
  pendingRemoveIds,
  pendingReassignments,
  taskId,
]);
```

#### `sectionEntries` — use `effectiveTaskSteps`

Change line 89 from:

```ts
const taskSteps = taskQuery.data?.task_steps ?? [];
```

to:

```ts
// effectiveTaskSteps already declared above
```

And pass `effectiveTaskSteps` into `getLatestStepForSection` calls.

The `sectionEntries` `useMemo` deps must include `effectiveTaskSteps` instead of `taskQuery.data?.task_steps`.

#### `startStep` — deferred (was immediate mutation)

```ts
function startStep(
  section: WorkingSectionOption,
  member?: WorkingSectionMember,
) {
  const _pendingId = `__pending__${Date.now()}__${Math.random().toString(36).slice(2)}`;
  setPendingAdds((prev) => [
    ...prev,
    {
      _pendingId,
      working_section_id: section.client_id,
      worker_id: member?.client_id ?? null,
      working_section_name_snapshot: section.name,
      assigned_worker_display_name_snapshot: member?.username ?? null,
    },
  ]);
}
```

#### `handleRemoveStep` — deferred

```ts
function handleRemoveStep(stepId: string) {
  if (stepId.startsWith("__pending__")) {
    // Remove a pending add that hasn't been saved yet
    setPendingAdds((prev) => prev.filter((a) => a._pendingId !== stepId));
  } else {
    // Stage removal of an existing server step
    setPendingRemoveIds((prev) => [...prev, stepId]);
  }
}
```

#### Reassignment in `handleSectionPress` — deferred for server steps, update-in-place for pending adds

In the `entry.activeStep` (reassignment) branch:

```ts
onSelect: (workerId: string) => {
  const member =
    entry.section.members.find((c) => c.client_id === workerId) ?? null;

  if (entry.activeStep.client_id.startsWith('__pending__')) {
    // Update the pending add in-place
    setPendingAdds((prev) =>
      prev.map((a) =>
        a._pendingId === entry.activeStep.client_id
          ? {
              ...a,
              worker_id: workerId,
              assigned_worker_display_name_snapshot: member?.username ?? null,
            }
          : a,
      ),
    );
  } else {
    // Stage reassignment of an existing server step
    setPendingReassignments((prev) => {
      const filtered = prev.filter((r) => r.step_id !== entry.activeStep.client_id);
      return [
        ...filtered,
        {
          step_id: entry.activeStep.client_id,
          worker_id: workerId,
          display_name: member?.username ?? null,
        },
      ];
    });
  }
},
```

Note: `entry.activeStep` is used directly (non-optional) since the outer `if (entry.activeStep)` guard confirms it.

#### `handleSaveAndClose` — optimistic close, mutations in background

The page closes first. Mutations run after unmount. On any failure the slide is re-opened with the original pending snapshot via `useSurfaceStore.getState().open(...)` (direct store access — the hook is no longer available after unmount).

Uses `handleSaveAndCloseRef` to avoid stale closures when called from the discard sheet's `onSaveAndClose` callback:

```ts
const handleSaveAndCloseRef = useRef<() => Promise<void>>(async () => {});

const handleSaveAndClose = useCallback(async () => {
  if (isSaving) return;
  setIsSaving(true);

  // Snapshot before close — state becomes inaccessible once the page unmounts
  const snapshot = {
    pendingAdds: [...pendingAdds],
    pendingRemoveIds: [...pendingRemoveIds],
    pendingReassignments: [...pendingReassignments],
  };

  // Close optimistically — component unmounts here
  surface.closeTop();

  try {
    for (const stepId of snapshot.pendingRemoveIds) {
      await removeTaskStep.mutateAsync({ step_id: stepId });
    }
    for (const reassignment of snapshot.pendingReassignments) {
      await assignStepWorker.mutateAsync({
        step_id: reassignment.step_id,
        worker_id: reassignment.worker_id,
        assigned_worker_display_name_snapshot: reassignment.display_name,
      });
    }
    for (const add of snapshot.pendingAdds) {
      await addTaskStep.mutateAsync({
        working_section_id: add.working_section_id,
        worker_id: add.worker_id ?? undefined,
        working_section_name_snapshot: add.working_section_name_snapshot,
        assigned_worker_display_name_snapshot:
          add.assigned_worker_display_name_snapshot,
      });
    }
    // Success — cache already up-to-date via each mutation's onSettled invalidation
  } catch {
    // Re-open the slide with the full snapshot so the user can retry
    useSurfaceStore.getState().open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, {
      taskId,
      recoveredPendingAdds: snapshot.pendingAdds,
      recoveredPendingRemoveIds: snapshot.pendingRemoveIds,
      recoveredPendingReassignments: snapshot.pendingReassignments,
    } satisfies TaskWorkingSectionsSurfaceProps);
  }
  // setIsSaving(false) intentionally omitted — the component is already unmounted.
  // setIsSaving(true) only guards against double-tap during the synchronous setup before closeTop().
}, [
  isSaving,
  pendingAdds,
  pendingRemoveIds,
  pendingReassignments,
  removeTaskStep,
  assignStepWorker,
  addTaskStep,
  surface,
  taskId,
]);

// Keep ref current every render to avoid stale closures in discard-sheet callbacks
handleSaveAndCloseRef.current = handleSaveAndClose;
```

Add to imports: `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID` and `TaskWorkingSectionsSurfaceProps` from `'../surfaces'`.

#### `handleCloseWithGuard` — opens discard sheet when there are unsaved changes

```ts
const handleCloseWithGuard = useCallback(() => {
  if (!hasUnsavedChanges) {
    surface.closeTop();
    return;
  }

  surface.open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, {
    onDiscardAndClose: () => {
      useSurfaceStore
        .getState()
        .close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID);
      setPendingAdds([]);
      setPendingRemoveIds([]);
      setPendingReassignments([]);
      surface.closeTop();
    },
    onSaveAndClose: () => {
      useSurfaceStore
        .getState()
        .close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID);
      void handleSaveAndCloseRef.current();
    },
  } satisfies TaskWorkingSectionsDiscardChangesSurfaceProps);
}, [hasUnsavedChanges, surface]);
```

Imports to add: `useRef`, `useCallback`, `useState` (already imported in prior impl), `useSurfaceStore` from `@/providers/SurfaceProvider`, and `TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID`, `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID`, `TaskWorkingSectionsDiscardChangesSurfaceProps`, `TaskWorkingSectionsSurfaceProps`, `RecoveredPendingAdd`, `RecoveredPendingReassignment` from `'../surfaces'`.

Remove: old `isMutating`.

#### Return value additions

```ts
return {
  // existing:
  taskId,
  taskDetail: taskQuery.data ?? null,
  sectionEntries,
  isPending: taskQuery.isPending,
  isError: taskQuery.isError,
  isSectionsLoading: workingSectionFlow.isLoading,
  refetch: taskQuery.refetch,
  handleSectionPress,
  handleRemoveStep,
  // new:
  hasUnsavedChanges,
  isSaving,
  handleSaveAndClose,
  handleCloseWithGuard,
};
```

### Step 8 — `TaskWorkingSectionsSlidePage.tsx`: recovery props + save bar + close guard

#### 8a — Read recovery props and pass to provider

In `TaskWorkingSectionsSlidePage`, extend `useSurfaceProps` to read recovery fields and forward them to the provider:

```tsx
export function TaskWorkingSectionsSlidePage(): React.JSX.Element {
  const {
    taskId,
    recoveredPendingAdds,
    recoveredPendingRemoveIds,
    recoveredPendingReassignments,
  } = useSurfaceProps<TaskWorkingSectionsSurfaceProps>();

  if (!taskId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Task id is missing.
      </div>
    );
  }

  return (
    <TaskWorkingSectionsProvider
      taskId={taskId}
      initialPendingAdds={recoveredPendingAdds}
      initialPendingRemoveIds={recoveredPendingRemoveIds}
      initialPendingReassignments={recoveredPendingReassignments}
    >
      <TaskWorkingSectionsSlidePageContent />
    </TaskWorkingSectionsProvider>
  );
}
```

When the page is opened normally (no failure recovery), all three recovery props are `undefined`, which the provider treats as empty arrays — no visible change.

Three changes to `TaskWorkingSectionsSlidePageContent`:

#### 8b — Wire close interceptor

Add after the existing `useEffect` for header title:

```tsx
useEffect(() => {
  if (controller.hasUnsavedChanges) {
    header?.setCloseInterceptor(controller.handleCloseWithGuard);
  } else {
    header?.setCloseInterceptor(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [controller.hasUnsavedChanges, controller.handleCloseWithGuard]);
// `header` intentionally omitted — SurfaceHeaderContext is recreated on each SlidePageSurface render
```

#### 8c — Save bar via `StagedForm` `footer` prop

Build the save bar node inline and pass as `footer`:

```tsx
const saveBarNode = controller.hasUnsavedChanges ? (
  <div className="border-t border-border/50 bg-background px-6 pt-3 pb-4">
    <button
      type="button"
      className="w-full rounded-xl bg-[var(--color-primary)] py-3.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
      data-testid="working-sections-save-button"
      disabled={controller.isSaving}
      onClick={() => void controller.handleSaveAndClose()}
    >
      {controller.isSaving ? "Saving…" : "Save & Close"}
    </button>
  </div>
) : undefined;
```

Pass to `StagedForm`:

```tsx
<StagedForm
  ...
  showNavigation={false}
  footer={saveBarNode}
>
```

## Risks and mitigations

- Risk: `setCloseInterceptor` in `SurfaceProvider.tsx` type but not yet implemented in `BottomSheetSurface` or `ModalSurface`. Pages using those surfaces call `useSurfaceHeader()` and might try `header?.setCloseInterceptor(...)` — but only the working sections page does, and it's a slide. `BottomSheetSurface` / `ModalSurface` don't return `SurfaceHeaderContext` so `useSurfaceHeader()` would return `null` there.
  Mitigation: the plan only adds `setCloseInterceptor` to `SlidePageSurface`. The type addition in `SurfaceProvider.tsx` is required for the TypeScript type to accept it; the implementation lives only in `SlidePageSurface`. Existing pages on slide surfaces that don't call `setCloseInterceptor` are unaffected.

- Risk: `closeInterceptor` state in `SlidePageSurface` — using functional `setState` form: `setCloseInterceptorState(() => fn)`. This is required because React's `setState` treats a function argument as a state-updater. Without the wrapping, React calls `fn` instead of storing it.
  Mitigation: the plan explicitly calls this out with `setCloseInterceptor = (fn) => { setCloseInterceptorState(() => fn); }`.

- Risk: Post-unmount async execution — `handleSaveAndClose` calls `surface.closeTop()` then continues `await`ing mutations in the same async function. JavaScript does not cancel async functions on component unmount, so the mutations run to completion. `setIsSaving(true)` is called before close (safe); `setIsSaving(false)` is intentionally not called after (no-op on unmounted component). The `catch` uses `useSurfaceStore.getState().open(...)` which is direct Zustand store access — not a React hook — so it is safe to call after unmount.
  Mitigation: This is the intended pattern. Only `useSurface()` hook calls would be unsafe post-unmount; the plan avoids them.

- Risk: Sequential `mutateAsync` calls — if a remove succeeds but a subsequent add fails, the page re-opens with the **full original** pending snapshot (not just the failed op). The succeeded ops are permanent in the server cache; the re-opened page will show them as already applied.
  Mitigation: Acceptable. The user retries from the same selection they intended. On retry the removes/reassignments that already applied will be no-ops or minor double-writes. No silent data loss.

- Risk: Pending adds use `__pending__` prefix as ID. If a working section ID from the server happened to start with `__pending__`, the guard `stepId.startsWith('__pending__')` in `handleRemoveStep` would misclassify it.
  Mitigation: server step IDs use `tsp_` prefix (as described in the backend handoff). `__pending__` cannot collide.

- Risk: `effectiveTaskSteps` depends on `serverTaskSteps` which is derived from `taskQuery.data?.task_steps ?? []`. If `taskQuery.data` is undefined (loading), `serverTaskSteps` is `[]` and `effectiveTaskSteps` only contains pending adds. The page shows a loading state before `taskDetail` is ready, so `effectiveTaskSteps` is not consumed during loading.
  Mitigation: the existing `isPending` guard in the page prevents rendering `StagedForm` (and thus `TaskWorkingSectionsStepList`) before task data is loaded. ✓

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual test — save flow (optimistic):
  1. Open working sections slide. No save bar visible.
  2. Tap an unselected section → card highlights, save bar appears.
  3. Tap another section → two sections highlighted.
  4. Tap X on first section → reverts, save bar still present (second section pending).
  5. Tap "Save & Close" → slide closes immediately (no "Saving…" wait) → mutations fire in background → `TaskWorkingSectionsField` pill counts updated once mutations settle.
  6. (Simulate failure) Force a network error → slide re-opens with the same selection pre-populated, save bar immediately visible.
- Manual test — discard flow:
  1. Select sections, save bar appears.
  2. Tap header back button → discard sheet appears.
  3. Tap "Discard changes" → slide closes, no mutations fired, field counts unchanged.
  4. Tap header back button again → no sheet (nothing pending) → slide closes cleanly.
- Manual test — save-from-discard-sheet:
  1. Select sections, tap header back → discard sheet.
  2. Tap "Save & Close" → sheet closes, mutations fire, slide closes.
- Manual test — reassignment pending:
  1. Select a section (pending add). Tap it again → worker picker opens.
  2. Select different worker → pending add updated in list.
  3. Save → step created with the second worker.
- `npm run typecheck` after each step verifies no regressions to shared primitives (`StagedForm`, `SlidePageSurface`).

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: user / Codex executor
