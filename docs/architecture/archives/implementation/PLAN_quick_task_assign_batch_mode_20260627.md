# PLAN_quick_task_assign_batch_mode_20260627

## Metadata

- Plan ID: `PLAN_quick_task_assign_batch_mode_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T12:30:42Z`
- Related issue/ticket: —
- Intention plan: —
- Prerequisite plan: `PLAN_task_list_card_to_package_20260627` **must be executed first** (creates `TaskListCard` in `@beyo/tasks`).

## Goal and intent

- Goal: Replace the per-card "Assign working sections" button in `QuickTaskAssignSlidePage` with batch-selection mode — manager selects N tasks via checkmarks, then taps a scroll-responsive footer button to assign the same working sections to all of them in one flow.
- Business/user intent: Assigning working sections task-by-task is slow when multiple pre-orders or returns arrive together. Batch selection reduces the interaction to: select all relevant tasks → pick sections once → save.
- Non-goals:
  - Removing working-section removes or reassignments from the batch — batch only applies the `pendingAdds` (section assignments) to the extra tasks. Removes/reassignments still only apply to the primary (first) selected task.
  - Changing `TaskWorkingSectionsSlidePage` (the standalone slide surface) — batch mode is exclusive to `QuickTaskAssignSlidePage`.
  - Changing the workers app.

## Scope

- In scope:
  - `TaskListCard` in `@beyo/tasks` gains optional `batchMode`, `isSelected`, `onToggleSelect` props; in batch mode the state pill and actions button are hidden, a selection column with a `Check` icon appears on the right, and card-body tap calls `onToggleSelect` instead of `onTapCard`.
  - `QuickTaskAssignSlidePage` replaces `<TaskListCard bottomAction={...}>` with batch-mode cards; adds a new scroll-responsive list-stage footer containing a close button (left) and a conditional "Assign (N)" button (right).
  - `use-quick-task-assign.controller` replaces single `selectedTaskId` with `selectedTaskIds: string[]`; adds `handleToggleTask`; extends `handleSaveCompleted` to fire `addTaskStep` API calls for remaining tasks and then invalidate once.
  - `use-task-working-sections.controller` passes the resolved `pendingAdds` to `surfaceOpeners.onSaveComplete`.
  - `surface-ids.ts` in `@beyo/task-working-sections` extends the `onSaveComplete` callback signature to include `appliedAdds`.

- Out of scope:
  - `pendingRemoveIds` and `pendingReassignments` are NOT replicated to batch tasks — only adds.
  - Batch mode checkbox rendering in `TaskListCard` does NOT touch `bottomAction` (the slot simply is not rendered in batch mode; callers no longer need to pass it for the quick-assign flow).
  - Playwright test updates for the new batch UI (separate pass).

- Assumptions:
  - **"Assign" button visibility**: the button renders when `selectedTaskIds.length > 0` (at least 1 task selected). The requirement said "> 1 tasks" — if the intent is ≥ 2, correct in review.
  - `border-between-border` in the requirement is treated as `border-border` (the CSS token used across this codebase).
  - `addTaskStep` (raw API function) in `@beyo/tasks` accepts a `task_id` field in its variables so the same step configuration can be applied to a different task. Codex MUST read `packages/tasks/src/api/add-task-step.ts` before writing Step 4 to confirm the exact shape.
  - `useScrollVisibilityContext()` from `@beyo/ui` provides the scroll visibility signal for the list-stage footer, consistent with `QuickTaskAssignFooter` on the assign step.
  - The `TaskWorkingSectionsProvider` is keyed to `selectedTaskIds[0]` — it loads the first selected task's current section state. The user picks sections from this base and the same adds are applied to all.

## Clarifications required

_(none — all decisions resolved)_

## Acceptance criteria

