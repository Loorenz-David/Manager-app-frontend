# PLAN_task_working_sections_to_package_20260627

## Metadata

- Plan ID: `PLAN_task_working_sections_to_package_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T10:00:16Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Extract the `TaskWorkingSections` feature from the `@beyo/tasks` package into a new dedicated `@beyo/task-working-sections` package, then update the managers app to consume it from the new package location.
- Business/user intent: Centralise all working-section-step management logic (controller, provider, components, pages) in a single named package so it can be consumed by any app (managers today, potentially workers in future) without that logic living inside the broad `@beyo/tasks` package.
- Non-goals: No new UI behaviour, no API changes, no new surface IDs, no worker app wiring.

## Scope

- In scope:
  - New package `packages/task-working-sections/` with `package.json`, `tsconfig.json`, and `src/`
  - Move 5 source files from `@beyo/tasks` into the new package, updating cross-package imports
  - Strip working-sections surface IDs / types out of `packages/tasks/src/surface-ids.ts` and re-home them in the new package
  - Remove moved exports from `packages/tasks/src/index.ts`
  - Delete the 5 source files that were moved from `@beyo/tasks`
  - Update managers app `package.json` + `index.css` + two feature files to import from `@beyo/task-working-sections`
- Out of scope:
  - Workers app wiring (no working-sections slide exists there)
  - Changes to the `@beyo/working-sections` package
  - Any changes to the working-sections field component (`TaskWorkingSectionsField`) — it stays in `@beyo/tasks`
  - New tests or Playwright changes (existing `data-testid` values are unchanged; existing spec exercises the same surface via managers app, which still registers it)
- Assumptions:
  - `@beyo/task-working-sections` peer-depends on `@beyo/tasks` (for types, action hooks, query hook, `humanizeSnakeCase`). No circular dependency arises because `@beyo/tasks` will no longer export or import from `@beyo/task-working-sections`.
  - The managers app is the only consumer of the moved pages/components.

## Clarifications required

_(none — scope is fully defined)_

## Acceptance criteria

1. `npm run typecheck` passes with zero errors in both `packages/tasks` and `apps/managers-app`.
2. `npm run build` in managers app succeeds.
3. The following are no longer exported from `@beyo/tasks`: `TaskWorkingSectionsSlidePage`, `TaskWorkingSectionsDiscardChangesSheetPage`, `TaskWorkingSectionsStepList`, `TaskWorkingSectionsProvider`, `useTaskWorkingSectionsContext`, `useTaskWorkingSectionsController`, `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID`, `TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID`, and the working-sections surface prop types.
4. All of the above are exported from `@beyo/task-working-sections`.
5. Managers app `surfaces.ts` lazy-imports `TaskWorkingSectionsSlidePage` and `TaskWorkingSectionsDiscardChangesSheetPage` from `@beyo/task-working-sections`.
6. Managers app `use-task-detail.flow.ts` imports working-sections surface IDs and types from `@beyo/task-working-sections`.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: primary authority — §2 workspace setup, §3 package.json template, §4 peer dependency rules, §5 tsconfig template, §6 consuming-app wiring (package.json + index.css `@source`), §8 package directory structure, §9 migration cycle, §10 what does not belong in packages, §11 naming conventions, §13 packages-and-app-surfaces pattern (`surfaceOpeners` injection)
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface types (`slide`, `sheet`), `lazyWithPreload` registration, `useSurfaceProps` usage
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` utility, `usePreloadSurface`, lazy import pattern for package pages
- `architecture/23_providers.md`: context shell structure for the provider
- `architecture/15_feature_structure.md` + `15_feature_structure_local.md`: folder layout (controllers/, providers/, components/, pages/, surface-ids.ts, index.ts)

### Local extensions loaded

- `architecture/28_surfaces_local.md`: confirms active surface types are `slide` and `sheet` only
- `architecture/30_dynamic_loading_local.md`: confirms `lazyWithPreload` path is `@beyo/ui`, `usePreloadSurface` is in `@beyo/hooks`
- `architecture/15_feature_structure_local.md`: confirms `surface-ids.ts` is a sibling of `index.ts` at package root

### File read intent — pattern vs. relational

