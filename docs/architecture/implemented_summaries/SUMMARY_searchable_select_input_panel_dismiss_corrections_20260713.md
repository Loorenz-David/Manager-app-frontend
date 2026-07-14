# SUMMARY_searchable_select_input_panel_dismiss_corrections_20260713

## Metadata

- Summary ID: `SUMMARY_searchable_select_input_panel_dismiss_corrections_20260713`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-13T10:41:01Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_searchable_select_input_panel_dismiss_corrections_20260713.md`
- Predecessor plan: `docs/architecture/archives/implementation/PLAN_searchable_select_input_corrections_20260713.md`
- Related debug plan: `—`

## What was implemented

- Replaced the global keyboard-open snapshot in `FloatingKeyboardBar` with continuous per-instance focus ownership tracking across inline, floating, and placeholder input refs.
- Applied ownership gating to both `variant="panel"` and `variant="bar"`, including direct focus transfers between fields while the keyboard remains open.
- Added an ownership resync after panel unmount so removing a focused portal input cannot leave stale ownership state or prevent close animation completion.
- Added an internal floating-copy unmount signal in `SearchableSelectInput` that reuses the existing blur commit/revert behavior when the panel is dismissed without a native blur event.
- Preserved selection and Escape close semantics without duplicate notifications by using the existing blur-suppression guard and latest-handler ref.
- Added regression coverage for cross-instance isolation, panel dismissal with force-selection revert and free-text commit, and selection/Escape non-interference.

## Files changed

- `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.tsx`: tracks local focus ownership and gates focus transfer/panel lifecycle against the owning field.
- `packages/ui/src/components/primitives/floating-keyboard-bar/FloatingKeyboardBar.test.tsx`: covers panel ownership switching and bar-variant focus isolation.
- `packages/ui/src/components/primitives/input/SearchableSelectInput.tsx`: wires the floating controls unmount to the existing blur state machine.
- `packages/ui/src/components/primitives/input/SearchableSelectInput.test.tsx`: covers dismiss-without-blur commit/revert behavior and deliberate close paths.
- `docs/architecture/under_construction/intention/input_select.md`: records this correction plan as archived.

## Contract adherence

- `architecture/02_types.md`: the internal dismiss callback is precisely typed as `() => void`; no public callback shape was expanded.
- `architecture/06_client_state.md`: focus ownership and dismissal bookkeeping remain component-local state and refs.
- `architecture/17_testing.md`: regression tests assert user-visible focus, popup absence, and notification behavior using RTL queries.
- `architecture/37_keyboard_aware_inputs.md`: inline/floating ownership remains centralized in `FloatingKeyboardBar`; no keyboard provider redesign was introduced.

## Validation evidence

- `npm run test:ui`: pass, 5 files / 22 tests.
- `npm run typecheck`: pass, zero TypeScript errors.
- Playwright/real-device validation: deferred; the plan has no dedicated consuming-feature runtime spec, and the manual mobile check remains a consuming-feature follow-up.

## Known gaps or deferred items

- Manually verify the multi-field form on a real mobile device: switching to another field after using the searchable select must not reopen or steal focus from the select panel.
- Manually verify keyboard dismissal without selection leaves no anchored popup on the real device.

## Handoff notes

- No backend handoff required.
- The temporary wood-type UI test consumer in `packages/task-creation/src/components/InternalFormContent.tsx` remains intentionally form-independent and easy to remove after manual validation.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_searchable_select_input_panel_dismiss_corrections_20260713_1041.md`
