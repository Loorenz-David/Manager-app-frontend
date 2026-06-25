# PLAN_tasks_detail_components_to_package_20260625

## Metadata

- Plan ID: `PLAN_tasks_detail_components_to_package_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T11:01:10Z`
- Related issue/ticket: —
- Series: Part of the ongoing managers app → packages migration series. Follows `PLAN_tasks_field_components_package_migration_20260625`.

## Goal and intent

- Goal: Move the 8 task detail view components from the managers app's local `src/features/tasks/components/detail/` into `@beyo/tasks`, together with their two shared dependencies (`lib/task-detail.ts` and `api/task-keys.ts`) and the missing task enum types.
- Business/user intent: The detail components are view components with no app-specific logic. Their app-coupling comes only from the `TaskDetailController` context, which is an inferred local type. Decoupling by converting from context-readers to props-receivers makes the components genuinely portable.
- Non-goals: Moving the controller, action hooks, API hooks, flows, or `TaskDetailProvider` to the package — those remain local to the managers app. Moving `TaskDetailSlidePage.tsx`. Modifying `@beyo/tasks` peer dependencies beyond what the new files require.

## Architecture decision: props-based components

The 8 detail components currently read from `TaskDetailContext` via `useTaskDetailContext()`. The `TaskDetailController` type is `ReturnType<typeof useTaskDetailController>` — an inferred type that depends on local action hooks and cannot be defined in a package without pulling the entire controller chain in.

**Resolution:** Refactor the 8 components from context-readers to props-receivers. Each component declares an explicit props interface covering only the data and callbacks it needs. `TaskDetailSlidePage.tsx` remains in the managers app and is the single location that calls `useTaskDetailContext()` and fans the data out as props to each component.

This follows the same principle as contract 35 §13 (packages receive injected values, never import from app-level registries).

## Scope

- In scope:
  - Extending `packages/tasks/src/types.ts` with missing task enums and types used by `lib/task-detail.ts`
  - Creating `packages/tasks/src/api/task-keys.ts`
  - Creating `packages/tasks/src/lib/task-detail.ts`
  - Creating `packages/tasks/src/components/detail/` (8 components + 2 tests + `index.ts`), refactored to props-based
  - Updating `packages/tasks/src/index.ts` to export all new items
  - Converting `src/features/tasks/api/task-keys.ts` in the managers app to a thin re-export
  - Deleting `src/features/tasks/lib/task-detail.ts` and updating its 3 local consumers to import from `@beyo/tasks`
  - Deleting `src/features/tasks/components/detail/` directory from the managers app
  - Updating `TaskDetailSlidePage.tsx` to pass controller data as props
  - Updating `src/features/tasks/index.ts` to remove detail component re-exports
- Out of scope:
  - `TaskDetailProvider.tsx`, `useTaskDetailController`, action hooks, flows — all stay local
  - Any changes to `TaskListCard.tsx` other than its import of `formatLocalDateYYMMDD`
  - Adding `@source` directive (already in `index.css`)
  - `package.json` changes (already a dependency)

## Clarifications required

_None. The approach and file list are determined._

## Acceptance criteria

1. `npm run typecheck` reports zero TypeScript errors.
2. None of the following local files exist in the managers app after migration:
   - `src/features/tasks/components/detail/TaskDetailHeader.tsx`
   - `src/features/tasks/components/detail/TaskCustomerSection.tsx`
   - `src/features/tasks/components/detail/TaskDetailBottomActions.tsx`
   - `src/features/tasks/components/detail/TaskImagesSection.tsx`
   - `src/features/tasks/components/detail/TaskScheduledDeliverySection.tsx`
   - `src/features/tasks/components/detail/TaskUpholsterySection.tsx`
   - `src/features/tasks/components/detail/TaskWorkingSectionsField.tsx`
   - `src/features/tasks/components/detail/TaskBodyCategoryRow.tsx`
   - `src/features/tasks/lib/task-detail.ts`
