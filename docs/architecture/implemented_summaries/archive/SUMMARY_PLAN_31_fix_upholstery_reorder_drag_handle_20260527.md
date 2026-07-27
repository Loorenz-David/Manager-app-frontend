# SUMMARY_PLAN_31_fix_upholstery_reorder_drag_handle_20260527

## Metadata

- Summary ID: `SUMMARY_PLAN_31_fix_upholstery_reorder_drag_handle_20260527`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-27T10:16:48Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_31_fix_upholstery_reorder_drag_handle_20260527.md`
- Related debug plan (optional): `docs/debugging/DEBUG_PLAN_31_upholstery_reorder_drag_unresolved_20260527.md`

## What was implemented

- Stabilized `UpholsteryReorderSheetPage` drag activation by switching away from zero-threshold sensors and by fixing the local-order render loop that prevented the sheet from mounting cleanly.
- Added a stable sortable-card selector so the reorder flow can be asserted from Playwright without depending on transient drag overlay markup.
- Fixed the PLAN_29 contract drift in `upholstery-swap.spec.ts` by adding the required `favorite` and `list_order` fields to every mocked upholstery response.
- Added a new mocked Playwright regression for the reorder sheet that exercises the task-detail entry flow and verifies list-order PATCH traffic plus DOM order changes on both desktop and mobile projects.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryReorderSheetPage.tsx`: updated sensor activation thresholds, memoized ordered-items derivation, fixed the unstable surface-header effect, and added sortable-card test IDs.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/upholstery/upholstery-reorder.spec.ts`: added the new reorder regression with mocked task/upholstery routes and desktop/mobile project coverage.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/upholstery-swap.spec.ts`: added `favorite` and `list_order` to mocked upholstery payloads so runtime Zod validation succeeds.

## Contract adherence

- `architecture/05_server_state.md`: the change preserved the existing `/api/v1/upholsteries` query contract and `/list-order` mutation path; only test fixtures were updated to match the runtime schema.
- `architecture/07_components.md`: the test-only selector was added at the sortable wrapper boundary without moving mutation or drag logic into presentational components.
- `architecture/17_testing.md`: Playwright coverage uses stable `data-testid` selectors and mocks the task-detail flow end to end instead of reaching through implementation details.
- `architecture/28_surfaces.md`: the regression opens the existing task-detail slide, upholstery picker slide, and reorder sheet in the same stacked-surface flow the app uses in production.
- `architecture/34_runtime_validation.md`: the validation pass covered zero-error typechecking plus focused desktop/mobile Playwright runs for the affected interaction path.

## Validation evidence

- `npm run typecheck` (in `apps/managers-app/ManagerBeyo-app-managers`): pass
- `npx playwright test tests/playwright/features/upholstery/upholstery-reorder.spec.ts --project=desktop`: pass
- `npx playwright test tests/playwright/features/upholstery/upholstery-reorder.spec.ts --project=mobile`: pass
- `npx playwright test tests/playwright/features/tasks/upholstery-swap.spec.ts --project=desktop`: pass
- Manual user verification on `2026-05-27`: fail — user reports the upholstery reorder interaction is still broken in real app usage ("nothing gets dragged, no bottom sheet opens, nothing happens")

## Known gaps or deferred items

- The mobile Playwright regression currently uses a hold-then-drag pointer sequence under the mobile WebKit project rather than a synthetic `TouchEvent` sequence. Direct synthetic touch injection was not reliably activating dnd-kit in this environment, but the test still validates the mobile viewport reorder flow and the emitted PATCH contract.
- Post-summary correction: despite the automated checks above, the underlying user-facing bug is not resolved. The current implementation should be treated as incomplete until a follow-up debugging pass reproduces and fixes the real interaction failure in manual app usage.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_31_fix_upholstery_reorder_drag_handle_20260527.md`
