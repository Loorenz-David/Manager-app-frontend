# PLAN_task_working_sections_reassign_slide_corrections_20260627

## Metadata

- Plan ID: `PLAN_task_working_sections_reassign_slide_corrections_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T20:08:56Z`
- Related issue/ticket: —
- Intention plan: —
- Parent plan: `docs/architecture/archives/implementation/PLAN_task_working_sections_reassign_slide_page_20260627.md`

## Goal and intent

- Goal: Fix 6 issues found in the post-implementation audit of the reassign slide page — 2 functional bugs, 2 contract drifts, and 2 minor gaps.
- Business/user intent: The save-error recovery path is currently broken (pending selections are lost on network failure). Button order also violates the stated UX intent (Re-assign must appear above Pin notifications).
- Non-goals: No new features, no changes to controller logic, no changes to the discard-changes sheet, no changes to the managers app.

## Scope

- In scope:
  - `packages/task-working-sections/src/surface-ids.ts` — extend `TaskWorkingSectionsReassignSlideSurfaceProps` with optional recovery fields
  - `packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx` — read and forward recovery fields; fix `text-sm` → `text-md` on Close & Back; add `threshold={40}` to `ScrollVisibilityProvider`
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskStepActionsSheetPage.tsx` — swap button order; remove dead `preloadWorkerPickerSurface` import and opener key
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts` — add two missing preload exports
- Out of scope:
  - `index.ts` — no change needed; `TaskWorkingSectionsReassignSlideSurfaceProps` is already re-exported and the type extension is picked up automatically
  - Controller — no logic changes
  - `TaskWorkingSectionsDiscardChangesSheetPage` — already correctly registered by the original implementation

## Clarifications required

_(none)_

## Acceptance criteria

1. After a save error, the reassign slide re-opens with the user's pending section selections intact (recovery fields read from surface props and forwarded to provider).
2. "Re-assign section" button appears above "Pin notifications" in `TaskStepActionsSheetPage`.
3. Close & Back button renders at `text-md` matching the Save button.
4. `ScrollVisibilityProvider` footer hides after 40 px of downward scroll (not 56).
5. `preloadWorkingSectionWorkerPickerSurface` is not imported or referenced anywhere in `TaskStepActionsSheetPage`.
6. `preloadTaskWorkingSectionsReassignSlideSurface` and `preloadTaskWorkingSectionsDiscardChangesSheetSurface` are exported from `surfaces.ts`.
7. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

No new contracts required — all changes are targeted edits within files already fully read during the audit.

### File read intent

All files were read in full during the audit pass. No additional reads are needed before implementing.

## Implementation plan

### Fix 1 — Extend `TaskWorkingSectionsReassignSlideSurfaceProps` with recovery fields

**File:** `packages/task-working-sections/src/surface-ids.ts`

Change:

```ts
export type TaskWorkingSectionsReassignSlideSurfaceProps = {
  taskId: string;
  hideShortcuts?: boolean;
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
};
```

To:

```ts
export type TaskWorkingSectionsReassignSlideSurfaceProps = {
  taskId: string;
  hideShortcuts?: boolean;
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
};
```

`RecoveredPendingAdd` and `RecoveredPendingReassignment` are already declared earlier in the same file — no new imports.

---

### Fix 2 — Read recovery fields in the page and forward to provider

**File:** `packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx`

**2a.** In `TaskWorkingSectionsReassignSlidePage`, destructure the three new optional fields:

Change:
```tsx
const { taskId, hideShortcuts = false, surfaceOpeners } =
  useSurfaceProps<TaskWorkingSectionsReassignSlideSurfaceProps>();
```

To:
```tsx
const {
  taskId,
  hideShortcuts = false,
  surfaceOpeners,
  recoveredPendingAdds,
  recoveredPendingRemoveIds,
  recoveredPendingReassignments,
} = useSurfaceProps<TaskWorkingSectionsReassignSlideSurfaceProps>();
```

**2b.** Pass the recovery fields to `TaskWorkingSectionsProvider`:

Change:
```tsx
<TaskWorkingSectionsProvider surfaceOpeners={surfaceOpeners} taskId={taskId}>
```

To:
```tsx
<TaskWorkingSectionsProvider
  taskId={taskId}
  surfaceOpeners={surfaceOpeners}
  initialPendingAdds={recoveredPendingAdds}
  initialPendingRemoveIds={recoveredPendingRemoveIds}
  initialPendingReassignments={recoveredPendingReassignments}
>
```