1. Task cards in the quick-assign list render in batch mode: no state pill, no three-dot button, a `Check` selection column on the right; `ring-primary` outline when selected.
2. Tapping a card body (or its selection column) toggles that task's selection on/off.
3. The list-stage footer shows a "Back" button (left) that closes the surface. When ≥ 1 task is selected, "Assign (N)" appears to the right.
4. The footer hides when scrolling down (scroll-responsive) and shows when scrolling up, consistent with the assign-step footer.
5. Tapping "Assign (N)" navigates to the assign step, which shows the working-sections picker for the first selected task.
6. Saving in the assign step applies the same section adds to all selected tasks in sequence. Query invalidation fires exactly once after all API calls settle.
7. After all tasks are saved, the surface closes automatically (same "close when empty" logic as before, based on remaining task count in the list).
8. `npm run typecheck` passes with zero errors across all 5 changed files.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: optional props pattern, `memo`, conditional rendering, `data-testid`
- `architecture/08_hooks.md`: stale closure — use filtered arrays for count, not `state.length`; `Promise.allSettled` pattern for fire-and-collect; single invalidation after batch
- `architecture/14_styling.md`: Tailwind conventions, `ring-*` for selection state, scroll-visibility footer pattern

### File read intent

Permitted relational reads before implementation:
- `packages/tasks/src/api/add-task-step.ts` — **REQUIRED before Step 4** — to get the exact function signature and the variables shape needed to call it for a different task ID.
- `packages/task-working-sections/src/surface-ids.ts` — current `RecoveredPendingAdd` type definition and `onSaveComplete` signature.
- `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` — current `handleSaveAndClose` and `pendingAdds` variable name.
- `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts` — current `selectedTaskId` state and `handleSaveCompleted` shape.

Prohibited:
- Reading another controller/hook to understand how to write state management patterns — use contract `08_hooks.md`.
- Reading `StatePill` source for rendering conventions — use existing `TaskListCard` as-is.

---

## Implementation plan

### Step 1 — Add batch mode to `TaskListCard`

**File:** `packages/tasks/src/components/TaskListCard.tsx`

Add three optional props to `TaskListCardProps`:

```ts
export type TaskListCardProps = {
  // ... existing props ...
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
};
```

**Changes to the root `<div>`:**

Add `ring-1` and conditional `ring-primary` / `ring-transparent` when `batchMode` is true:

```tsx
<div
  className={cn(
    "mx-4 flex flex-col overflow-hidden rounded-xl bg-card shadow-sm",
    batchMode && (isSelected ? "ring-1 ring-primary" : "ring-1 ring-transparent"),
  )}
  data-testid={`tasks-card-${taskId}`}
>
```

Import `cn` from `@beyo/lib` (already used elsewhere in the package) and `Check` from `lucide-react`.

**Changes to the card body section (top row):**

In the top row that currently contains `articleLabel` + `StatePill` + actions button:
- When `batchMode` is true: render neither `StatePill` nor the three-dot actions `<button>`.

```tsx
{!batchMode ? (
  <StatePill label={stateLabel} variant={stateVariant} />
) : null}

{!batchMode && onTapActions ? (
  <button aria-label="Task actions" ... >
    {/* existing three-dot button */}
  </button>
) : null}
```

**Changes to `bottomAction` slot:**

```tsx
{!batchMode && bottomAction ? (
  <div className="border-t border-border">{bottomAction}</div>
) : null}
```

**Card body click behaviour in batch mode:**

```tsx
<div
  role={batchMode ? "button" : (onTapCard ? "button" : undefined)}
  tabIndex={batchMode || onTapCard ? 0 : undefined}
  onClick={() => {
    if (batchMode) {
      onToggleSelect?.(taskId);
    } else {
      onTapCard?.(taskId);
    }
  }}
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (batchMode) {
        onToggleSelect?.(taskId);
      } else {
        onTapCard?.(taskId);
      }
    }
  }}
  className={`... ${batchMode || onTapCard ? "cursor-pointer" : "cursor-default"}`}
>
```

**Selection column (rendered only when `batchMode` is true):**

Add this immediately after the closing tag of the `flex` row that holds image + body, before `bottomAction`:

```tsx
{batchMode ? (
  <button
    aria-label={isSelected ? "Deselect task" : "Select task"}
    aria-pressed={isSelected}
    className={cn(
      "flex w-14 shrink-0 items-center justify-center border-l border-border",
      isSelected ? "bg-primary text-card" : "text-muted-foreground",
    )}
    data-testid={`tasks-card-select-${taskId}`}
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onToggleSelect?.(taskId);
    }}
  >
    <Check aria-hidden="true" className="size-5" />
  </button>
) : null}
```

