# PLAN_task_working_sections_reassign_slide_page_20260627

## Metadata

- Plan ID: `PLAN_task_working_sections_reassign_slide_page_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T19:59:01Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Add a standalone `TaskWorkingSectionsReassignSlidePage` to the `@beyo/task-working-sections` package, register it as a slide surface in the workers app, and wire an entry-point button inside `TaskStepActionsSheetPage`.
- Business/user intent: Workers need to re-assign a task step to a different working section from the step-actions sheet, without going through the full staged-form flow used by managers.
- Non-goals: No changes to `TaskWorkingSectionsSlidePage` or its staged-form flow. No new query hooks, controllers, or providers — reuses `TaskWorkingSectionsProvider` and its existing controller.

## Scope

- In scope:
  - New surface ID constant + props type in `packages/task-working-sections/src/surface-ids.ts`
  - New page component `packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx`
  - New loader function `loadTaskWorkingSectionsReassignSlidePage()` in `packages/task-working-sections/src/index.ts`
  - Surface registration (`lazyWithPreload`) in `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`
  - New entry-point button (RotateCcw / "Re-assign section") in `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskStepActionsSheetPage.tsx`
- Out of scope:
  - Managers app — no changes
  - New controller, query hook, or API function — all reused from existing package
  - `TaskWorkingSectionsDiscardChangesSheetPage` reuse — the page uses `handleCloseWithGuard` from the existing controller which already handles the discard dialog
- Assumptions:
  - `TaskWorkingSectionsProvider` + `useTaskWorkingSectionsController` already handle all save/discard/guard logic and can be reused without modification
  - The workers app's `TaskStepActionsSheetSurfaceProps` already carries `taskId`
  - `ScrollVisibilityProvider` in relative mode wrapping the list element gives the correct hide-on-scroll behaviour for a fixed footer inside a surface slide

## Clarifications required

_(none — all decisions are derived from the existing codebase patterns)_

## Acceptance criteria

1. Tapping "Re-assign section" in `TaskStepActionsSheetPage` opens a slide surface showing `TaskWorkingSectionsStepList` with the footer visible and the optional shortcut bar rendered by default.
2. Scrolling the list down hides the footer; scrolling back up reveals it.
3. The Save button is disabled when no section selection has changed; it enables as soon as the selection differs from the server state.
4. Tapping "Close & Back" calls `controller.handleCloseWithGuard` (triggers discard-changes dialog when there are unsaved changes, closes otherwise).
5. A successful Save closes the surface (via `controller.handleSaveAndClose`).
6. Passing `hideShortcuts: true` in surface props removes the shortcut bar row from the footer.
7. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer boundaries and import rules
- `architecture/02_types.md`: type conventions
- `architecture/05_server_state.md`: query hook patterns (read-only, for understanding existing hooks)
- `architecture/08_hooks.md`: action hook and optimistic update patterns
- `architecture/15_feature_structure.md`: feature folder structure
- `architecture/23_providers.md`: provider + context shell pattern
- `architecture/28_surfaces.md`: surface registration and surface types
- `architecture/30_dynamic_loading.md`: `lazyWithPreload` and loader function pattern
- `architecture/35_shared_packages.md`: package page loader function rule (§14) and surfaceOpeners injection (§13)
- `architecture/36_scroll_visibility.md`: `ScrollVisibilityProvider` relative mode, `useScrollVisibilityContext`

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`; `drawer` excluded)
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path (`@/utils/lazy-with-preload`), `usePreloadSurface` hook

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Permitted relational reads already performed:
- `packages/task-working-sections/src/pages/TaskWorkingSectionsSlidePage.tsx` — established existing footer shape, `useSurfaceHeader` header-hiding pattern, provider props, and `handleCloseWithGuard`/`handleSaveAndClose` controller API
- `packages/task-working-sections/src/components/TaskWorkingSectionsStepList.tsx` — confirmed component reads from context with no extra props
- `packages/task-working-sections/src/providers/TaskWorkingSectionsProvider.tsx` — confirmed provider accepts `taskId`, optional pending-recovery props, and `surfaceOpeners`
- `packages/task-working-sections/src/surface-ids.ts` — established existing IDs and types to extend
- `packages/task-working-sections/src/index.ts` — established existing loader function pattern to follow
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts` — established `lazyWithPreload` registration pattern
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskStepActionsSheetPage.tsx` — confirmed insertion point (line 26) and available `surface`, `taskId`, `stepId`
- `packages/ui/src/components/primitives/scroll-visibility/ScrollVisibilityProvider.tsx` — confirmed `scrollElement` prop + relative mode setup
- `packages/ui/src/components/primitives/working-section-shortcut-bar/WorkingSectionShortcutBar.tsx` — confirmed `WorkingSectionShortcutBarProps` interface

### Skill selection

- Primary skill: `skills/codex/SKILL.md`
- Trigger terms: `package page`, `lazyWithPreload`, `loadXxxPage`, `slide surface`, `surfaceOpeners`, `ScrollVisibilityProvider`
- Excluded alternatives: `skills/playwright/SKILL.md` — not a test-writing task