3. `src/features/tasks/api/task-keys.ts` is a single-line re-export from `@beyo/tasks`.
4. `TaskDetailSlidePage.tsx` imports all 8 components from `@beyo/tasks` and passes props.
5. `@beyo/tasks` exports all 8 components and all utilities listed in Step 6.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md §2–6, §9`: package creation, consumption, migration cycle (Step 2 = copy into package; Step 5 = migrate app).
- `architecture/35_shared_packages.md §13`: components receive data via props/injection, not by importing from app-level context. This plan implements the props-based equivalent of the surfaceOpeners pattern.
- `architecture/07_components.md`: feature components consume context; package components receive props. After this migration the detail components become package-level components under the `07` rules: props-based, no context coupling.

### File read intent — pattern vs. relational

**Before writing any package component, Codex must perform these relational reads:**

1. Read each of the 8 component files to extract:
   - Which properties they destructure from `useTaskDetailContext()`
   - Which callback functions they call (and their signatures)
   - Which `@/` imports they use (to substitute with `@beyo/*`)

2. Read `src/features/tasks/lib/task-detail.ts` in full to know:
   - All exported functions and their type signatures
   - Which types it imports from `@/features/tasks/types` (to add to the package)
   - Which imports come from `@/components/primitives` (→ `@beyo/ui`) and `@/types/common` (→ `@beyo/lib`)

3. Read `src/features/tasks/api/task-keys.ts` to know the exact function/key structure.

4. Read `src/features/tasks/flows/use-task-detail.flow.ts` to know the shape of `...flow` spread into the controller — specifically which callback properties the detail components call on the flow (e.g. `onEdit`, `onClose`, surface-opening functions).

5. Read `src/features/tasks/types.ts` lines around `TASK_STATE`, `TASK_TYPE`, `TASK_PRIORITY`, `TaskState`, `TaskType`, `TaskPriority`, `TaskReturnMethod` to get their exact definitions for copying to the package.

6. Read `src/pages/tasks/TaskDetailSlidePage.tsx` to understand the current page structure before adding prop-passing.

**Prohibited pattern reads:** Do not read other packages' providers or other controllers to understand the props pattern — `35_shared_packages.md §13` defines it.

### Import substitution map

When creating files in `packages/tasks/src/`, apply these substitutions for all `@/` imports:

| Local import | Package import |
|---|---|
| `@/components/primitives` | `@beyo/ui` |
| `@/components/primitives/date` | `@beyo/ui` |
| `@/hooks/use-surface-header` | `@beyo/hooks` (`useSurfaceHeader`) |
| `@/lib/animation` | `@beyo/lib` |
| `@/lib/utils` | `@beyo/lib` (`cn`) |
| `@/features/items` | `@beyo/items` |
| `@/features/tasks/types` | `./types` (relative within package) |
| `@/types/common` | `@beyo/lib` |
| `../../api/task-keys` | `../api/task-keys` (relative within package) |
| `../../lib/task-detail` | `../lib/task-detail` (relative within package) |
| `../../providers/TaskDetailProvider` | **Remove** — props replace context reads |

## Implementation plan

---

### Step 1 — Read all source files before writing any code

Perform the relational reads listed in the "File read intent" section above. This step is mandatory — do not skip to Step 2 without completing all reads. The reads establish:
- The exact props interface for each component
- The exact types to add to the package
- The exact function signatures to export from `lib/task-detail.ts`

---

### Step 2 — Add missing type exports to packages/tasks/src/types.ts

Read `src/features/tasks/types.ts` and identify the definitions of:
- `TASK_STATE` and `TaskState`
- `TASK_TYPE` and `TaskType`
- `TASK_PRIORITY` and `TaskPriority`
- `TaskReturnMethod` (if used by detail components)

Copy those definitions verbatim into `packages/tasks/src/types.ts`. Then export them from `packages/tasks/src/index.ts` using the same export pattern as the existing types exports.

---

### Step 3 — Create packages/tasks/src/api/task-keys.ts

Copy `src/features/tasks/api/task-keys.ts` to `packages/tasks/src/api/task-keys.ts`.

Apply import substitutions:
- `TaskId` from `@/types/common` → `import type { TaskId } from "@beyo/lib"`
- `ListTasksFullParams` from local tasks types → `import type { ListTasksFullParams } from "../types"` (already in package)

No other changes. Export `taskKeys` from `packages/tasks/src/index.ts`.

---

### Step 4 — Create packages/tasks/src/lib/task-detail.ts

Copy `src/features/tasks/lib/task-detail.ts` to `packages/tasks/src/lib/task-detail.ts`.

Apply import substitutions:
- `StatePillVariant` from `@/components/primitives` → `import type { StatePillVariant } from "@beyo/ui"`
- Task types (`TaskState`, `TaskType`, `TaskPriority`, `TaskReturnSource`, `TaskFlowRecord`, etc.) → `import type { ... } from "../types"` (all now in the package after Step 2)
- `Address` from `@/types/common` → `import type { Address } from "@beyo/lib"`
- `lucide-react` icons — keep as-is (external peer dependency)

Export all public functions from `packages/tasks/src/index.ts`. The exact list is determined in Step 1 by reading the file.

---

### Step 5 — Create packages/tasks/src/components/detail/ (8 components)

For each of the 8 components, perform the following:

**5a. Extract props interface from context reads**

From the relational read of each component (Step 1), identify every property the component destructures from `useTaskDetailContext()`. That becomes its props type.

For callbacks (e.g. `deleteTask.mutate`, `resolveTask.mutate`, `flow.onEdit`), define them as direct function props using the simplest signature the component actually calls:

```ts
// Before (context-based):
const { deleteTask, taskId } = useTaskDetailContext();
// called as: deleteTask.mutate(taskId)

// After (props-based):
type Props = {
  taskId: string;
  onDelete: () => void;
}
// called as: props.onDelete()
```

Mutation props become simple `() => void` or `(input: T) => void` callbacks — do NOT expose the full `UseMutationResult` type. This keeps the interface minimal and app-agnostic.

**5b. Apply import substitutions**

Remove: `import { useTaskDetailContext } from "../../providers/TaskDetailProvider"`
Remove: the `const { ... } = useTaskDetailContext()` call at the top of the component body

Apply the import substitution map from the Contracts section for all remaining `@/` imports.

**5c. Keep test files**

Move `TaskDetailBottomActions.test.tsx` and `TaskWorkingSectionsField.test.tsx` alongside their components in `packages/tasks/src/components/detail/`. Update their imports to match the new file structure and remove any `@/` imports (substitute as above).

**5d. Create index.ts barrel**

`packages/tasks/src/components/detail/index.ts` must re-export all 8 components using named exports (no default exports).

---

### Step 6 — Update packages/tasks/src/index.ts

Add exports for all new items. Follow the existing pattern in the file:

```ts
// New lib export
export { <all public functions> } from "./lib/task-detail";

// New API export
export { taskKeys } from "./api/task-keys";

// New component exports
export {
  TaskBodyCategoryRow,
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskImagesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
  TaskWorkingSectionsField,
} from "./components/detail";

// New type exports (added in Step 2)
export { TASK_STATE, TASK_TYPE, TASK_PRIORITY } from "./types";
export type { TaskState, TaskType, TaskPriority, TaskReturnMethod } from "./types";
```

Export only what was determined in Step 1. Do not export internal implementation details.

---

### Step 7 — Convert managers app task-keys.ts to a re-export

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/task-keys.ts`

Replace the entire file content with:

```ts
export { taskKeys } from "@beyo/tasks";
```

All 13 local consumers of `taskKeys` (action hooks, api hooks, socket events, tests, and the migrated `TaskImagesSection`) continue to work without any changes to their import paths — they import from local `./task-keys` or `@/features/tasks/api/task-keys` which now re-exports from the package. **Do not change any of those 13 consumer files.**

---

### Step 8 — Delete managers app lib/task-detail.ts and update its 3 consumers

**Delete:** `src/features/tasks/lib/task-detail.ts`

**Update 3 consumers** (identified in Step 1 grep) to import from `@beyo/tasks` instead:

1. `src/features/tasks/components/TaskListCard.tsx` — change import of `formatLocalDateYYMMDD`:
   ```ts
   // before
   import { formatLocalDateYYMMDD } from "../lib/task-detail";
   // after
   import { formatLocalDateYYMMDD } from "@beyo/tasks";
   ```

2. `src/features/tasks/controllers/use-task-working-sections.controller.ts` — change import of `humanizeSnakeCase`:
   ```ts
   // before
   import { humanizeSnakeCase } from '@/features/tasks/lib/task-detail';
   // after
   import { humanizeSnakeCase } from "@beyo/tasks";
   ```

3. `src/features/tasks/controllers/use-task-detail.controller.ts` — change import of `getTaskTitle`:
   ```ts
   // before
   import { getTaskTitle } from "../lib/task-detail";
   // after
   import { getTaskTitle } from "@beyo/tasks";
   ```

---

### Step 9 — Delete managers app components/detail/ directory

Delete all files:
```
src/features/tasks/components/detail/TaskBodyCategoryRow.tsx
src/features/tasks/components/detail/TaskCustomerSection.tsx
src/features/tasks/components/detail/TaskDetailBottomActions.tsx
src/features/tasks/components/detail/TaskDetailBottomActions.test.tsx
src/features/tasks/components/detail/TaskDetailHeader.tsx
src/features/tasks/components/detail/TaskImagesSection.tsx
src/features/tasks/components/detail/TaskScheduledDeliverySection.tsx
src/features/tasks/components/detail/TaskUpholsterySection.tsx
src/features/tasks/components/detail/TaskWorkingSectionsField.tsx
src/features/tasks/components/detail/TaskWorkingSectionsField.test.tsx
src/features/tasks/components/detail/index.ts
```

Then remove the now-empty `detail/` directory.

---

### Step 10 — Update TaskDetailSlidePage.tsx

File: `src/pages/tasks/TaskDetailSlidePage.tsx`

**Import change:**
```ts
// before (from local feature)
import {
  TaskBodyCategoryRow,
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskImagesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
  TaskWorkingSectionsField,
} from "@/features/tasks";

// after (from package)
import {
  TaskBodyCategoryRow,
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskImagesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
  TaskWorkingSectionsField,
} from "@beyo/tasks";
```

**Props wiring:**

The page currently renders these components with no props (they pull from context). After migration, it must pass the relevant controller data as props to each component.

Read `src/pages/tasks/TaskDetailSlidePage.tsx` (Step 1 establishes this) to see how the page currently renders each component. Then add the following call and prop spread:

```tsx
// The page still uses the local context for its own data needs
const controller = useTaskDetailContext();
```

For each component, pass exactly the props defined in its Step 5 interface. Use the controller as the data source:

```tsx
<TaskDetailHeader
  taskDetail={controller.taskDetail}
  title={controller.title}
  isPending={controller.isPending}
/>

<TaskDetailBottomActions
  taskId={controller.taskId}
  taskDetail={controller.taskDetail}
  isPending={controller.isPending}
  onDelete={() => controller.deleteTask.mutate(...)}
  onResolve={() => controller.resolveTask.mutate(...)}
  // ...flow callbacks from controller
/>

// etc. — pass each component exactly the props its interface requires
```

The exact prop names and values depend on the interfaces defined in Step 5. The `controller` object provides all of them.

---

### Step 11 — Update src/features/tasks/index.ts

Remove these re-export lines (they now come from `@beyo/tasks`):

```ts
// Remove these lines:
export {
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskImagesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
} from "./components/detail";
```

Note: `TaskBodyCategoryRow` and `TaskWorkingSectionsField` may or may not be in the local `index.ts` — check during Step 1 and remove if present.

All other lines in `index.ts` remain unchanged.

---

### Step 12 — Typecheck

```bash
npm run typecheck
```

Expected: zero errors.

**Common errors and fixes:**

- _Cannot find module `@beyo/tasks` export `X`_: The function or type was not added to `packages/tasks/src/index.ts` in Step 6. Add it.
- _Type `UseMutationResult<...>` is not assignable to `() => void`_: A callback prop was typed as the full mutation object somewhere. The component should accept `() => void` and the page wraps the call in an arrow function.
- _Property `X` does not exist on type `TaskDetailController`_: A flow property was accessed in the page's prop wiring but not available on the controller. Read the flow to confirm the correct property name.
- _`@/` import not found_: A package component still has an unsubstituted `@/` import. Apply the substitution map.

---

## Risks and mitigations

- Risk: `@beyo/items` may not export the specific components or types the detail components import from `@/features/items` (e.g. `ItemCategoryIcon`, `ItemCurrency`).
  Mitigation: Step 1 reads the components to identify exact `@/features/items` imports. Before writing any package component, verify each name is in `packages/items/src/index.ts`. If a name is missing from `@beyo/items`, it must be added to that package first (out of scope for this plan — surface as a blocker if found).

- Risk: `@/lib/animation` constants used in `TaskDetailBottomActions.tsx` may not exist in `@beyo/lib`.
  Mitigation: Step 1 reads the component to identify the exact names imported. Verify they exist in `@beyo/lib`. If not, either inline the constant in the component or add it to `@beyo/lib` first.

- Risk: The flow spread (`...flow`) in the controller includes surface-opening functions that reference local surface IDs. If detail components need to call these, the prop callbacks in the page would call `controller.openSomeSurface()` which is a local function — this is fine because the page stays local.
  Mitigation: Flow callbacks are passed as opaque `() => void` or typed function props. The package component never sees the surface ID; it only calls the callback. This is correct by design.

- Risk: The 13 consumers of `task-keys.ts` use different import styles (`from "./task-keys"`, `from "../api/task-keys"`, `from "@/features/tasks/api/task-keys"`). After Step 7 converts the file to a re-export, all three styles still resolve to the same file and continue to work.
  Mitigation: None needed — the re-export pattern handles all import styles transparently.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Verify deletions: `ls src/features/tasks/components/detail/` — directory must not exist; `ls src/features/tasks/lib/task-detail.ts` — file must not exist
- Verify task-keys re-export: `cat src/features/tasks/api/task-keys.ts` — single line
- Verify no stale `@/` imports in package: `grep -rn "from '@/" packages/tasks/src/components/detail/` — no output
- Verify no stale `from.*lib/task-detail` in managers app src/: `grep -rn "lib/task-detail" apps/managers-app/ManagerBeyo-app-managers/src/` — no output

## Review log

_None yet._

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `david`