The selection column sits inside the top `<div className="flex">` row (alongside image and body), as the rightmost sibling. Do NOT place it inside the body column.

---

### Step 2 — Extend `onSaveComplete` to pass applied adds

**File:** `packages/task-working-sections/src/surface-ids.ts`

Change the `onSaveComplete` signature in `TaskWorkingSectionsSurfaceOpeners`:

```ts
// Before:
onSaveComplete?: (taskId: string) => number;

// After:
onSaveComplete?: (taskId: string, appliedAdds: RecoveredPendingAdd[]) => number;
```

> `RecoveredPendingAdd` is already defined in this file. No new import needed.

---

### Step 3 — Pass `pendingAdds` from `handleSaveAndClose`

**File:** `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts`

In `handleSaveAndClose`, after the successful save (where `onSaveComplete` is currently called as `surfaceOpeners?.onSaveComplete?.(taskId)`), pass the applied adds:

```ts
// Before:
surfaceOpeners?.onSaveComplete?.(taskId);

// After:
surfaceOpeners?.onSaveComplete?.(taskId, clonePendingAdds(pendingAdds));
```

`clonePendingAdds` is already defined in the file — use it to avoid passing a mutable reference.

> Codex: verify the exact call site location by reading the file. The `pendingAdds` at call time is the state value captured in the `useCallback` deps. This is correct — by the time `onSaveComplete` fires, `pendingAdds` still reflects the pending changes that were just submitted.

No other changes to this file.

---

### Step 4 — Multi-select + batch save in `use-quick-task-assign.controller.ts`

**File:** `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts`

**Codex prerequisite reads before writing this step:**
- `packages/tasks/src/api/add-task-step.ts` — exact function signature
- `packages/task-working-sections/src/surface-ids.ts` — `RecoveredPendingAdd` shape

**4a — Replace `selectedTaskId` with `selectedTaskIds`:**

```ts
// Before:
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

// After:
const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
```

Update all references: `selectedTaskId` → `selectedTaskIds[0] ?? null` where the controller exposes a single selected task ID to the page.

**4b — Add `handleToggleTask`:**

```ts
function handleToggleTask(taskId: string): void {
  setSelectedTaskIds((prev) =>
    prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
  );
}
```

**4c — Add `useQueryClient` and import `addTaskStep`:**

```ts
import { useQueryClient } from "@tanstack/react-query";
import { addTaskStep } from "@beyo/tasks";
// or the correct import path — verify by reading the file

const queryClient = useQueryClient();
```

**4d — Rewrite `handleSaveCompleted` for batch:**

```ts
function handleSaveCompleted(
  taskId: string,
  appliedAdds: RecoveredPendingAdd[],
): number {
  setSavingTaskId((current) => (current === taskId ? null : current));
  setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId));

  const remainingTaskIds = selectedTaskIds.filter((id) => id !== taskId);

  // Apply the same section adds to all remaining selected tasks in sequence.
  // Use Promise.allSettled so a partial failure doesn't block invalidation.
  if (remainingTaskIds.length > 0 && appliedAdds.length > 0) {
    void Promise.allSettled(
      remainingTaskIds.map((id) =>
        addTaskStep(/* task_id: id, steps derived from appliedAdds — see add-task-step.ts */),
      ),
    ).then(() => {
      void queryClient.invalidateQueries({ queryKey: quickTaskKeys.all });
    });
  } else {
    // No remaining batch tasks or no adds — still invalidate to refresh counts/list.
    void Promise.all([listQuery.refetch(), countsQuery.refetch()]);
  }

  return remainingTaskIds.length;
}
```

> **Codex:** fill in the `addTaskStep(...)` call based on what you read in `packages/tasks/src/api/add-task-step.ts`. The goal is: call the raw API function with the same section assignments (`appliedAdds`) but for a different `task_id` (`id`).

