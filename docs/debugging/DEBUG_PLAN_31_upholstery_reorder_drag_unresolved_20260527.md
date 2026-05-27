# DEBUG_PLAN_31_upholstery_reorder_drag_unresolved_20260527

## Metadata

- Debug ID: `DEBUG_PLAN_31_upholstery_reorder_drag_unresolved_20260527`
- Status: `debugging`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-27T10:34:16Z`
- Parent plan: `docs/architecture/archives/implementation/PLAN_31_fix_upholstery_reorder_drag_handle_20260527.md`
- Parent summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_31_fix_upholstery_reorder_drag_handle_20260527.md`
- Issue reference: `manual QA report from user on 2026-05-27`
- Debug iteration: `1`

## Problem statement

- Observed behavior:
  - User reports the upholstery reorder interaction is still broken in real app usage.
  - When attempting to drag the upholstery card / drag handle, nothing starts dragging.
  - User also reports that no bottom sheet opens and no visible interaction happens.
- Expected behavior:
  - Tapping the reorder affordance should open the reorder sheet.
  - Inside the reorder sheet, pressing and dragging the handle should start a drag interaction and allow list reordering.
- Impact scope:
  - Upholstery reordering remains unavailable to end users.
  - PLAN_31 should be considered unresolved despite the automated checks passing.

## Reproduction

1. Open the upholstery picker from the task detail flow in the running app.
2. Attempt to open reorder mode and/or drag an upholstery card using the reorder handle.
3. Observe that no reorder interaction starts and the expected UI feedback does not appear in manual usage.

## Hypotheses

- The automated Playwright route/mocked flow does not faithfully reproduce the real runtime interaction path, so the passing spec is a false positive.
- The failure may happen before dnd-kit activation, for example in the reorder-sheet opening flow, event wiring, layering, pointer-event blocking, or a mismatch between the tested selector path and the real production path.
- The current `TouchSensor` / `PointerSensor` thresholds may still be wrong for the actual DOM and gesture timing used by the live app.
- Another surface or wrapper may be intercepting events in the real environment even though the mocked tests did not show it.

## Debug implementation plan

1. Reproduce the failure manually with the live dev app and inspect the exact failing stage:
   - reorder button click does not open the reorder sheet
   - reorder sheet opens but drag handle never activates
   - drag activates but order/mutation does not complete
2. Add runtime instrumentation around:
   - `UpholsteryCard` reorder button click path
   - `openReorderSheet()` in `useUpholsteryPickerController`
   - `UpholsteryReorderSheetPage` mount
   - `handleDragStart`, `handleDragEnd`, and `handleDragCancel`
3. Verify whether the real failing environment is mobile WebKit, desktop, or both.
4. Replace or extend the current Playwright regression so it reproduces the real failure mode instead of only the mocked passing path.
5. Only after the real failing stage is isolated, make a new fix plan or nested debug iteration.

## Validation and regression checks

- `npm run typecheck`: should remain zero-error during debugging changes
- `npx playwright test tests/playwright/features/upholstery/upholstery-reorder.spec.ts --project=desktop`: currently passes, but should not be treated as proof of a real fix
- `npx playwright test tests/playwright/features/upholstery/upholstery-reorder.spec.ts --project=mobile`: currently passes, but should not be treated as proof of a real fix
- Manual runtime verification in the real app flow: currently failing; this is the authoritative unresolved signal

## Contracts and skills

- Contracts loaded:
  - `architecture/17_testing.md`: the current regression needs to be treated as incomplete because it does not match manual runtime behavior
  - `architecture/28_surfaces.md`: the bug likely involves the slide/sheet interaction boundary or its event path
  - `architecture/34_runtime_validation.md`: manual runtime validation must win over a mocked browser test when they disagree
- Skill used:
  - `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`

## Attempts already made

- Updated `UpholsteryReorderSheetPage` sensor thresholds from zero-threshold activation to delayed touch / non-zero pointer activation.
- Added `data-testid` selectors for sortable cards to support regression assertions.
- Fixed a render-loop issue in `UpholsteryReorderSheetPage` by memoizing `orderedItems`.
- Stabilized the sheet header effect to avoid repeated `setTitle` / `setActions` loops on mount.
- Fixed PLAN_29 mock contract drift by adding required `favorite` and `list_order` fields in `upholstery-swap.spec.ts`.
- Added a new mocked Playwright reorder spec covering desktop and mobile projects.
- Result of attempts: automated checks passed, but the real user-facing bug remains unresolved.

## Lifecycle transition

- Current state: `debugging`
- Next state: `implemented | summarized | archived`
- Next artifact target: `docs/debugging/DEBUG_PLAN_31_upholstery_reorder_drag_unresolved_20260527.md`