Permitted reads performed (relational — understanding what exists):
- `packages/tasks/src/surface-ids.ts` — field names and type shapes being moved
- `packages/tasks/src/controllers/use-task-working-sections.controller.ts` — cross-package import targets
- `packages/tasks/src/providers/TaskWorkingSectionsProvider.tsx` — import paths needing update
- `packages/tasks/src/components/TaskWorkingSectionsStepList.tsx` — import paths needing update
- `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx` — import paths needing update
- `packages/tasks/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx` — import paths needing update
- `packages/tasks/src/index.ts` — exports being stripped
- `apps/managers-app/.../features/tasks/surfaces.ts` — lazy-import lines and re-export lines needing update
- `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts` — import lines needing update
- `apps/managers-app/ManagerBeyo-app-managers/package.json` — existing dependencies
- `apps/managers-app/ManagerBeyo-app-managers/src/index.css` — existing `@source` lines
- `packages/tasks/package.json` — existing peer deps (reference for new package's peer deps)
- `packages/working-sections/package.json` — peer deps shape reference
- `packages/working-sections/src/index.ts` — what `@beyo/working-sections` exports (WorkingSectionOption, WorkingSectionMember, useWorkingSectionPickerFlow, DEFAULT_WORKING_SECTION_SHORTCUTS)

Prohibited (pattern reads — skipped):
- No other controller, provider, or action hook read as structural templates (contracts cover those).

### Skill selection

- Primary skill: `skills/package-migration/SKILL.md` (if present); otherwise `35_shared_packages.md §9` migration cycle is the authority.
- Trigger terms: `surfaceOpeners`, `lazyWithPreload`, `package migration`
- Excluded alternatives: none

## Implementation plan

All file paths are relative to `frontend/`.

---

### Phase 1 — Create the new package

**Step 1 — `packages/task-working-sections/package.json`** (new file)

```json
{
  "name": "@beyo/task-working-sections",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/hooks": "*",
    "@beyo/lib": "*",
    "@beyo/tasks": "*",
    "@beyo/ui": "*",
    "@beyo/working-sections": "*",
    "react": ">=19.0.0"
  }
}
```

**Step 2 — `packages/task-working-sections/tsconfig.json`** (new file)

Use the standard package tsconfig from contract §5 verbatim (target es2023, lib ES2023+DOM, moduleResolution bundler, noEmit true, jsx react-jsx, strict true, include src).

---

**Step 3 — `packages/task-working-sections/src/surface-ids.ts`** (new file)

Move the following out of `packages/tasks/src/surface-ids.ts` into this new file, with no changes to values or type shapes:

- `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID = "task-working-sections-slide"`
- `TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID = "task-working-sections-discard-changes"`
- `RecoveredPendingAdd` type
- `RecoveredPendingReassignment` type
- `TaskWorkingSectionsDiscardChangesSurfaceProps` type
- `TaskWorkingSectionsSurfaceOpeners` type (references `TaskWorkingSectionsSurfaceProps` — both live in this file, self-referential within the same module)
- `TaskWorkingSectionsSurfaceProps` type

No imports are needed (all types are pure TS, no runtime imports).

---

**Step 4 — `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts`** (new file)

Copy the full content of `packages/tasks/src/controllers/use-task-working-sections.controller.ts` and update only the import paths:

| Old relative import | New cross-package import |
|---|---|
| `"../lib/task-detail"` (humanizeSnakeCase) | `"@beyo/tasks"` |
| `"../actions/use-add-task-step"` (useAddTaskStep, AddTaskStepVariables) | `"@beyo/tasks"` |
| `"../actions/use-remove-task-step"` (useRemoveTaskStep) | `"@beyo/tasks"` |
| `"../api/use-get-task-query"` (useGetTaskQuery) | `"@beyo/tasks"` |
| `"../types"` (TaskDetailRaw) | `"@beyo/tasks"` |
| `"../surface-ids"` (RecoveredPendingAdd, RecoveredPendingReassignment, TaskWorkingSectionsSurfaceOpeners, TaskWorkingSectionsSurfaceProps) | `"../surface-ids"` (same package, now local) |

All other imports (`react`, `@beyo/lib`, `@beyo/working-sections`) are already cross-package — no change needed.

---

**Step 5 — `packages/task-working-sections/src/providers/TaskWorkingSectionsProvider.tsx`** (new file)

Copy `packages/tasks/src/providers/TaskWorkingSectionsProvider.tsx` and update import paths:

| Old relative import | New import |
|---|---|
| `"../controllers/use-task-working-sections.controller"` | `"../controllers/use-task-working-sections.controller"` (unchanged — same relative path within new package) |
| `"../surface-ids"` | `"../surface-ids"` (unchanged — same relative path within new package) |

No functional changes.

---

**Step 6 — `packages/task-working-sections/src/components/TaskWorkingSectionsStepList.tsx`** (new file)

Copy `packages/tasks/src/components/TaskWorkingSectionsStepList.tsx` and update:

| Old relative import | New import |
|---|---|
| `"../providers/TaskWorkingSectionsProvider"` | `"../providers/TaskWorkingSectionsProvider"` (unchanged — same relative path) |

All other imports (`@beyo/ui`, `@beyo/lib`) are cross-package — unchanged.

---

**Step 7 — `packages/task-working-sections/src/pages/TaskWorkingSectionsSlidePage.tsx`** (new file)

Copy `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx` and update:

| Old relative import | New import |
|---|---|
| `"../components/TaskWorkingSectionsStepList"` | `"../components/TaskWorkingSectionsStepList"` (unchanged) |
| `"../providers/TaskWorkingSectionsProvider"` | `"../providers/TaskWorkingSectionsProvider"` (unchanged) |
| `"../surface-ids"` | `"../surface-ids"` (unchanged — now local) |

All other imports (`@beyo/lib`, `@beyo/hooks`, `@beyo/ui`, `@beyo/working-sections`) are cross-package — unchanged.

---

**Step 8 — `packages/task-working-sections/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx`** (new file)

Copy `packages/tasks/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx` and update:

| Old relative import | New import |
|---|---|
| `"../surface-ids"` | `"../surface-ids"` (unchanged — now local) |

---

**Step 9 — `packages/task-working-sections/src/index.ts`** (new file)

```ts
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

export { useTaskWorkingSectionsController } from "./controllers/use-task-working-sections.controller";
export type {
  TaskWorkingSectionsController,
  TaskWorkingSectionEntry,
} from "./controllers/use-task-working-sections.controller";

export {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "./providers/TaskWorkingSectionsProvider";

export { TaskWorkingSectionsStepList } from "./components/TaskWorkingSectionsStepList";

export { TaskWorkingSectionsSlidePage } from "./pages/TaskWorkingSectionsSlidePage";
export { TaskWorkingSectionsDiscardChangesSheetPage } from "./pages/TaskWorkingSectionsDiscardChangesSheetPage";
```

---

### Phase 2 — Strip moved items from `@beyo/tasks`

**Step 10 — Update `packages/tasks/src/surface-ids.ts`**

Remove the following block (lines that define the working-sections items):
- `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID`
- `TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID`
- `RecoveredPendingAdd` type
- `RecoveredPendingReassignment` type
- `TaskWorkingSectionsDiscardChangesSurfaceProps` type
- `TaskWorkingSectionsSurfaceOpeners` type
- `TaskWorkingSectionsSurfaceProps` type

Retain:
- `TASK_READY_BY_AT_SHEET_SURFACE_ID`
- `TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID`
- `TaskReadyByAtSheetSurfaceProps`
- `TaskScheduledDeliverySheetSurfaceProps`

---

**Step 11 — Update `packages/tasks/src/index.ts`**

Remove the following export blocks entirely:

```ts
// Remove these surface-ids exports:
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

// Remove controller export:
export { useTaskWorkingSectionsController } from "./controllers/use-task-working-sections.controller";
export type {
  TaskWorkingSectionsController,
  TaskWorkingSectionEntry,
} from "./controllers/use-task-working-sections.controller";

// Remove provider exports:
export {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "./providers/TaskWorkingSectionsProvider";

// Remove component export:
export { TaskWorkingSectionsStepList } from "./components/TaskWorkingSectionsStepList";

// Remove page exports:
export { TaskWorkingSectionsSlidePage } from "./pages/TaskWorkingSectionsSlidePage";
export { TaskWorkingSectionsDiscardChangesSheetPage } from "./pages/TaskWorkingSectionsDiscardChangesSheetPage";
```

Retain all other exports (types, api, actions, lib, detail components, field components, pages for ready-by-at and scheduled delivery).

---

**Step 12 — Delete the 5 source files from `@beyo/tasks`**

- `packages/tasks/src/controllers/use-task-working-sections.controller.ts`
- `packages/tasks/src/providers/TaskWorkingSectionsProvider.tsx`
- `packages/tasks/src/components/TaskWorkingSectionsStepList.tsx`
- `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx`
- `packages/tasks/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx`

---

### Phase 3 — Wire managers app

**Step 13 — `apps/managers-app/ManagerBeyo-app-managers/package.json`**

Add `"@beyo/task-working-sections": "*"` to the `"dependencies"` block (alongside the existing `@beyo/*` entries).

---

**Step 14 — `apps/managers-app/ManagerBeyo-app-managers/src/index.css`**

Add one `@source` directive after the existing `@beyo/tasks` entry:

```css
@source "../../../../packages/task-working-sections/src";
```

(The package contains `.tsx` files with Tailwind `className` props — it must be registered per contract §6 Step 4.)

---

**Step 15 — `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`**

Three changes:

1. Split the existing `import { ..., TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID } from "@beyo/tasks"` into two imports:

```ts
// Keep in @beyo/tasks:
import {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
} from "@beyo/tasks";
// Move to @beyo/task-working-sections:
import {
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
} from "@beyo/task-working-sections";
```

2. Update the two lazy-import loader functions:

```ts
// Before:
function loadTaskWorkingSectionsSlidePage() {
  return import("@beyo/tasks").then((module) => ({
    default: module.TaskWorkingSectionsSlidePage,
  }));
}

function loadTaskWorkingSectionsDiscardChangesSheetPage() {
  return import("@beyo/tasks").then((module) => ({
    default: module.TaskWorkingSectionsDiscardChangesSheetPage,
  }));
}

// After:
function loadTaskWorkingSectionsSlidePage() {
  return import("@beyo/task-working-sections").then((module) => ({
    default: module.TaskWorkingSectionsSlidePage,
  }));
}

function loadTaskWorkingSectionsDiscardChangesSheetPage() {
  return import("@beyo/task-working-sections").then((module) => ({
    default: module.TaskWorkingSectionsDiscardChangesSheetPage,
  }));
}
```

3. Update the re-export block at the bottom of `surfaces.ts`:

```ts
// Before (single source):
export {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
} from "@beyo/tasks";
export type {
  TaskReadyByAtSheetSurfaceProps,
  TaskScheduledDeliverySheetSurfaceProps,
  TaskWorkingSectionsSurfaceProps,
  TaskWorkingSectionsDiscardChangesSurfaceProps,
} from "@beyo/tasks";

// After (split sources):
export {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
} from "@beyo/tasks";
export {
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
} from "@beyo/task-working-sections";
export type {
  TaskReadyByAtSheetSurfaceProps,
  TaskScheduledDeliverySheetSurfaceProps,
} from "@beyo/tasks";
export type {
  TaskWorkingSectionsSurfaceProps,
  TaskWorkingSectionsDiscardChangesSurfaceProps,
} from "@beyo/task-working-sections";
```

---

**Step 16 — `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-task-detail.flow.ts`**

The file currently imports from `@beyo/tasks`:

```ts
import {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  type TaskWorkingSectionsSurfaceOpeners,
  type TaskWorkingSectionsSurfaceProps,
} from "@beyo/tasks";
```

Split into two imports:

```ts
import {
  TASK_READY_BY_AT_SHEET_SURFACE_ID,
  TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID,
} from "@beyo/tasks";
import {
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  type TaskWorkingSectionsSurfaceOpeners,
  type TaskWorkingSectionsSurfaceProps,
} from "@beyo/task-working-sections";
```

No other changes to this file.

---

### Phase 4 — Install and verify

**Step 17 — Run `npm install` from `frontend/`**

This re-links workspace symlinks so `node_modules/@beyo/task-working-sections` resolves to `packages/task-working-sections`.

**Step 18 — Run `npm run typecheck` in both packages/tasks and apps/managers-app**

Zero errors expected.

**Step 19 — Run `npm run build` in managers app**

Build must succeed; no missing module references.

---

## File change summary

| File | Action |
|---|---|
| `packages/task-working-sections/package.json` | **CREATE** |
| `packages/task-working-sections/tsconfig.json` | **CREATE** |
| `packages/task-working-sections/src/surface-ids.ts` | **CREATE** (moved from tasks) |
| `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` | **CREATE** (moved, imports updated) |
| `packages/task-working-sections/src/providers/TaskWorkingSectionsProvider.tsx` | **CREATE** (moved, imports unchanged) |
| `packages/task-working-sections/src/components/TaskWorkingSectionsStepList.tsx` | **CREATE** (moved, imports unchanged) |
| `packages/task-working-sections/src/pages/TaskWorkingSectionsSlidePage.tsx` | **CREATE** (moved, imports unchanged) |
| `packages/task-working-sections/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx` | **CREATE** (moved, imports unchanged) |
| `packages/task-working-sections/src/index.ts` | **CREATE** |
| `packages/tasks/src/surface-ids.ts` | **MODIFY** — strip working-sections block |
| `packages/tasks/src/index.ts` | **MODIFY** — strip working-sections exports |
| `packages/tasks/src/controllers/use-task-working-sections.controller.ts` | **DELETE** |
| `packages/tasks/src/providers/TaskWorkingSectionsProvider.tsx` | **DELETE** |
| `packages/tasks/src/components/TaskWorkingSectionsStepList.tsx` | **DELETE** |
| `packages/tasks/src/pages/TaskWorkingSectionsSlidePage.tsx` | **DELETE** |
| `packages/tasks/src/pages/TaskWorkingSectionsDiscardChangesSheetPage.tsx` | **DELETE** |
| `apps/managers-app/ManagerBeyo-app-managers/package.json` | **MODIFY** — add `@beyo/task-working-sections` dependency |
| `apps/managers-app/ManagerBeyo-app-managers/src/index.css` | **MODIFY** — add `@source` directive |
| `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts` | **MODIFY** — split imports + update lazy loaders + update re-exports |
| `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-task-detail.flow.ts` | **MODIFY** — split imports |

**Total: 9 created · 6 modified · 5 deleted = 20 files**

---

## Risks and mitigations

- Risk: `@beyo/tasks` has other imports inside the package that reference the deleted files via relative paths.
  Mitigation: Only `TaskWorkingSectionsField` in `components/detail/TaskWorkingSectionsField.tsx` touches working-sections — it calls `openWorkingSectionsSlide` via the task detail flow (not the provider directly). No other file in `packages/tasks/src/` imports from the 5 deleted files except `packages/tasks/src/index.ts` which is updated in Step 11.

- Risk: Tailwind class names in the new package not being picked up.
  Mitigation: Step 14 adds the `@source` directive. All Tailwind classes in the moved files already exist in `packages/tasks/src` which is already registered — so even before Step 14 lands, there are no new class names introduced.

- Risk: Circular dependency (`@beyo/tasks` → `@beyo/task-working-sections` → `@beyo/tasks`).
  Mitigation: After Step 11, `@beyo/tasks` no longer imports from `@beyo/task-working-sections` at all. The dependency is one-directional: `@beyo/task-working-sections` → `@beyo/tasks`.

- Risk: Managers app still imports working-sections types from `@beyo/tasks` somewhere other than the two files updated in Steps 15–16.
  Mitigation: Pre-execution grep for `TASK_WORKING_SECTIONS` and `TaskWorkingSections` across all managers-app source files to find any remaining references before beginning edits.

## Validation plan

- `npm run typecheck` from `apps/managers-app/ManagerBeyo-app-managers/`: zero TypeScript errors
- `npm run typecheck` from `packages/tasks/`: zero TypeScript errors
- `npm run build` from `apps/managers-app/ManagerBeyo-app-managers/`: build succeeds
- `npx playwright test --grep "working-sections" --project=mobile`: existing spec passes unchanged (surface IDs and `data-testid` values are unchanged)

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
