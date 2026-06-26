# PLAN_task_working_sections_to_package_20260625

## Metadata

- Plan ID: `PLAN_task_working_sections_to_package_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T17:53:39Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Move `TaskWorkingSectionsStepList`, `TaskWorkingSectionsSlidePage`, `TaskWorkingSectionsDiscardChangesSheetPage`, their controller, provider, and supporting API/action files into `@beyo/tasks`. The managers app consumes them exclusively through the package, no local copies remain.
- Business/user intent: Shared package boundary for the working-sections slide feature so it can be reused (e.g., workers app) and is no longer tightly coupled to the managers app source tree.
- Non-goals: Workers app integration (out of scope for this plan). Moving unrelated task surfaces or pages.

## Scope

- In scope:
  - `packages/tasks/src/surface-ids.ts` (new) — working-sections surface ID constants, `TaskWorkingSectionsSurfaceOpeners` map, surface props types, recovery types
  - `packages/tasks/src/api/add-task-step.ts` (move from app)
  - `packages/tasks/src/api/remove-task-step.ts` (move from app)
  - `packages/tasks/src/api/get-task.ts` (move from app)
  - `packages/tasks/src/api/use-get-task-query.ts` (move from app)
  - `packages/tasks/src/actions/use-add-task-step.ts` (move from app)
  - `packages/tasks/src/actions/use-remove-task-step.ts` (move from app)
  - `packages/tasks/src/controllers/use-task-working-sections.controller.ts` (move from app; surface calls → surfaceOpeners)
  - `packages/tasks/src/providers/TaskWorkingSectionsProvider.tsx` (move from app; pass surfaceOpeners through to controller)
  - `packages/tasks/src/components/TaskWorkingSectionsStepList.tsx` (move from app)
  - `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx` (move from app)
  - `packages/tasks/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx` (move from app)
  - `packages/tasks/src/index.ts` (update exports)
  - `packages/tasks/package.json` (add `@beyo/working-sections` peer dep)
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts` (import IDs from `@beyo/tasks`; update page loaders; `TaskWorkingSectionsSurfaceProps` now requires `surfaceOpeners`)
  - The app controller that opens the working sections slide (locate via `grep TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID` in app's controllers) — assemble `surfaceOpeners` before opening
  - `apps/managers-app/ManagerBeyo-app-managers/src/index.css` — verify `@source` for tasks package exists; add if missing
  - Delete all moved files from the app after package is validated

- Out of scope:
  - Migrating any other task surface or action not listed above
  - Workers app integration
  - `use-assign-step-worker.ts` (app-local action; not consumed by this feature's controller)

- Assumptions:
  - The `@beyo/tasks` package is already declared in the managers app's `package.json dependencies` — no new `npm install` step needed beyond adding the peer dep in the package's own `package.json`.
  - `@beyo/working-sections` exposes `useWorkingSectionPickerFlow` and `WorkingSectionOption` / `WorkingSectionMember` types via its `index.ts`.
  - `DEFAULT_WORKING_SECTION_SHORTCUTS` is exported from `@beyo/working-sections`.
  - `WorkingSectionShortcutBar`, `StagedForm`, `StagedFormStep`, `ContentCard`, `ImagePlaceholder`, `StatePill`, `useScrollVisibilityContext` are all exported from `@beyo/ui`.
  - `useStagedForm`, `usePreloadSurface`, `useSurfaceHeader`, `useSurfaceProps` are all exported from `@beyo/hooks`.
  - Contract §10 ("feature pages stay app-specific") is intentionally overridden here at the user's request — this slide is self-contained and the user explicitly wants it in the package.

## Clarifications required

None — scope is fully specified.

## Acceptance criteria

1. The managers app has zero local imports of `TaskWorkingSectionsStepList`, `TaskWorkingSectionsSlidePage`, `TaskWorkingSectionsDiscardChangesSheetPage`, `useTaskWorkingSectionsController`, `TaskWorkingSectionsProvider`, `useTaskWorkingSectionsContext`.
2. All imports of these symbols in the managers app come from `@beyo/tasks`.
3. `npm run typecheck` from `frontend/` produces zero TypeScript errors.
4. The working sections slide opens, displays sections, saves and closes correctly (manual smoke test).
5. The discard-changes sheet appears when closing with unsaved changes.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: source-package migration cycle (§9), surface openers injection (§13), Tailwind @source rule (§6), peer dep classification (§4), package structure (§8).

### Local extensions loaded

- `architecture/28_surfaces_local.md`: confirms slide/sheet/modal are the active surface types; no local delta affects this plan.
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` path is `@beyo/ui/src/lib/lazy-with-preload` (already used in surfaces.ts); `usePreloadSurface` is in `@beyo/hooks`.

### File read intent — pattern vs. relational

Permitted (relational reads — understanding what exists):
- `features/tasks/controllers/use-task-working-sections.controller.ts` — read to derive exact surface calls and import list ✓ (already read)
- `features/tasks/providers/TaskWorkingSectionsProvider.tsx` — read to derive props shape ✓ (already read)
- `features/tasks/surfaces.ts` — read to derive surface IDs, props types, registration pattern ✓ (already read)
- `pages/tasks/TaskWorkingSectionsSlidePage.tsx` — read to derive full import list ✓ (already read)
- `packages/tasks/package.json` — read to establish current peers ✓ (already read)
- `packages/tasks/src/index.ts` — read to know current exports ✓ (already read)

### Skill selection

- Primary skill: `skills/codex/SKILL.md`
- Trigger terms: package migration, move to package, @beyo/tasks

---

## surfaceOpeners design (§13 compliance)

The controller currently calls `useSurface` and `useSurfaceStore` directly — a package boundary violation per §13. These four surface operations must become injected callbacks:

```ts
// packages/tasks/src/surface-ids.ts

export const TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID =
  "task-working-sections-slide";
export const TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID =
  "task-working-sections-discard-changes";

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

export type TaskWorkingSectionsDiscardChangesSurfaceProps = {
  onDiscardAndClose: () => void;
  onSaveAndClose: () => void;
};

export type TaskWorkingSectionsSurfaceOpeners = {
  closeSlide?: () => void;
  closeDiscardSheet?: () => void;
  openDiscardChangesSheet?: (
    props: TaskWorkingSectionsDiscardChangesSurfaceProps,
  ) => void;
  reopenSlideAfterError?: (props: TaskWorkingSectionsSurfaceProps) => void;
  preloadWorkerPickerSurface?: () => void;
};

export type TaskWorkingSectionsSurfaceProps = {
  taskId: string;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
};
```

The controller's `ControllerInit` type gains `surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners`. All four surface calls in the controller body become `init.surfaceOpeners?.closeSlide?.()`, `init.surfaceOpeners?.closeDiscardSheet?.()`, `init.surfaceOpeners?.openDiscardChangesSheet?.(props)`, and `init.surfaceOpeners?.reopenSlideAfterError?.(snapshot)`.

The slide page reads `surfaceOpeners` from `useSurfaceProps<TaskWorkingSectionsSurfaceProps>()` and passes it to `TaskWorkingSectionsProvider`. The provider forwards it to `useTaskWorkingSectionsController` via `init`. The page also calls `usePreloadSurface(surfaceOpeners?.preloadWorkerPickerSurface ?? (() => {}))` to replace the app-local import.

The app controller that opens the slide assembles the openers once:
```ts
import {
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  type TaskWorkingSectionsSurfaceOpeners,
  type TaskWorkingSectionsSurfaceProps,
} from "@beyo/tasks";

const surfaceOpeners: TaskWorkingSectionsSurfaceOpeners = {
  closeSlide: () =>
    useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID),
  closeDiscardSheet: () =>
    useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID),
  openDiscardChangesSheet: (props) =>
    surface.open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, props),
  reopenSlideAfterError: (props) =>
    useSurfaceStore.getState().open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, props),
  preloadWorkerPickerSurface: preloadWorkingSectionWorkerPickerSurface,
};
openSurface(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, { taskId, surfaceOpeners } satisfies TaskWorkingSectionsSurfaceProps);
```

---

## Implementation plan

### Step 1 — Read the 4 app API files before moving them

Read to confirm their exact `@/` import paths and exported function names:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/get-task.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/use-get-task-query.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/add-task-step.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/remove-task-step.ts`

