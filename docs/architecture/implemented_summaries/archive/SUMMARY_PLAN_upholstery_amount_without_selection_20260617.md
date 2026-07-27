# SUMMARY_PLAN_upholstery_amount_without_selection_20260617

## Metadata

- Summary ID: `SUMMARY_PLAN_upholstery_amount_without_selection_20260617`
- Status: `summarized`
- Owner agent: `Codex (GPT-5)`
- Created at (UTC): `2026-06-17T13:08:17Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_amount_without_selection_20260617.md`

## What was implemented

- Updated task-creation payload normalization so managers can submit `item_upholstery.amount_meters` without selecting an upholstery; `upholstery_id` is omitted in that state.
- Made shared item-upholstery query parsing accept `upholstery_id: null`, allowing task detail upholstery rows to render and be patched later.
- Added a workers-app guard for upholstery sections with no selected upholstery and registered a dedicated "No upholstery assigned" blocking sheet.
- Wired the new guard into both workers task-step transition controllers before the existing "Fabric not available" guard.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/lib/normalize-task-form-payload.ts`: relaxed the upholstery payload guard and conditionally omitted `upholstery_id`.
- `packages/tasks/src/types.ts`: made `ItemUpholsteryEntrySchema.upholstery_id` nullable.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/lib/step-transition-guards.ts`: added `hasNoUpholsterySelected`.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`: added the missing-upholstery sheet surface ID and props type.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`: lazy-registered the new sheet surface and preload export.
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/UpholsterySelectionMissingSheetPage.tsx`: added the blocking warning sheet with optional reserved amount display.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-working-section-steps.controller.ts`: added the missing-upholstery start guard in the section list flow.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`: added the missing-upholstery start guard in the detail flow.

## Contract adherence

- `architecture/16_feature_workflow.md`: kept the change in existing type, controller, page, and dynamic surface-registration layers rather than moving behavior into presentation components.
- `task_system/frontend_contract_goal_mapping_guide.md`: used implementation reads only for scoped existing field names, controller wiring, and surface patterns.
- `architecture/28_surfaces.md` and `architecture/28_surfaces_local.md`: followed the app's registered `sheet` surface pattern through `lazyWithPreload`.

## Validation evidence

- `npm run typecheck`: pass.
- `npm run test`: not run; no targeted unit suite was identified for this narrow payload and guard change.
- `npx playwright test --project=mobile`: not run; requested validation gate was `npm run typecheck`.
- `npx playwright test --project=desktop`: not run.

## Known gaps or deferred items

- Runtime manual validation was not run for the creation payload network body or worker sheet interaction in this pass.

## Handoff notes

- No backend handoff required. Backend acceptance of quantity-only upholstery payloads was already confirmed in the source plan.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_upholstery_amount_without_selection_20260617_1308.md`
