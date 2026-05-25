# SUMMARY_PLAN_sheet_optimistic_close_20260525

## Metadata

- Summary ID: `SUMMARY_PLAN_sheet_optimistic_close_20260525`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-25T10:13:23Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_sheet_optimistic_close_20260525.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended the three save-action sheet surface prop types with optional `prefill` payloads so failed optimistic saves can restore the user's in-progress input.
- Added optimistic cache snapshot, rollback, and invalidation lifecycle handling to `useUpdateTask`, `useUpdateItem`, and `useSetUpholsteryQuantity`, including task list invalidation for upholstery quantity changes.
- Switched `TaskScheduledDateSheetPage`, `ItemQuantitySheetPage`, and `ItemUpholsteryAmountSheetPage` from `surface.closeTop()` to animated `header.requestClose()` optimistic close, and re-open the same sheet with preserved input on mutation failure.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`: added `prefill` support to the three affected sheet prop types.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/actions/use-update-task.ts`: added optimistic task detail patching with rollback on error.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item.ts`: added optimistic item quantity patching with rollback on error.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-set-upholstery-quantity.ts`: added optimistic upholstery quantity patching with rollback on error and task list invalidation.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskScheduledDateSheetPage.tsx`: switched save to animated optimistic close with schedule prefill recovery.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemQuantitySheetPage.tsx`: switched save to animated optimistic close with quantity prefill recovery.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx`: switched save to animated optimistic close with amount prefill recovery.

## Contract adherence

- `architecture/08_hooks.md`: the three action hooks now follow the required optimistic `onMutate` → `onError` → `onSettled` lifecycle.
- `architecture/28_surfaces.md` and `architecture/28_surfaces_local.md`: the save sheets now close through the `BottomSheetSurface` animated close path instead of bypassing Vaul's exit animation.

## Validation evidence

- `npm run typecheck`: pass (`apps/managers-app/ManagerBeyo-app-managers`)
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- No automated UI test coverage was added for the optimistic re-open flow in this turn.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_sheet_optimistic_close_20260525.md`