Also read `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/actions/use-add-task-step.ts` and `use-remove-task-step.ts` to confirm their imports.

Grep `use-add-task-step\|use-remove-task-step` in the app's `src/` (excluding `actions/`) to confirm no other callers remain before deleting the action files.

### Step 2 — Create `packages/tasks/src/surface-ids.ts`

Copy the exact type definitions and constants from the surfaceOpeners design section above. This is a net-new file with no `@/` imports.

### Step 3 — Move API functions to the tasks package (4 files)

For each file (`get-task.ts`, `use-get-task-query.ts`, `add-task-step.ts`, `remove-task-step.ts`):
- Copy to `packages/tasks/src/api/<filename>`.
- Replace any `@/features/tasks/api/task-keys` → `./task-keys` (relative).
- Replace any `@/features/tasks/types` → `../types` (relative).
- No other `@/` imports are expected in these files.

### Step 4 — Move action files to the tasks package (2 files)

For `use-add-task-step.ts` and `use-remove-task-step.ts`:
- Copy to `packages/tasks/src/actions/<filename>`.
- Replace `@/features/tasks/api/task-keys` → `../api/task-keys`.
- Replace `@/features/tasks/api/add-task-step` → `../api/add-task-step` (and same for remove).
- Replace `@/features/tasks/types` → `../types`.

