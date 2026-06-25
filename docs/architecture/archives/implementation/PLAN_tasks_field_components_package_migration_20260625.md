# PLAN_tasks_field_components_package_migration_20260625

## Metadata

- Plan ID: `PLAN_tasks_field_components_package_migration_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T10:30:18Z`
- Related issue/ticket: —
- Series note: This is the first plan in an ongoing series. The user is progressively identifying managers app local code that duplicates what already lives in a `@beyo/*` package. Each plan covers one identified batch.

## Goal and intent

- Goal: Remove 6 local duplicate field files from `src/features/tasks/components/fields/` and redirect all consumers to import from `@beyo/tasks`, which already exports the canonical versions.
- Business/user intent: The `@beyo/tasks` package is already a dependency of the managers app. Keeping local copies creates split maintenance — changes to the package are not reflected in the app until the local copy is also updated, and vice versa. The local copies are strictly inferior (they use `@/` path aliases instead of package imports and some embed preload calls that belong at the page level).
- Non-goals: Migrating any non-field exports from the local tasks feature (`TaskDetailProvider`, `TasksView`, `taskSurfaces`, stores, etc.) — those are not yet in any package. Modifying the `@beyo/tasks` package itself. Cleaning up the orphaned local `types.ts` definition of `TaskAdditionalDetailsFieldsSchema` — it is defined in both places and the local one can stay for now.

## Scope

- In scope:
  - Deleting 6 local files (5 field components + 1 internal helper)
  - Removing 5 re-export lines from `src/features/tasks/index.ts`
  - Updating `TestingFormsContent.tsx` to import 5 components + schema from `@beyo/tasks`
  - Updating `TaskScheduledDateSheetPage.tsx` to import 2 fields from `@beyo/tasks`
- Out of scope:
  - `package.json` changes — `@beyo/tasks` is already a dependency
  - `index.css` `@source` changes — `@source "../../../../packages/tasks/src"` is already present
  - Any changes to the `@beyo/tasks` package files
  - Removing `TaskAdditionalDetailsFieldsSchema` from the local `src/features/tasks/index.ts` re-export (harmless, out of scope)

## Clarifications required

_None. All files are identified, all consumers are known._

## Acceptance criteria

1. `npm run typecheck` reports zero TypeScript errors.
2. None of the following files exist:
   - `src/features/tasks/components/fields/TaskAdditionalDetailsField.tsx`
   - `src/features/tasks/components/fields/TaskDeliveryDateField.tsx`
   - `src/features/tasks/components/fields/TaskFulfillmentMethodField.tsx`
   - `src/features/tasks/components/fields/TaskReadyByDateField.tsx`
   - `src/features/tasks/components/fields/TaskReturnSourceField.tsx`
   - `src/features/tasks/components/fields/task-ready-by-quick-select-options.ts`
3. `src/features/tasks/index.ts` no longer re-exports any of the 5 field components.
4. `TestingFormsContent.tsx` imports all 5 field components and `TaskAdditionalDetailsFieldsSchema` from `@beyo/tasks`.
5. `TaskScheduledDateSheetPage.tsx` imports `TaskDeliveryDateField` and `TaskReadyByDateField` from `@beyo/tasks`.
6. No file in `src/` imports from `@/features/tasks/components/fields/*` directly or from `@/features/tasks` for any of the 5 component names.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md §9 Step 5`: managers app migration step — replace local copy with import from `@beyo/<name>`, delete the local source files.
- `architecture/35_shared_packages.md §6`: consuming apps import from the package's public export surface (`@beyo/tasks`), never from internal package paths.

### File read intent — pattern vs. relational

Permitted reads performed during planning:
- `packages/tasks/src/index.ts` — relational: to confirm all 5 field components and `TaskAdditionalDetailsFieldsSchema` are in the package's public API
- `packages/tasks/src/components/fields/TaskReadyByDateField.tsx` and `TaskDeliveryDateField.tsx` — relational: to confirm package versions are self-contained (no local `@/` imports, no `usePreloadSurface` calls embedded — preloading is a page-level concern in the package design)
- `src/features/tasks/index.ts` — relational: to identify exact re-export lines to remove
- `src/features/testing_forms/components/TestingFormsContent.tsx` — relational: to confirm the exact import block shape and all names being moved
- `src/pages/tasks/TaskScheduledDateSheetPage.tsx` — relational: to confirm the exact import line and that it only needs `TaskDeliveryDateField` + `TaskReadyByDateField`
- `src/features/tasks/components/fields/task-ready-by-quick-select-options.ts` — relational: to confirm it is only consumed by the now-deleted `TaskReadyByDateField.tsx`

### Note on preload behaviour after migration

The local `TaskReadyByDateField.tsx` and `TaskDeliveryDateField.tsx` currently contain `usePreloadSurface(...)` calls (after the correction plan fixed their import sources). The package versions of these components do NOT include those calls — preloading calendar surfaces is a page-level responsibility, not a field-level one.

After migration:
- `TaskScheduledDateSheetPage.tsx` already preloads both calendar surfaces at the page level (it calls `usePreloadSurface` for both). Those page-level calls remain and are correct.
- `TestingFormsContent.tsx` loses the implicit preloads that came from inside the local field components. This is acceptable — it is a test form, not a production flow. No explicit preload calls need to be added.

## Implementation plan

### Step 1 — Delete the 6 local field files

Delete these files in `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/`:

```
TaskAdditionalDetailsField.tsx
TaskDeliveryDateField.tsx
TaskFulfillmentMethodField.tsx
TaskReadyByDateField.tsx
TaskReturnSourceField.tsx
task-ready-by-quick-select-options.ts
```

`task-ready-by-quick-select-options.ts` is an internal helper only imported by the local `TaskReadyByDateField.tsx`. With that file deleted, it becomes orphaned.

If the `fields/` directory is now empty, delete the directory itself too.

### Step 2 — Remove 5 re-export lines from src/features/tasks/index.ts

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/index.ts`

