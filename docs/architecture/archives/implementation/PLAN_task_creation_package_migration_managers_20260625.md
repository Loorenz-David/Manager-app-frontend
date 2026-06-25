# PLAN_task_creation_package_migration_managers_20260625

## Metadata

- Plan ID: `PLAN_task_creation_package_migration_managers_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T09:58:10Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Migrate the managers app off its local `src/features/task-creation/` implementation and onto the `@beyo/task-creation` shared package that already exists at `packages/task-creation/`.
- Business/user intent: The package was already built and is self-contained (has its own pages, provider, form content, surfaces, and lib). The managers app still has a duplicated local copy. This migration removes the duplication, makes the managers app a pure consumer of the package, and frees future changes to live in a single place.
- Non-goals: Changes to the package itself. Changes to the workers app. Adding new task creation surfaces. Restructuring the surface registry beyond the one import change.

## Scope

- In scope:
  - Adding `@beyo/task-creation` to managers app `package.json`
  - Adding the `@source` directive to `src/index.css`
  - Relocating `TaskCreationFab.tsx` to `src/features/tasks/components/` with updated imports
  - Updating `surface-registry.ts` to import `taskCreationSurfaces` from the package
  - Updating `TasksPage.tsx` import path for `TaskCreationFab`
  - Deleting the entire `src/features/task-creation/` directory
  - Deleting the entire `src/pages/task-creation/` directory
- Out of scope:
  - Any changes to `packages/task-creation/`
  - Changes to the workers app
  - Removing now-redundant sub-surface spreads in `surface-registry.ts` (e.g. `phoneInputSurfaces`, `workingSectionSurfaces` — already included inside the package's `taskCreationSurfaces`; leaving duplicates is safe and not a bug)
- Assumptions:
  - The package is fully functional and passes typecheck independently
  - `SurfaceRegistrations` from `@/providers/SurfaceProvider` and `SurfaceRegistrations` from `@beyo/ui` are structurally identical — TypeScript structural typing will accept the package's typed export inside the annotated registry. If a mismatch is reported during typecheck, change the type import in `surface-registry.ts` to `@beyo/ui`.
  - `usePreloadSurface` imported via `@/hooks/use-preload-surface` in the FAB is a local alias that continues to work unchanged after the FAB is relocated within the managers app.

## Clarifications required

_None. All consumer points are identified and changes are deterministic._

## Acceptance criteria

1. `npm run typecheck` in the managers app reports zero TypeScript errors.
2. `src/features/task-creation/` no longer exists.
3. `src/pages/task-creation/` no longer exists.
4. `"@beyo/task-creation": "*"` appears in the managers app `package.json` dependencies.
5. `src/index.css` includes `@source "../../../../packages/task-creation/src"`.
6. `surface-registry.ts` imports `taskCreationSurfaces` from `@beyo/task-creation`.
7. `TasksPage.tsx` imports `TaskCreationFab` from `@/features/tasks/components/TaskCreationFab`.
8. `src/features/tasks/components/TaskCreationFab.tsx` exists and imports surface IDs and preload functions from `@beyo/task-creation`.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: Primary authority for package consumption pattern (§6 how consuming apps reference packages, §9 migration cycle Step 5, §4 dependency classification, §13 surfaces and openers pattern)
- `architecture/28_surfaces.md`: Surface registration pattern (how `taskCreationSurfaces` is spread into the app registry)
- `architecture/30_dynamic_loading.md`: `lazyWithPreload` pattern used by the package's internal `surfaces.ts`

### Local extensions loaded

- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` path is `@beyo/ui/src/lib/lazy-with-preload` — confirmed the package already uses this correctly

### File read intent — pattern vs. relational

Permitted reads performed during planning:
- `packages/task-creation/src/index.ts` — to establish the exact public export surface of the package
- `packages/task-creation/src/surfaces.ts` — to confirm the package is self-contained (own pages, own surface IDs)
- `src/features/task-creation/index.ts` — to identify what the local feature exports to consumers
- `src/features/task-creation/surfaces.ts` — to confirm local surfaces point to local pages (both are being deleted)
- `src/features/task-creation/components/TaskCreationFab.tsx` — relational: to understand exactly which imports need updating and that the component logic itself is unchanged
- `src/app/surface-registry.ts` — relational: to identify the exact import line to replace
- `src/pages/tasks/TasksPage.tsx` — relational: to identify the exact import line to replace
- `src/index.css` — relational: to see existing `@source` directives and determine correct insertion point

### Skill selection

- Primary skill: `35_shared_packages.md §9` (migration cycle Step 5 — the workers app already validated the package; this is the managers app migration step)
- Trigger terms: `package migration`, `consuming app`, `@source directive`, `workspace dependency`

## Implementation plan

### Step 1 — Add package dependency

File: `apps/managers-app/ManagerBeyo-app-managers/package.json`

In the `"dependencies"` block, add after `@beyo/auth`:

```json
"@beyo/task-creation": "*",
```

The full dependencies block (after adding) must have `@beyo/task-creation` alongside the other `@beyo/*` entries. Order alphabetically with the other `@beyo/*` packages: after `@beyo/auth`, before `@beyo/cases`.

### Step 2 — Run npm install

From the monorepo root:

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

Verify that `node_modules/@beyo/task-creation` is a symlink pointing to `../../packages/task-creation`. If not, re-run `npm install` from the root.

### Step 3 — Add @source directive

File: `apps/managers-app/ManagerBeyo-app-managers/src/index.css`

After the last existing `@source` line (currently `@source "../../../../packages/notifications/src"`), add:

```css
@source "../../../../packages/task-creation/src";
```

The package contains `.tsx` files with Tailwind `className` strings, so this directive is required. Omitting it causes silent styling failures.

### Step 4 — Create TaskCreationFab in tasks feature

Create file: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskCreationFab.tsx`

This is a verbatim copy of the current `src/features/task-creation/components/TaskCreationFab.tsx` with one change: replace the relative `../surfaces` import with `@beyo/task-creation`.

**Before (relative import to delete):**
```ts
import {
  TASK_CREATION_INTERNAL_SURFACE_ID,
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
  TASK_CREATION_RETURN_SURFACE_ID,
  preloadInternalTaskSlideSurface,
  preloadPreOrderTaskSlideSurface,
  preloadReturnTaskSlideSurface,
} from "../surfaces";
```

**After (package import):**
```ts
import {
  TASK_CREATION_INTERNAL_SURFACE_ID,
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
  TASK_CREATION_RETURN_SURFACE_ID,
  preloadInternalTaskSlideSurface,
  preloadPreOrderTaskSlideSurface,
  preloadReturnTaskSlideSurface,
} from "@beyo/task-creation";
```

All other imports (`framer-motion`, `lucide-react`, `@beyo/scanner`, `@/hooks/use-preload-surface`, `@/lib/utils`, `@/providers/SurfaceProvider`) remain unchanged. The component body is identical.

### Step 5 — Update TasksPage import

File: `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TasksPage.tsx`

Change:
```ts
import { TaskCreationFab } from '@/features/task-creation';
```

To:
```ts
import { TaskCreationFab } from '@/features/tasks/components/TaskCreationFab';
```

No other changes to this file.

### Step 6 — Update surface-registry.ts

File: `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`

Change:
```ts
import { taskCreationSurfaces } from "@/features/task-creation";
```

To:
```ts
import { taskCreationSurfaces } from "@beyo/task-creation";
```

No other changes. The type annotation `SurfaceRegistrations` on `surfaceRegistry` remains imported from `@/providers/SurfaceProvider`. If `npm run typecheck` reports a structural incompatibility on `surfaceRegistry`, change that type import to:
```ts
import type { SurfaceRegistrations } from "@beyo/ui";
```

### Step 7 — Delete src/features/task-creation/

Delete the following files (all files in the directory):

```
src/features/task-creation/index.ts
src/features/task-creation/types.ts
src/features/task-creation/surfaces.ts
src/features/task-creation/components/InternalFormContent.tsx
src/features/task-creation/components/PreOrderFormContent.tsx
src/features/task-creation/components/ReturnFormContent.tsx
src/features/task-creation/components/TaskCreationAssignmentFooter.tsx
src/features/task-creation/components/TaskCreationFab.tsx
src/features/task-creation/lib/normalize-task-form-payload.ts
src/features/task-creation/lib/prefetch-task-creation-form-data.ts
src/features/task-creation/lib/item-lookup-prefill.ts
src/features/task-creation/providers/TaskCreationFormProvider.tsx
```

Then remove the empty directory tree: `src/features/task-creation/`.

### Step 8 — Delete src/pages/task-creation/

Delete the following files:

```
src/pages/task-creation/InternalTaskSlidePage.tsx
src/pages/task-creation/ReturnTaskSlidePage.tsx
src/pages/task-creation/PreOrderTaskSlidePage.tsx
```

Then remove the empty directory: `src/pages/task-creation/`.

These pages are now provided internally by the package's own `pages/` directory, lazily loaded through the package's `surfaces.ts`.

### Step 9 — Typecheck

From the managers app directory:

```bash
npm run typecheck
```

Expected: zero errors. If errors appear, see the troubleshooting notes below.

## Troubleshooting

**Error: Cannot find module `@beyo/task-creation`**
→ npm install was not run from the `frontend/` root. Run it again from there.

**Error: `SurfaceRegistrations` type mismatch in `surface-registry.ts`**
→ The local `SurfaceProvider` type and the `@beyo/ui` type are not structurally identical. Fix: change the type import in `surface-registry.ts` to `import type { SurfaceRegistrations } from "@beyo/ui"`.

**Error: Cannot find `usePreloadSurface` or `useSurfaceStore` in `TaskCreationFab.tsx`**
→ These come from `@/hooks/use-preload-surface` and `@/providers/SurfaceProvider` — both are local imports that do not change. Verify the file was written to `src/features/tasks/components/TaskCreationFab.tsx` and that the other local imports were preserved verbatim.

**Error: Cannot find module `@/features/task-creation`**
→ A file still imports from the deleted local feature. Search for remaining references: `grep -r "features/task-creation" src/`. Fix each remaining reference by pointing it to `@beyo/task-creation` or `@/features/tasks/components/TaskCreationFab`.

## Risks and mitigations

- Risk: `taskCreationSurfaces` from the package internally spreads `phoneInputSurfaces`, `itemCategoryPickerSurfaces`, `upholsterySurfaces`, and `workingSectionSurfaces`. These are also spread separately in `surface-registry.ts`. The same surface IDs will be registered twice (later spread wins, same value).
  Mitigation: This is safe — duplicate spread of equal values has no runtime effect. No action required.

- Risk: Tailwind class names in `@beyo/task-creation` are not picked up, causing unstyled form components.
  Mitigation: Step 3 adds the required `@source` directive. Verify it is present after the change.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test: open the managers app, tap the FAB, confirm all three surfaces (return, pre-order, internal) open correctly
- Manual smoke test: complete a return task creation form end-to-end

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