### Step 5 — Create `packages/tasks/src/controllers/use-task-working-sections.controller.ts`

Start from the app's controller. Apply every substitution listed below:

| Original `@/` import | Package import |
|---|---|
| `@beyo/lib` (generateClientId) | unchanged — already a package import |
| `@beyo/tasks` (humanizeSnakeCase) | `../lib/task-detail` — avoid circular self-import |
| `@/features/tasks/actions/use-add-task-step` | `../actions/use-add-task-step` |
| `@/features/tasks/actions/use-remove-task-step` | `../actions/use-remove-task-step` |
| `@/features/tasks/api/use-get-task-query` | `../api/use-get-task-query` |
| `@/features/tasks/surfaces` | `../surface-ids` |
| `@/features/tasks/types` | `../types` |
| `@/features/working-sections/flows/use-working-section-picker.flow` | `@beyo/working-sections` |
| `@/features/working-sections/types` | `@beyo/working-sections` |
| `@/hooks/use-surface` | removed — surface calls become `init.surfaceOpeners?.*(...)` |
| `@/providers/SurfaceProvider` (useSurfaceStore) | removed — same reason |

Surface call substitutions in the controller body:
- `useSurface()` call — remove entirely; surface is no longer used.
- `closeSlide` callback: `useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID)` → `init.surfaceOpeners?.closeSlide?.()`.
- `closeDiscardSheet` callback: `useSurfaceStore.getState().close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID)` → `init.surfaceOpeners?.closeDiscardSheet?.()`.
- `handleCloseWithGuard` → `surface.open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, {...})` → `init.surfaceOpeners?.openDiscardChangesSheet?.({...})`.
- Error recovery in `handleSaveAndClose` → `useSurfaceStore.getState().open(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, recoverySnapshot)` → `init.surfaceOpeners?.reopenSlideAfterError?.(recoverySnapshot)`.

Add `surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners` to `ControllerInit`.

### Step 6 — Create `packages/tasks/src/providers/TaskWorkingSectionsProvider.tsx`

Start from the app's provider. Apply:
- `@/features/tasks/controllers/use-task-working-sections.controller` → `../controllers/use-task-working-sections.controller`
- `@/features/tasks/surfaces` → `../surface-ids` (for `RecoveredPendingAdd`, `RecoveredPendingReassignment`)
- Add `surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners` to `TaskWorkingSectionsProviderProps`.
- Pass `surfaceOpeners` through to `useTaskWorkingSectionsController(taskId, { ..., surfaceOpeners })`.