---

### Fix 3 — Close & Back button `text-sm` → `text-md`

**File:** `packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx`

In `TaskWorkingSectionsReassignFooter`, the Close & Back button has `text-sm font-semibold`. Change to `text-md font-semibold` to match the Save button and the stated intention.

Change:
```tsx
className="rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-primary shadow-sm transition"
```

To:
```tsx
className="rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
```

---

### Fix 4 — Add `threshold={40}` to `ScrollVisibilityProvider`

**File:** `packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx`

Change:
```tsx
<ScrollVisibilityProvider
  scrollElement={scrollElement}
  mode="relative"
>
```

To:
```tsx
<ScrollVisibilityProvider
  scrollElement={scrollElement}
  mode="relative"
  threshold={40}
>
```

---

### Fix 5 — Swap button order and remove dead preload in `TaskStepActionsSheetPage`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskStepActionsSheetPage.tsx`

**5a.** Remove the dead import `preloadWorkingSectionWorkerPickerSurface`:

Remove this line from the import block:
```ts
import { preloadWorkingSectionWorkerPickerSurface } from "@beyo/working-sections";
```

**5b.** Remove the `preloadWorkerPickerSurface` key from the `workingSectionSurfaceOpeners` useMemo:

Remove:
```ts
preloadWorkerPickerSurface: preloadWorkingSectionWorkerPickerSurface,
```

After removing that key, the `useSurfaceStore` import from `@/providers/SurfaceProvider` is still needed for `closeSlide` and `reopenSlideAfterError`. Keep it.

**5c.** Swap button order in the JSX — "Re-assign section" must appear first (above "Pin notifications").

The return block currently renders Pin first, then Re-assign. Swap them so Re-assign is the first `<button>` and Pin is the second.

After the swap the JSX order is:
```tsx
<div className="flex flex-col gap-3 bg-background p-6" data-testid="task-step-actions-sheet">
  {/* Re-assign section — first */}
  <button ... data-testid="task-step-actions-reassign-section" ...>
    <RotateCcw className="size-4" />
    Re-assign section
  </button>

  {/* Pin notifications — second */}
  <button ... data-testid="task-step-actions-pin-notifications" ...>
    <Pin className="size-4" />
    Pin notifications
  </button>
</div>
```

---

### Fix 6 — Add missing preload exports to `surfaces.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`

Add two exports after the existing `preloadTaskNoteUnreadViewerSurface` line (around line 201):

```ts
export const preloadTaskWorkingSectionsReassignSlideSurface =
  taskWorkingSectionsReassignSlide.preload;
export const preloadTaskWorkingSectionsDiscardChangesSheetSurface =
  taskWorkingSectionsDiscardChangesSheet.preload;
```

---

## Risks and mitigations

- Risk: Removing `preloadWorkerPickerSurface` from the openers leaves the key undefined. The controller always calls it with optional chaining (`?.`), so the absence is safe.
  Mitigation: Confirmed in controller — `surfaceOpeners?.preloadWorkerPickerSurface` is called via `usePreloadSurface` only in `TaskWorkingSectionsSlidePage`, which is not modified here.

- Risk: Adding recovery fields to `TaskWorkingSectionsReassignSlideSurfaceProps` while `reopenSlideAfterError` still spreads `TaskWorkingSectionsSurfaceProps` into the open call — TypeScript `satisfies` check.
  Mitigation: The spread of a typed variable does not trigger excess property checking under `satisfies`, so the existing call in `TaskStepActionsSheetPage` compiles cleanly. The recovery fields are now present in both the source type (`TaskWorkingSectionsSurfaceProps`) and the target type (`TaskWorkingSectionsReassignSlideSurfaceProps`), so the object is structurally correct.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke — save error path: open Re-assign slide, toggle a section, simulate network failure on save → slide re-opens with the toggled selection intact
- Manual smoke — button order: open `TaskStepActionsSheetPage` → "Re-assign section" is the top button, "Pin notifications" is below it
- Manual smoke — Close & Back font size visually matches Save button weight
- Manual smoke — scroll the section list ~40 px down → footer begins to hide

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `archived`
- Next state: —
- Transition owner: `codex`
