# SUMMARY_PLAN_keyboard_sheet_lift_hotfix_20260615

## Metadata

- Summary ID: `SUMMARY_PLAN_keyboard_sheet_lift_hotfix_20260615`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T10:59:08Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_keyboard_sheet_lift_hotfix_20260615.md`
- Predecessor summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_aware_inputs_20260615.md`

## What was implemented

- Updated the shared `BottomSheetSurface` so `Drawer.Content` is lifted with `bottom: var(--keyboard-inset)` while keeping Vaul `repositionInputs={false}`.
- Removed the redundant keyboard inset from the bottom sheet scroll-area padding, restoring it to safe-area padding only.
- Added a short `bottom` transition so the sheet lift follows keyboard inset changes without an abrupt jump.
- Reworked `KeyboardInsetProvider` so viewport frames write `--keyboard-inset` imperatively and React context only re-renders on the low-frequency `isKeyboardOpen` boolean transition.
- Kept `FloatingKeyboardBar` compatible with the provider because it reads `isKeyboardOpen` from context and positions from `--keyboard-inset`.

## Files changed

- `packages/ui/src/components/surfaces/BottomSheetSurface.tsx`: lift the fixed drawer content above the keyboard and remove keyboard padding from the scroll area.
- `packages/ui/src/providers/KeyboardInsetProvider.tsx`: replace per-frame context value updates with imperative CSS variable writes and boolean-only context state.

## Contract adherence

- `Frontend_architecture/28_surfaces.md`: kept the keyboard lift in shared surface chrome rather than individual feature pages.
- `Frontend_architecture/23_providers.md`: preserved the provider plus consumer hook boundary while changing provider internals to avoid subtree re-render storms.

## Validation evidence

- `npm run typecheck`: pass.
- Static verification: `useKeyboardInset()` consumers only require `isKeyboardOpen`; the shared bottom sheet is the only bottom-sheet implementation and now uses `bottom-[var(--keyboard-inset)]`.

## Known gaps or deferred items

- Real-device software keyboard validation remains required for the primary UX acceptance criteria because desktop/headless checks do not reproduce mobile keyboard viewport behavior.
- `npx playwright test --grep keyboard --project=desktop` was not run; the user-requested gate for this turn was `npm run typecheck`.
- Follow-up hotfix: `docs/architecture/implemented_summaries/SUMMARY_PLAN_keyboard_sheet_close_focus_hotfix_20260615.md` added close-time focus guards to eliminate keyboard flash during bottom-sheet teardown.

## Handoff notes

- No backend handoff needed.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_keyboard_sheet_lift_hotfix_20260615_1059.md`