### Step 7 — Create `packages/tasks/src/components/TaskWorkingSectionsStepList.tsx`

Start from the app's component. Apply:
- `@/components/primitives` → `@beyo/ui` (ContentCard, ImagePlaceholder, StatePill)
- `@/features/tasks/providers/TaskWorkingSectionsProvider` → `../providers/TaskWorkingSectionsProvider`
- `@/lib/utils` → `@beyo/lib` (cn)

### Step 8 — Create `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx`

Start from the app's page. Apply:
- `@/components/primitives` → `@beyo/ui` (ContentCard, StagedForm, StagedFormStep, WorkingSectionShortcutBar)
- `@/components/primitives/scroll-visibility` → `@beyo/ui` (useScrollVisibilityContext)
- `@/features/tasks/components/TaskWorkingSectionsStepList` → `../components/TaskWorkingSectionsStepList`
- `@/features/tasks/providers/TaskWorkingSectionsProvider` → `../providers/TaskWorkingSectionsProvider`
- `@/features/working-sections` (DEFAULT_WORKING_SECTION_SHORTCUTS) → `@beyo/working-sections`
- `@/features/working-sections/surfaces` (preloadWorkingSectionWorkerPickerSurface) → **remove import**; replace call: `usePreloadSurface(preloadWorkingSectionWorkerPickerSurface)` becomes `usePreloadSurface(controller.surfaceOpeners?.preloadWorkerPickerSurface ?? (() => {}))` where `surfaceOpeners` is read from `useSurfaceProps` at the root component level and passed into the provider.

  > Concretely: `TaskWorkingSectionsSlidePage` reads `surfaceOpeners` from `useSurfaceProps`, passes it to `TaskWorkingSectionsProvider`. `TaskWorkingSectionsSlidePageContent` reads the controller via `useTaskWorkingSectionsContext()` — the context value does not expose `surfaceOpeners` directly. To call `usePreloadSurface`, the `surfaceOpeners` reference from the outer `TaskWorkingSectionsSlidePage` needs to be passed down as a prop to `TaskWorkingSectionsSlidePageContent`, or an alternative approach: expose `surfaceOpeners` from the controller (add it to the controller return value so `useTaskWorkingSectionsContext()` can access it).

  **Preferred approach:** add `surfaceOpeners: TaskWorkingSectionsSurfaceOpeners` to the controller's return object. `TaskWorkingSectionsSlidePageContent` then reads it via `controller.surfaceOpeners`.

- `@/features/tasks/surfaces` (TaskWorkingSectionsSurfaceProps) → `../surface-ids`
- `@/hooks/use-staged-form` → `@beyo/hooks`
- `@/hooks/use-surface-header` → `@beyo/hooks`
- `@/hooks/use-surface-props` → `@beyo/hooks`
- `@/hooks/use-preload-surface` → `@beyo/hooks`
- `@/lib/utils` (cn) → `@beyo/lib`

### Step 9 — Create `packages/tasks/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx`

Start from the app's page. Apply:
- `@/hooks/use-surface-props` → `@beyo/hooks`
- `@/features/tasks/surfaces` (TaskWorkingSectionsDiscardChangesSurfaceProps) → `../surface-ids`

### Step 10 — Update `packages/tasks/src/index.ts`

Add the following exports at the end of the existing file (do not remove or reorder existing exports):

