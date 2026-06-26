---
name: project-item-position-pill-and-sheet-package
description: PLAN_item_position_pill_and_sheet_package_20260625 — ItemPositionPill + ItemPositionSheetPage moved to @beyo/items; workers app gains position editing for seat items; managers app migrates local sheet to package
metadata:
  type: project
---

Move item position pill trigger and position-edit sheet page into `@beyo/items` so both apps share them.

**Why:** Workers need position pill always visible on seat items (showing "−" when absent) with tap-to-edit. Managers already have this; unify in package.

**How to apply:** Reference plan at `docs/architecture/under_construction/implementation/PLAN_item_position_pill_and_sheet_package_20260625.md`. Status: `under_construction`, awaiting approval before Codex execution.

Key decisions:
- `ItemPositionSheetSurfaceProps.onSave` is a callback (no mutation in package; each app provides its own)
- `ITEM_POSITION_SHEET_SURFACE_ID = "item-position-sheet"` — same string as existing managers constant
- Workers app new: `features/items/actions/use-update-item.ts` (invalidates section steps cache)
- Managers app: `openPositionSheet` moves from flow → controller (needs `taskQuery.data` + `updateItem`)
- Local files deleted: managers `pages/tasks/ItemPositionSheetPage.tsx` + `features/items/api/update-item.ts`
- 18 steps: 7 package + 4 workers + 6 managers + 1 CSS check

Files changed (17 total + 2 deleted):
- NEW: `packages/items/src/surface-ids.ts`
- NEW: `packages/items/src/api/update-item.ts`
- NEW: `packages/items/src/components/ItemPositionPill.tsx`
- NEW: `packages/items/src/pages/ItemPositionSheetPage.tsx`
- MOD: `packages/items/src/types.ts` (add UpdateItemInput)
- MOD: `packages/items/src/index.ts`
- MOD: `packages/items/package.json` (add @beyo/hooks peer)
- NEW: `apps/workers-app/.../features/items/actions/use-update-item.ts`
- MOD: `apps/workers-app/.../features/task_steps/surfaces.ts`
- MOD: `apps/workers-app/.../features/task_steps/controllers/use-task-step-detail.controller.ts`
- MOD: `apps/workers-app/.../features/task_steps/components/detail/TaskStepItemDetailsSection.tsx`
- MOD: `apps/managers-app/.../features/tasks/controllers/use-task-detail.controller.ts`
- MOD: `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts`
- MOD: `apps/managers-app/.../features/tasks/surfaces.ts`
- MOD: `apps/managers-app/.../features/items/actions/use-update-item.ts`
- DEL: `apps/managers-app/.../features/items/api/update-item.ts`
- DEL: `apps/managers-app/.../pages/tasks/ItemPositionSheetPage.tsx`
