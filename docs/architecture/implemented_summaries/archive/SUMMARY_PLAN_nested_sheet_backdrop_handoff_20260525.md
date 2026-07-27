# SUMMARY_PLAN_nested_sheet_backdrop_handoff_20260525

## Metadata

- Summary ID: `SUMMARY_PLAN_nested_sheet_backdrop_handoff_20260525`
- Status: `summarized`
- Owner agent: `GitHub Copilot (GPT-5.3-Codex)`
- Created at (UTC): `2026-05-25T08:49:06Z`
- Source plan: `docs/architecture/under_construction/intention/things_to_fix_today_2.md`
- Related debug plan (optional): `—`

## What was implemented

- Refactored nested sheet backdrop behavior to avoid overlay flicker by moving dim-layer ownership to the surface stack renderer.
- Kept sheet close animation intact by routing dismiss interactions through each sheet shell close lifecycle instead of removing stack entries directly.
- Added closing-state handoff logic so when the top nested sheet starts closing, the underlying sheet is promoted immediately and does not visually pop in after a delay.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/providers/SurfaceProvider.tsx`: added shared sheet backdrop rendering, closing-surface tracking, and topmost ownership based on interactive (non-closing) overlays.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/surfaces/BottomSheetSurface.tsx`: added optional backdrop rendering mode, transparent click-catcher when shared backdrop is active, and `onStartClose` callback wiring to preserve exit animation while enabling immediate topmost handoff.

## Contract adherence

- `architecture/28_surfaces.md`: surface stacking, dismissal, and overlay behavior remain centralized in the surface system instead of page-local workarounds.
- `architecture/31_animations.md`: close transitions remain animation-driven and consistent with the existing timing model; no abrupt unmount on backdrop tap.
- `architecture/23_providers.md`: orchestration responsibilities stay in provider/shell layer, while feature pages remain unaffected.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- Full runtime validation (mobile and desktop Playwright) is still pending for nested surface edge cases.
- Modal and sheet still use separate visual backdrop strategies; a future consolidation could further simplify overlay consistency across mixed surface stacks.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_nested_sheet_backdrop_handoff_20260525_0849.md`