## Implementation plan

### Step 1 — Add surface ID + props type (`surface-ids.ts`)

File: `packages/task-working-sections/src/surface-ids.ts`

Add at the bottom (after existing constants and types):

```ts
export const TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID =
  "task-working-sections-reassign-slide";

export type TaskWorkingSectionsReassignSlideSurfaceProps = {
  taskId: string;
  hideShortcuts?: boolean;
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
};
```

No changes to `TaskWorkingSectionsSurfaceOpeners` — the reassign page reuses the same opener shape (closeSlide, openDiscardChangesSheet, etc.).

---

### Step 2 — Create the page component

File: `packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx`

#### Overall structure

```
TaskWorkingSectionsReassignSlidePage          ← reads surfaceProps, guards taskId, mounts provider
  └─ TaskWorkingSectionsProvider              ← same provider as SlidePage
       └─ ScrollVisibilityProvider (relative) ← wraps scroll container + footer
            ├─ scrollable list div            ← ref passed to ScrollVisibilityProvider
            │   └─ TaskWorkingSectionsStepList
            └─ TaskWorkingSectionsReassignFooter  ← reads useScrollVisibilityContext
                 ├─ WorkingSectionShortcutBar (when !hideShortcuts && sections > 0)
                 └─ [Close & Back] [Save]
```

#### Footer sub-component (`TaskWorkingSectionsReassignFooter`)

```tsx
function TaskWorkingSectionsReassignFooter({
  availableSections,
  selectedSectionIds,
  hideShortcuts,
  hasUnsavedChanges,
  isSaving,
  onShortcutPress,
  onSaveAndClose,
  onClose,
}: { ... }): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isHidden ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
          {!hideShortcuts && availableSections.length > 0 ? (
            <div className="px-4 pt-3">
              <WorkingSectionShortcutBar
                shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
                availableSections={availableSections}
                selectedSectionIds={selectedSectionIds}
                onShortcutPress={onShortcutPress}
                animationMode="translate"
                data-testid="task-working-sections-reassign-shortcut-bar"
                className="py-2"
                trackClassName="mt-3"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
            <button
              className="rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
              data-testid="task-working-sections-reassign-close-button"
              type="button"
              onClick={onClose}
            >
              Close & Back
            </button>

            <button
              className="rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="task-working-sections-reassign-save-button"
              disabled={isSaving || !hasUnsavedChanges}
              type="button"
              onClick={() => { void onSaveAndClose(); }}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>

          <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
        </div>
      </div>
    </div>
  );
}
```

#### Page content sub-component (`TaskWorkingSectionsReassignContent`)

```tsx
function TaskWorkingSectionsReassignContent({
  hideShortcuts,
}: {
  hideShortcuts: boolean;
}): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskWorkingSectionsContext();
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const availableSections = useMemo(
    () => controller.sectionEntries.map((entry) => entry.section),
    [controller.sectionEntries],
  );
  const selectedSectionIds = useMemo(
    () =>
      controller.sectionEntries
        .filter((entry) => entry.isActive)
        .map((entry) => entry.section.client_id),
    [controller.sectionEntries],
  );

  useEffect(() => {
    header?.setHeaderHidden(true);
    header?.setCloseInterceptor(
      controller.hasUnsavedChanges ? controller.handleCloseWithGuard : null,
    );
    return () => {
      header?.setHeaderHidden(false);
      header?.setCloseInterceptor(null);
    };
  }, [controller.handleCloseWithGuard, controller.hasUnsavedChanges, header]);

  if (controller.isPending) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading working sections…
      </div>
    );
  }

  if (controller.isError || !controller.taskDetail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Working sections could not be loaded.
        </p>
        <button
          type="button"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          onClick={() => { void controller.refetch(); }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <ScrollVisibilityProvider scrollElement={scrollEl} mode="relative" threshold={40}>
      <div className="flex h-full flex-col">
        <div
          ref={setScrollEl}
          className="flex-1 overflow-y-auto"
        >
          <div className="flex flex-col gap-4 px-3 py-4 pb-20">
            <TaskWorkingSectionsStepList />
          </div>
        </div>

        <TaskWorkingSectionsReassignFooter
          availableSections={availableSections}
          selectedSectionIds={selectedSectionIds}
          hideShortcuts={hideShortcuts}
          hasUnsavedChanges={controller.hasUnsavedChanges}
          isSaving={controller.isSaving}
          onClose={controller.handleCloseWithGuard}
          onShortcutPress={controller.handleShortcutPress}
          onSaveAndClose={controller.handleSaveAndClose}
        />
      </div>
    </ScrollVisibilityProvider>
  );
}
```

#### Root export