> When `remainingTaskIds.length > 0`, invalidation via `queryClient.invalidateQueries` replaces the previous `listQuery.refetch()` + `countsQuery.refetch()` pair — do NOT double-fire.

**4e — Remove the old `selectTask` method** (or keep as internal alias if the page still uses it for navigating to the assign step for the primary task). Since navigation to the assign step is now triggered by the footer, `selectTask` is no longer called from individual card assigns — but the page still needs to know which task to pass to `TaskWorkingSectionsProvider`. Use `selectedTaskIds[0]`.

**4f — Update return value of the controller** to expose:

```ts
return {
  // ...existing fields...
  selectedTaskIds,           // replaces selectedTaskId
  selectedTask: tasks.find((t) => t.task.client_id === selectedTaskIds[0]) ?? null,
  handleToggleTask,          // replaces selectTask for batch
  handleSaveCompleted,       // updated signature
  // keep handleSaveStarted and handleSaveFailed unchanged
};
```

---

### Step 5 — Batch UI in `QuickTaskAssignSlidePage.tsx`

**File:** `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx`

**5a — New list-stage footer component:**

Add before `QuickTaskAssignStagedForm`:

```tsx
function QuickTaskListStageFooter({
  selectedCount,
  onClose,
  onAssign,
}: {
  selectedCount: number;
  onClose: () => void;
  onAssign: () => void;
}): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  return (
    <div
      className={cn(
        "bg-background shadow-[0_-1px_0_0_var(--color-border)] transition-[opacity,transform] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isHidden ? "translate-y-full opacity-0" : "translate-y-0 opacity-100",
      )}
    >
      <div className="flex items-center gap-3 px-4 pb-4 pt-3">
        <button
          className="flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold text-primary shadow-sm transition"
          data-testid="quick-task-list-back-button"
          type="button"
          onClick={onClose}
        >
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
          Back
        </button>

        {selectedCount > 0 ? (
          <button
            className="flex-1 rounded-2xl bg-(--color-primary) px-5 py-3 text-sm font-semibold text-card shadow-sm transition"
            data-testid="quick-task-list-assign-button"
            type="button"
            onClick={onAssign}
          >
            Assign ({selectedCount})
          </button>
        ) : null}
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}
```

Add `ArrowLeft` to the lucide-react import at the top of the file.

**5b — Update `QuickTaskAssignStagedForm` and its WithProvider variant:**

Remove the `onSelectTask` prop (no longer called from individual cards). Remove `footer` as a prop — the footer is determined by step inside the staged form render.

The form now receives `controller` and `staged` only. It renders:
- List step: `QuickTaskListStageFooter` (via `footer` prop of `StagedForm` when `staged.activeStepId === "list"`)
- Assign step: `QuickTaskAssignFooter` (existing, unchanged)

Pass footer to `StagedForm`:

```tsx
footer={
  staged.activeStepId === "assign"
    ? <QuickTaskAssignFooter onSaveAndClose={workingSectionsController.handleSaveAndClose} />
    : <QuickTaskListStageFooter
        selectedCount={controller.selectedTaskIds.length}
        onClose={() => controller.closeSurface?.()}
        onAssign={() => staged.navigateTo("assign")}
      />
}
```

**5c — Wire cards in batch mode:**

In the list step's card render, replace the existing `<TaskListCard>` call (which had `bottomAction`) with batch-mode props:

```tsx
<TaskListCard
  key={task.task.client_id}
  taskId={task.task.client_id}
  task={{ ... }}       // same mapping as before
  item={...}           // same mapping as before
  imageUrl={resolveImageUrl(task.item_images)}
  batchMode
  isSelected={controller.selectedTaskIds.includes(task.task.client_id)}
  onToggleSelect={controller.handleToggleTask}
  onTapImage={controller.openImageViewer}
  onTapActions={controller.openTaskActions}
  onTapCard={undefined}   // body tap is handled by onToggleSelect in batch mode
  // bottomAction is omitted — not rendered in batch mode
/>
```

> `onTapCard` can be omitted entirely (undefined) since in batch mode the card body calls `onToggleSelect`. Passing `undefined` is equivalent.

**5d — Update `TaskWorkingSectionsProvider` key:**