```ts
// surface IDs and openers (working sections)
export {
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
} from "./surface-ids";
export type {
  RecoveredPendingAdd,
  RecoveredPendingReassignment,
  TaskWorkingSectionsDiscardChangesSurfaceProps,
  TaskWorkingSectionsSurfaceOpeners,
  TaskWorkingSectionsSurfaceProps,
} from "./surface-ids";

// API functions
export { getTask } from "./api/get-task";
export { useGetTaskQuery } from "./api/use-get-task-query";
export { addTaskStep } from "./api/add-task-step";
export { removeTaskStep } from "./api/remove-task-step";

// Actions
export { useAddTaskStep } from "./actions/use-add-task-step";
export type { AddTaskStepVariables } from "./actions/use-add-task-step";
export { useRemoveTaskStep } from "./actions/use-remove-task-step";

// Controller
export { useTaskWorkingSectionsController } from "./controllers/use-task-working-sections.controller";
export type {
  TaskWorkingSectionsController,
  TaskWorkingSectionEntry,
} from "./controllers/use-task-working-sections.controller";

// Provider + context hook
export {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "./providers/TaskWorkingSectionsProvider";

// Components and pages
export { TaskWorkingSectionsStepList } from "./components/TaskWorkingSectionsStepList";
export { TaskWorkingSectionsSlidePage } from "./pages/TaskWorkingSectionsSlidePage";
export { TaskWorkingSectionsDiscardChangesSheetPage } from "./pages/TaskWorkingSectionsDiscardChangesSheetPage";
```

### Step 11 — Update `packages/tasks/package.json`

Add to `peerDependencies`:
```json
"@beyo/working-sections": "*"
```

### Step 12 — Update `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`

1. Remove the local type definitions for `RecoveredPendingAdd`, `RecoveredPendingReassignment`, `TaskWorkingSectionsSurfaceProps`, `TaskWorkingSectionsDiscardChangesSurfaceProps`.
2. Remove the local `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID` and `TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID` constants.
3. Import them from `@beyo/tasks`:
   ```ts
   import {
     TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
     TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
     type TaskWorkingSectionsSurfaceProps,
     type TaskWorkingSectionsDiscardChangesSurfaceProps,
   } from "@beyo/tasks";
   ```
4. Re-export them so other app files that import these IDs from `@/features/tasks/surfaces` continue to compile:
   ```ts
   export {
     TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
     TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
   } from "@beyo/tasks";
   export type {
     TaskWorkingSectionsSurfaceProps,
     TaskWorkingSectionsDiscardChangesSurfaceProps,
   } from "@beyo/tasks";
   ```
5. Update the page loaders to import from `@beyo/tasks`:
   ```ts
   function loadTaskWorkingSectionsSlidePage() {
     return import("@beyo/tasks").then((m) => ({
       default: m.TaskWorkingSectionsSlidePage,
     }));
   }

   function loadTaskWorkingSectionsDiscardChangesSheetPage() {
     return import("@beyo/tasks").then((m) => ({
       default: m.TaskWorkingSectionsDiscardChangesSheetPage,
     }));
   }
   ```

### Step 13 — Locate and update the app controller that opens the working sections slide

Run: `grep -r "TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID\|openWorkingSections\|preloadTaskWorkingSectionsSurface" apps/managers-app/ManagerBeyo-app-managers/src/ --include="*.ts" --include="*.tsx" -l`

In the identified file(s), replace the bare `openSurface(TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID, { taskId })` call with the full `surfaceOpeners` assembly shown in the surfaceOpeners design section above. Import `useSurfaceStore`, `preloadWorkingSectionWorkerPickerSurface`, and the new types from `@beyo/tasks`.

### Step 14 — Verify Tailwind `@source` for the tasks package

Open `apps/managers-app/ManagerBeyo-app-managers/src/index.css`. If a `@source` line pointing to `../../../../packages/tasks/src` is absent, add it alongside the other `@beyo/*` source lines.

### Step 15 — Delete removed app files

Delete after Step 12–13 compile cleanly:
- `features/tasks/controllers/use-task-working-sections.controller.ts`
- `features/tasks/providers/TaskWorkingSectionsProvider.tsx`
- `features/tasks/components/TaskWorkingSectionsStepList.tsx`
- `pages/tasks/TaskWorkingSectionsSlidePage.tsx`
- `pages/tasks/TaskWorkingSectionsDiscardChangesSheetPage.tsx`
- `features/tasks/actions/use-add-task-step.ts`
- `features/tasks/actions/use-remove-task-step.ts`
- `features/tasks/api/get-task.ts`
- `features/tasks/api/use-get-task-query.ts`
- `features/tasks/api/add-task-step.ts`
- `features/tasks/api/remove-task-step.ts`

