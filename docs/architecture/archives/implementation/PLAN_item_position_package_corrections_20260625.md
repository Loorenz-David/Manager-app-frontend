# PLAN_item_position_package_corrections_20260625

## Metadata

- Plan ID: `PLAN_item_position_package_corrections_20260625`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T18:28:05Z`
- Related issue/ticket: —
- Intention plan: —
- Source review: code review of `PLAN_item_position_pill_and_sheet_package_20260625`

## Goal and intent

- Goal: Fix three post-implementation defects found in the code review of the position pill/sheet package migration.
- Business/user intent: Restore correct lazy loading (bundle size), correct feature layer ownership (maintainability), and eliminate an unnecessary re-export indirection (correctness).
- Non-goals: Any functional or UI change. No new features.

## Scope

- In scope:
  - **Fix A** — Replace eager static import of `ItemPositionSheetPage` with a dynamic import factory in both apps' surface registrations (restores code-split).
  - **Fix B** — Move `use-update-item.ts` from `features/task_steps/actions/` to `features/items/actions/` in the workers app, and update its import site in the controller.
  - **Fix C** — Remove the re-export of `ITEM_POSITION_SHEET_SURFACE_ID` and `ItemPositionSheetSurfaceProps` from workers `surface-ids.ts`. Import the surface ID directly from `@beyo/items` in `surfaces.ts`.

- Out of scope:
  - Any change to package files (`packages/items/`).
  - Any change to the managers `surface-ids.ts` (it does not re-export the package ID).
  - Any functional logic change.

- Assumptions:
  - `lazyWithPreload` only code-splits when the factory function contains a dynamic `import()` call — a static top-level import followed by `async () => ({ default: Component })` provides no bundle split.
  - Creating `features/items/actions/` in the workers app is correct; the workers app already has `features/items/` implicitly via `@beyo/items` usage, but no local `features/items/` directory. Creating it here is valid per `15_feature_structure.md`.
  - After Fix C, no other file in the workers app imports `ITEM_POSITION_SHEET_SURFACE_ID` or `ItemPositionSheetSurfaceProps` from `./surface-ids` — verify with grep before removing.

## Clarifications required

None.

## Acceptance criteria

1. Workers `surfaces.ts` contains no top-level `import { ItemPositionSheetPage }` — only a dynamic-import factory.
2. Managers `surfaces.ts` contains no top-level `import { ItemPositionSheetPage }` — only a dynamic-import factory.
3. `apps/workers-app/.../features/task_steps/actions/use-update-item.ts` does not exist.
4. `apps/workers-app/.../features/items/actions/use-update-item.ts` exists and is identical in content to the file that was removed.
5. `use-task-step-detail.controller.ts` imports `useUpdateItem` from `"../../items/actions/use-update-item"`.
6. `surface-ids.ts` (workers) contains no re-export from `@beyo/items`.
7. `surfaces.ts` (workers) imports `ITEM_POSITION_SHEET_SURFACE_ID` directly from `@beyo/items`.
8. Both apps pass `npm run typecheck` with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/30_dynamic_loading.md`: lazy surface loading — `lazyWithPreload` requires a dynamic `import()` factory to create a bundle split.
- `architecture/15_feature_structure.md`: feature layer ownership — item mutations belong in `features/items/`, not `features/task_steps/`.
- `architecture/35_shared_packages.md §13`: surface ID ownership — package-owned IDs are imported directly from the package, not re-exported through local files.

### Local extensions loaded

- `architecture/30_dynamic_loading_local.md`: confirms `lazyWithPreload` utility path via `@beyo/ui`.

### File read intent — pattern vs. relational

Permitted (relational — understanding what exists):
- Reading `surfaces.ts` (both apps) — confirmed existing static import lines and `lazyWithPreload` call shapes.
- Reading `surface-ids.ts` (workers) — confirmed re-export lines to remove.
- Reading `use-task-step-detail.controller.ts` — confirmed import path to update.

Prohibited (pattern reads — contracts cover these):
- Reading any other action hook to understand mutation structure → `08_hooks.md`.

### Skill selection

- Not applicable — this is a pure file correction (no new logic patterns).

---

## Domain schemas consulted

None — no type changes.

## Selected contracts output