```tsx
export function TaskWorkingSectionsReassignSlidePage(): React.JSX.Element {
  const { taskId, hideShortcuts, surfaceOpeners } =
    useSurfaceProps<TaskWorkingSectionsReassignSlideSurfaceProps>();

  if (!taskId) {
    return <div className="p-6 text-sm text-muted-foreground">Task id is missing.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <TaskWorkingSectionsProvider
        taskId={taskId}
        surfaceOpeners={surfaceOpeners}
      >
        <TaskWorkingSectionsReassignContent hideShortcuts={hideShortcuts ?? false} />
      </TaskWorkingSectionsProvider>
    </div>
  );
}
```

#### Required imports (top of file)

```ts
import { useEffect, useMemo, useState } from "react";
import { cn } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  ScrollVisibilityProvider,
  WorkingSectionShortcutBar,
  useScrollVisibilityContext,
} from "@beyo/ui";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@beyo/working-sections";
import { TaskWorkingSectionsStepList } from "../components/TaskWorkingSectionsStepList";
import {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "../providers/TaskWorkingSectionsProvider";
import type { TaskWorkingSectionsReassignSlideSurfaceProps } from "../surface-ids";
```

---

### Step 3 — Add loader function to `index.ts`

File: `packages/task-working-sections/src/index.ts`

Append after `loadQuickTaskAssignSlidePage`:

```ts
export function loadTaskWorkingSectionsReassignSlidePage() {
  return import("./pages/TaskWorkingSectionsReassignSlidePage").then((m) => ({
    default: m.TaskWorkingSectionsReassignSlidePage,
  }));
}
```

Also add the new surface ID constant and props type to the existing exports block:

```ts
export {
  QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID,      // ← add
} from "./surface-ids";
export type {
  ...existing types...,
  TaskWorkingSectionsReassignSlideSurfaceProps,          // ← add
} from "./surface-ids";
```

---

### Step 4 — Register surface in workers app `surfaces.ts`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`

**Add import** (alongside other `@beyo/task-working-sections` imports at the top):

```ts
import {
  TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID,
  loadTaskWorkingSectionsReassignSlidePage,
} from "@beyo/task-working-sections";
```

**Add `lazyWithPreload` variable** (alongside the other lazy surface declarations):

```ts
const taskWorkingSectionsReassignSlide = lazyWithPreload(
  loadTaskWorkingSectionsReassignSlidePage,
);
```

**Export preload** (alongside other `preloadXxx` exports):

```ts
export const preloadTaskWorkingSectionsReassignSlideSurface =
  taskWorkingSectionsReassignSlide.preload;
```

**Register in `taskStepSurfaces`** (add to the object):

```ts
[TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: taskWorkingSectionsReassignSlide.Component,
},
```

---

### Step 5 — Add entry-point button in `TaskStepActionsSheetPage.tsx`

File: `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskStepActionsSheetPage.tsx`

**Add import** at the top:

```ts
import { RotateCcw } from "lucide-react";
import {
  TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID,
  type TaskWorkingSectionsReassignSlideSurfaceProps,
} from "@beyo/task-working-sections";
```

**Insert button** above the existing Pin notifications button (currently at line 26):

```tsx
<button
  type="button"
  className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
  data-testid="task-step-actions-reassign-section"
  disabled={!taskId}
  onClick={() => {
    if (!taskId) {
      return;
    }

    surface.open(TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID, {
      taskId,
    } satisfies TaskWorkingSectionsReassignSlideSurfaceProps);
  }}
>
  <RotateCcw className="size-4" />
  Re-assign section
</button>
```

The existing Pin notifications button remains below unchanged.

---

## Risks and mitigations

- Risk: `ScrollVisibilityProvider` is exported from `@beyo/ui` but the import path may need verification if it's nested in the primitives folder.
  Mitigation: Confirmed `ScrollVisibilityProvider` is re-exported from `@beyo/ui`'s primitives index. Use the package-level import `import { ScrollVisibilityProvider } from "@beyo/ui"`.

- Risk: Footer positioned outside the `ScrollVisibilityProvider` scroll element loses `useScrollVisibilityContext` access.
  Mitigation: The footer is rendered *inside* `ScrollVisibilityProvider` as a sibling of the scroll div, not outside it. The context is available to the footer via the provider that wraps both.

- Risk: The `handleCloseWithGuard` reference may change identity on every render if not stable from the controller.
  Mitigation: This is the same dependency pattern used in `TaskWorkingSectionsSlidePage` — the `useEffect` dependency array already follows this correctly there, so the same approach is safe here.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `packages/task-working-sections` and `apps/workers-app`
- Manual smoke: open `TaskStepActionsSheetPage` → tap "Re-assign section" → slide surface opens, list is visible
- Manual smoke: scroll the section list down → footer hides; scroll up → footer reappears
- Manual smoke: tap a section to toggle it → Save button activates; tap "Close & Back" without saving → discard-changes guard fires (if controller is wired)
- Manual smoke: pass `hideShortcuts: true` in surface props → shortcut bar row is absent from the footer

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `archived`
- Next state: —
- Transition owner: `codex`
