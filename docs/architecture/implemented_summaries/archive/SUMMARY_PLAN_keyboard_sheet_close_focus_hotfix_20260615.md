# SUMMARY_PLAN_keyboard_sheet_close_focus_hotfix_20260615

## Metadata

- Summary ID: `SUMMARY_PLAN_keyboard_sheet_close_focus_hotfix_20260615`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T11:16:16Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_keyboard_sheet_close_focus_hotfix_20260615.md`
- Predecessor summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_sheet_lift_hotfix_20260615.md`

## What was implemented

- Prevented Radix close-time focus restoration for shared bottom sheets by passing `onCloseAutoFocus={(event) => event.preventDefault()}` to `Drawer.Content`.
- Added active editable-element blur in `BottomSheetSurface.handleClose()` before the sheet close animation starts, covering close button, backdrop, and drag close paths.
- Hardened `FloatingKeyboardBar` auto-focus so it only focuses on a real bar render transition when an editable element was already active, and cancels the pending focus if the portal unmounts.
- Did not add provider boolean debounce; the root close-focus and floating-bar guards were implemented without changing `KeyboardInsetProvider`.

## Files changed

- `packages/ui/src/components/surfaces/BottomSheetSurface.tsx`: close-time focus restoration prevention and active input blur.
- `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`: guarded auto-focus against close-transition keyboard blips.

## Contract adherence

- `Frontend_architecture/28_surfaces.md`: kept close-time focus handling in shared surface chrome rather than feature pages.
- `Frontend_architecture/23_providers.md`: preserved keyboard provider public shape and avoided provider debounce changes.

## Validation evidence

- `npm run typecheck`: pass.

## Known gaps or deferred items

- Real-device software keyboard validation remains required for the no-flash acceptance criteria because desktop/headless checks do not reproduce mobile keyboard close behavior.
- `npx playwright test --grep keyboard --project=desktop` was not run; the user-requested gate for this turn was `npm run typecheck`.
- Follow-up cleanup: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_aware_inputs_corrections_20260615.md` completed the remaining surface coverage, floating-bar encapsulation, and widened typecheck gate.

## Handoff notes

- No backend handoff needed.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_keyboard_sheet_close_focus_hotfix_20260615_1116.md`