```tsx
// Before:
<TaskWorkingSectionsProvider key={selectedTaskId} taskId={selectedTaskId} ...>

// After:
<TaskWorkingSectionsProvider key={controller.selectedTaskIds[0]} taskId={controller.selectedTaskIds[0]!} ...>
```

**5e — Update `workingSectionSurfaceOpeners` memo:**

The `onSaveComplete` callback now receives `appliedAdds`:

```ts
onSaveComplete: (taskId, appliedAdds) => {
  const remainingTaskCount = controller.handleSaveCompleted(taskId, appliedAdds);

  if (remainingTaskCount === 0) {
    controller.closeSurface?.();
    return 0;
  }

  staged.navigateTo("list");
  return remainingTaskCount;
},
```

Update `useMemo` deps: `[controller, staged.navigateTo]` (same as corrections plan §2 fix — use `staged.navigateTo`, not `staged`).

**5f — Remove `handleSelectTask`** (previously called from individual card assigns). The assign action now flows through the footer button → `staged.navigateTo("assign")`.

**5g — Guard for empty `selectedTaskIds` on the assign step:**

```tsx
// In the assign step render:
{controller.selectedTaskIds[0] && controller.selectedTask ? (
  <QuickTaskAssignWorkingSectionsPanel articleLabel={articleLabel} />
) : (
  <div ...><p>Select a task to continue.</p></div>
)}
```

---

## File summary

| # | File | Action | Notes |
|---|---|---|---|
| 1 | `packages/tasks/src/components/TaskListCard.tsx` | Modified | batch mode: props + selection column + conditional pill/actions |
| 2 | `packages/task-working-sections/src/surface-ids.ts` | Modified | `onSaveComplete` gains `appliedAdds` param |
| 3 | `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` | Modified | pass `pendingAdds` to `onSaveComplete` |
| 4 | `packages/task-working-sections/src/controllers/use-quick-task-assign.controller.ts` | Modified | multi-select state + batch save + single invalidation |
| 5 | `packages/task-working-sections/src/pages/QuickTaskAssignSlidePage.tsx` | Modified | list-stage footer + batch-mode cards + multi-select wiring |

**Total: 0 new files, 5 modified**

---

## Risks and mitigations

- Risk: `addTaskStep` raw API function may not accept the same variable shape as `RecoveredPendingAdd`. If the raw function signature differs from the mutation hook's variables, the batch call site needs an adapter.
  Mitigation: Step 4 explicitly requires Codex to read `packages/tasks/src/api/add-task-step.ts` before writing the batch call.

- Risk: `Promise.allSettled` means partial failures (some tasks successfully assigned, some not) result in a mixed state. The list will refresh after invalidation and the remaining unassigned tasks will still appear.
  Mitigation: Acceptable for now — the manager can re-select and retry failed tasks. No explicit error surface is added in this plan.

- Risk: `selectedTaskIds[0]` can become stale if the primary task is removed from the list before the save completes (e.g., socket event). The `TaskWorkingSectionsProvider` would be keyed to a task ID that's no longer in the list.
  Mitigation: The working sections picker still loads that task's steps via `useGetTaskQuery` / `useTaskStepsByTaskQuery` (which fetch independently), so the picker remains functional. After save and refetch, the task disappears from the list naturally.

- Risk: Removing `selectTask` from the controller return may break a type-check if any other consumer outside this plan references it.
  Mitigation: `npm run typecheck` will surface this. Codex should grep for `selectTask` usage before deleting it.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual — single task: select 1 task → "Assign (1)" appears → tap → pick sections → save → surface closes
- Manual — multi task: select 3 tasks → "Assign (3)" appears → tap → pick sections → save → verify all 3 tasks have the sections assigned (check via task detail)
- Manual — footer scroll: scroll down in task list → footer hides; scroll up → footer shows
- Manual — deselect: tap a selected card again → deselects; count in assign button decrements
- Manual — empty list: after saving last task, surface closes automatically

## Review log

_(empty — plan not yet reviewed)_

## Lifecycle transition

- Current state: `archived`
- Next state: —
- Transition owner: `codex`