Selected contracts:
- `architecture/30_dynamic_loading.md`: dynamic import factory requirement for `lazyWithPreload`
- `architecture/15_feature_structure.md`: feature boundary — item action in items feature
- `architecture/35_shared_packages.md §13`: import package-owned IDs directly from package

Added from guide:
- `architecture/30_dynamic_loading_local.md`: trigger "lazyWithPreload"

Excluded contracts:
- All others — no new API, form, component, or provider work.

---

## Implementation plan

### Fix A — Restore dynamic import for `ItemPositionSheetPage` (two files)

#### File 1: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`

**Step A1.** Remove the top-level static import of `ItemPositionSheetPage`:
```ts
// DELETE this line:
import { ItemPositionSheetPage } from "@beyo/items";
```

**Step A2.** Replace the eager `lazyWithPreload` call (lines 116–118):
```ts
// BEFORE
const itemPositionSheet = lazyWithPreload(async () => ({
  default: ItemPositionSheetPage,
}));

// AFTER
const itemPositionSheet = lazyWithPreload(() =>
  import("@beyo/items").then((m) => ({ default: m.ItemPositionSheetPage })),
);
```

No other changes to this file. The `ITEM_POSITION_SHEET_SURFACE_ID` import, the surface registration entry, and the `SurfaceRegistrations` map are all unchanged.

#### File 2: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`

**Step A3.** Remove `ItemPositionSheetPage` from the top-level import block (lines 1–5). The import statement currently is:
```ts
import {
  ITEM_POSITION_SHEET_SURFACE_ID,
  ItemPositionSheetPage,
  type ItemPositionSheetSurfaceProps,
} from "@beyo/items";
```
Change to:
```ts
import {
  ITEM_POSITION_SHEET_SURFACE_ID,
  type ItemPositionSheetSurfaceProps,
} from "@beyo/items";
```
(`ItemPositionSheetSurfaceProps` is used by the local `ItemPositionSurfaceProps` alias type on line 54, so it must stay.)

**Step A4.** Replace the eager `lazyWithPreload` call (lines 169–171):
```ts
// BEFORE
const itemPositionSheet = lazyWithPreload(async () => ({
  default: ItemPositionSheetPage,
}));

// AFTER
const itemPositionSheet = lazyWithPreload(() =>
  import("@beyo/items").then((m) => ({ default: m.ItemPositionSheetPage })),
);
```

No other changes to this file.

---

### Fix B — Move `use-update-item.ts` to the correct feature folder (workers app)

**Step B1.** Create directory `apps/workers-app/ManagerBeyo-app-workers/src/features/items/actions/`.

**Step B2.** Create `apps/workers-app/ManagerBeyo-app-workers/src/features/items/actions/use-update-item.ts` with **exactly the same content** as the current `features/task_steps/actions/use-update-item.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItem, type UpdateItemInput } from "@beyo/items";

import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { taskStepKeys } from "../../task_steps/api/task-step-keys";

export function useUpdateItem(workingSectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateItemInput) => updateItem(input),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(workingSectionId as never),
      });
      void queryClient.invalidateQueries({
        queryKey: workerWorkingSectionKeys.mine(),
      });
    },
  });
}
```

Note: the relative imports change because the file is now two levels deeper from `working_sections` and `task_steps`:
- `workerWorkingSectionKeys` → `"../../working_sections/api/working-section-keys"`
- `taskStepKeys` → `"../../task_steps/api/task-step-keys"`

Verify these paths resolve correctly from `features/items/actions/`.

**Step B3.** Delete `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/actions/use-update-item.ts`.

**Step B4.** Update the import in `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`:

```ts
// BEFORE (line 50)
import { useUpdateItem } from "../actions/use-update-item";

// AFTER
import { useUpdateItem } from "../../items/actions/use-update-item";
```

---

### Fix C — Remove re-export indirection for `ITEM_POSITION_SHEET_SURFACE_ID` (workers app)

**Step C1.** Before editing, verify no other file outside `surfaces.ts` imports `ITEM_POSITION_SHEET_SURFACE_ID` or `ItemPositionSheetSurfaceProps` from `./surface-ids` or `../surface-ids`:

```bash
grep -rn "ITEM_POSITION_SHEET_SURFACE_ID\|ItemPositionSheetSurfaceProps" \
  apps/workers-app/ManagerBeyo-app-workers/src/ \
  --include="*.ts" --include="*.tsx"
```

Expected: only `surface-ids.ts` (the re-export source), `surfaces.ts` (consumer), and `use-task-step-detail.controller.ts` (imports directly from `@beyo/items`). If any other file imports from `surface-ids.ts`, do NOT remove the re-export and flag to the user.

**Step C2.** Remove the re-export lines from `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts` (lines 2–4):

```ts
// DELETE these two lines:
export { ITEM_POSITION_SHEET_SURFACE_ID } from "@beyo/items";
export type { ItemPositionSheetSurfaceProps } from "@beyo/items";
```

The remaining `import type { ... } from "@beyo/lib"` on line 1 stays. All local surface ID constants and types below line 4 are unchanged.

**Step C3.** Update `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`: change `ITEM_POSITION_SHEET_SURFACE_ID` from being imported via `./surface-ids` to directly from `@beyo/items`.

Current import block (lines 4–18):
```ts
import {
  BATCH_DETAIL_SLIDE_SURFACE_ID,
  COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID,
  COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID,
  ITEM_POSITION_SHEET_SURFACE_ID,      // ← remove from here
  PAUSE_REASON_SHEET_SURFACE_ID,
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
  STEP_STATE_FILTER_SHEET_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
  UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID,
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
} from "./surface-ids";
```

Add `ITEM_POSITION_SHEET_SURFACE_ID` to the existing `@beyo/items` import at the top of the file. After Fix A, the `@beyo/items` import will be inside the dynamic import factory only (no static import). So add a new static import line:

```ts
import { ITEM_POSITION_SHEET_SURFACE_ID } from "@beyo/items";
```

Place it alongside the other package imports near the top of the file (e.g., next to `import { ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID } from "@beyo/item-issues"`).

Final import section for surfaces.ts should look like:
```ts
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import { ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID } from "@beyo/item-issues";
import { ITEM_POSITION_SHEET_SURFACE_ID } from "@beyo/items";
import {
  BATCH_DETAIL_SLIDE_SURFACE_ID,
  COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID,
  COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID,
  PAUSE_REASON_SHEET_SURFACE_ID,
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
  STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID,
  STEP_STATE_FILTER_SHEET_SURFACE_ID,
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
  UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID,
  UPHOLSTERY_WARNING_SHEET_SURFACE_ID,
} from "./surface-ids";
```

---

## Risks and mitigations

- Risk: Another file in the workers app imports `ITEM_POSITION_SHEET_SURFACE_ID` from `./surface-ids` (e.g., a controller or page added after initial implementation).
  Mitigation: Step C1 grep catches this. If found, keep the re-export and import directly from `@beyo/items` only in `surfaces.ts`.

- Risk: Relative paths in the new `features/items/actions/use-update-item.ts` are wrong (two levels up vs. one).
  Mitigation: File is at `features/items/actions/`, so `../../working_sections/` and `../../task_steps/` are correct. Typecheck will catch any path error immediately.

- Risk: Dynamic `import("@beyo/items")` in `lazyWithPreload` pulls the entire `@beyo/items` barrel into one chunk. If other surfaces also use dynamic imports from `@beyo/items`, Vite may merge them into the same lazy chunk — this is acceptable behavior.
  Mitigation: No action needed. The bundle is still split from the initial load; Vite chunk merging is expected and controlled by its chunking strategy.

## Validation plan

- Grep confirmation before C2: `grep -rn "ITEM_POSITION_SHEET_SURFACE_ID" apps/workers-app/` — only `surfaces.ts` and `use-task-step-detail.controller.ts` should reference it after Fix C.
- `npm run typecheck` from `apps/workers-app/ManagerBeyo-app-workers/` — zero errors.
- `npm run typecheck` from `apps/managers-app/ManagerBeyo-app-managers/` — zero errors.
- `npm run build` (workers app) — confirm Vite emits a separate chunk for `@beyo/items` (position sheet is no longer in the main entry chunk).

## Review log

- `2026-06-25` Claude: corrections plan authored from post-implementation code review

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