Before deleting actions: confirm grep from Step 1 shows no other app callers.

### Step 16 — Typecheck and validate

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck
```

Zero errors expected. Fix any residual `@/` import that still points to a deleted file.

---

## File summary

| # | File | Action |
|---|---|---|
| 1 | `packages/tasks/src/surface-ids.ts` | create |
| 2 | `packages/tasks/src/api/get-task.ts` | move from app |
| 3 | `packages/tasks/src/api/use-get-task-query.ts` | move from app |
| 4 | `packages/tasks/src/api/add-task-step.ts` | move from app |
| 5 | `packages/tasks/src/api/remove-task-step.ts` | move from app |
| 6 | `packages/tasks/src/actions/use-add-task-step.ts` | move from app |
| 7 | `packages/tasks/src/actions/use-remove-task-step.ts` | move from app |
| 8 | `packages/tasks/src/controllers/use-task-working-sections.controller.ts` | move from app + surface → openers refactor |
| 9 | `packages/tasks/src/providers/TaskWorkingSectionsProvider.tsx` | move from app + surfaceOpeners prop |
| 10 | `packages/tasks/src/components/TaskWorkingSectionsStepList.tsx` | move from app |
| 11 | `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx` | move from app |
| 12 | `packages/tasks/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx` | move from app |
| 13 | `packages/tasks/src/index.ts` | update |
| 14 | `packages/tasks/package.json` | add `@beyo/working-sections` peer |
| 15 | `apps/…/features/tasks/surfaces.ts` | update — re-export IDs from package, update loaders |
| 16 | App controller opening the slide (TBD from grep) | update — assemble surfaceOpeners |
| 17 | `apps/…/src/index.css` | verify/add `@source` |
| D1 | `apps/…/features/tasks/controllers/use-task-working-sections.controller.ts` | delete |
| D2 | `apps/…/features/tasks/providers/TaskWorkingSectionsProvider.tsx` | delete |
| D3 | `apps/…/features/tasks/components/TaskWorkingSectionsStepList.tsx` | delete |
| D4 | `apps/…/pages/tasks/TaskWorkingSectionsSlidePage.tsx` | delete |
| D5 | `apps/…/pages/tasks/TaskWorkingSectionsDiscardChangesSheetPage.tsx` | delete |
| D6–D11 | App API + action files listed in Step 15 | delete |

---

## Risks and mitigations

- Risk: `useGetTaskQuery` or the step API functions are used elsewhere in the app. After moving them to the package, remaining app callers would break.
  Mitigation: Step 1 greps for all callers before deleting. Any caller outside the migrated files must be updated to import from `@beyo/tasks`.

- Risk: `humanizeSnakeCase` imported from `@beyo/tasks` inside the package creates a circular import.
  Mitigation: Step 5 explicitly redirects this import to the relative `../lib/task-detail` path, which is the actual source.

- Risk: Lazy loading — if `@beyo/tasks` is already in the eager bundle, the `import("@beyo/tasks")` in the page loaders will not create a new code-split chunk.
  Mitigation: This is an acceptable trade-off for this migration; the surface pages will be included with the tasks bundle. If bundle size becomes a concern later, sub-path exports can be added to the tasks `package.json`.

- Risk: `surfaceOpeners.preloadWorkerPickerSurface` is `undefined` if the app omits it.
  Mitigation: `usePreloadSurface` receives a no-op fallback: `surfaceOpeners?.preloadWorkerPickerSurface ?? (() => {})`. The working sections slide still opens; the worker picker surface just won't be pre-fetched.

- Risk: The app controller that opens the slide is not immediately identifiable.
  Mitigation: Step 13 provides an exact grep command to locate it before making changes.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test: open working sections slide from task detail → sections display → toggle a section → "Save & Close" saves and closes → close with unsaved changes → discard sheet appears

## Review log

— (none yet)

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
