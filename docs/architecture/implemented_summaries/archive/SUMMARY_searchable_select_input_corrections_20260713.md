# SUMMARY_searchable_select_input_corrections_20260713

## Metadata

- Summary ID: `SUMMARY_searchable_select_input_corrections_20260713`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-13T10:16:21Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_searchable_select_input_corrections_20260713.md`
- Predecessor plan: `docs/architecture/archives/implementation/PLAN_searchable_select_input_20260713.md`
- Related debug plan: `—`

## What was implemented

- Fixed panel focus transfer by retrying focus after the asynchronous panel portal commits.
- Added `isInlineHidden` to `FloatingKeyboardBar` render controls and suppressed the hidden searchable-select listbox, eliminating duplicate DOM ids.
- Made unmatched `forceSelection` Enter interactions prevent surrounding form submission without committing a value.
- Corrected the keyboard-aware-input contract heading structure and documented panel focus timing and hidden-copy behavior.
- Formalized the package-level Vitest workflow with the root `test:ui` script and testing-contract documentation.
- Added regression coverage for focus transfer, panel lifecycle, reduced motion, scroll locking, duplicate ids, and force-selection form submission.

## Files changed

- `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`: added post-mount focus handoff and `isInlineHidden` callback metadata.
- `packages/ui/src/components/primitives/input/SearchableSelectInput.tsx`: suppresses hidden-copy popup/ARIA references and prevents unmatched force-selection Enter defaults.
- `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.test.tsx`: panel focus, lifecycle, reduced-motion, scroll-lock, and callback-state tests.
- `packages/ui/src/components/primitives/input/SearchableSelectInput.test.tsx`: duplicate-id and form-submit regression tests.
- `package.json`: added `test:ui`.
- `architecture/17_testing.md`: documented package-level Vitest configuration and script requirements.
- `architecture/37_keyboard_aware_inputs.md`: fixed case heading structure and documented panel focus/hidden-copy rules.
- `docs/architecture/under_construction/intention/input_select.md`: linked the correction plan and summary.

## Contract adherence

- `architecture/02_types.md`: callback changes are additive and preserve existing fields.
- `architecture/17_testing.md`: tests use RTL behavior queries and the package suite now has a discoverable invocation.
- `architecture/35_shared_packages.md`: no package dependency boundary was changed.
- `architecture/37_keyboard_aware_inputs.md`: panel focus ownership and inline/floating duplication remain centralized in `FloatingKeyboardBar`.

## Validation evidence

- `npm run test:ui`: pass, 5 files / 16 tests.
- `npm run typecheck`: pass, zero TypeScript errors.
- Playwright: deferred; no dedicated consuming-feature runtime spec exists yet.

## Known gaps or deferred items

- Real-device/mobile visual validation remains the next consuming-feature responsibility.

## Handoff notes

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_searchable_select_input_corrections_20260713_1016.md`