Remove these 5 lines (they are the first 5 lines of the file):

```ts
export { TaskAdditionalDetailsField } from "./components/fields/TaskAdditionalDetailsField";
export { TaskDeliveryDateField } from "./components/fields/TaskDeliveryDateField";
export { TaskFulfillmentMethodField } from "./components/fields/TaskFulfillmentMethodField";
export { TaskReadyByDateField } from "./components/fields/TaskReadyByDateField";
export { TaskReturnSourceField } from "./components/fields/TaskReturnSourceField";
```

All other lines in `index.ts` remain unchanged.

### Step 3 — Update TestingFormsContent.tsx

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx`

**Current import block (lines 26–33):**
```ts
import {
  TaskAdditionalDetailsField,
  TaskAdditionalDetailsFieldsSchema,
  TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
  TaskReturnSourceField,
} from "@/features/tasks";
```

**Replace with:**
```ts
import {
  TaskAdditionalDetailsField,
  TaskAdditionalDetailsFieldsSchema,
  TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
  TaskReturnSourceField,
} from "@beyo/tasks";
```

Only the import source changes (`@/features/tasks` → `@beyo/tasks`). All 6 imported names are unchanged. `@beyo/tasks` exports all of them.

No other changes to this file.

### Step 4 — Update TaskScheduledDateSheetPage.tsx

File: `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskScheduledDateSheetPage.tsx`

**Current import line (line 10):**
```ts
import { TaskDeliveryDateField, TaskReadyByDateField } from '@/features/tasks';
```

**Replace with:**
```ts
import { TaskDeliveryDateField, TaskReadyByDateField } from '@beyo/tasks';
```

Only the import source changes. No other changes to this file.

### Step 5 — Typecheck

```bash
npm run typecheck
```

Expected: zero errors.

- `@beyo/tasks` is already a declared dependency in the managers app `package.json` and already has an `@source` directive in `index.css` — no install or CSS changes needed.
- All 6 names imported in Step 3 and both names in Step 4 are confirmed exports of `@beyo/tasks`.

## Risks and mitigations

- Risk: Removing the 5 re-export lines from `index.ts` breaks a consumer not caught by the grep scan.
  Mitigation: `npm run typecheck` will catch any remaining import of these names from `@/features/tasks`. Fix: add the missing consumer to Step 3 or Step 4 with the same `@beyo/tasks` redirect.

- Risk: Package `TaskReadyByDateField` behaves slightly differently (no embedded `usePreloadSurface`) causing the calendar to not open pre-warmed in some flows.
  Mitigation: `TaskScheduledDateSheetPage.tsx` already calls `usePreloadSurface` at the page level for both calendar surfaces — the primary production path is covered. `TestingFormsContent.tsx` loses implicit preloads, which is acceptable for a test form.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Verify no local field files remain: `ls src/features/tasks/components/fields/` — directory should not exist or be empty
- Verify no stale imports: `grep -rn "from '@/features/tasks'" src/ | grep -E "TaskAdditionalDetailsField|TaskDeliveryDateField|TaskFulfillmentMethodField|TaskReadyByDateField|TaskReturnSourceField"` — no output expected

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
