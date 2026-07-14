# SUMMARY_searchable_select_input_20260713

## Metadata

- Summary ID: `SUMMARY_searchable_select_input_20260713`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-13T09:47:31Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_searchable_select_input_20260713.md`
- Related debug plan: `—`

## What was implemented

- Added generic `SearchableSelectInput` behavior with local case-insensitive filtering, controlled option/text/null commit results, force-selection revert semantics, keyboard navigation, disabled/active/selected states, and combobox/listbox ARIA wiring.
- Added `OptionList` and `AnchoredOptionList` primitives with internal scrolling and empty-state rendering.
- Extended `FloatingKeyboardBar` with the additive `variant="panel"` presentation, shared progress-driven animation choreography, reduced-motion behavior, focus handoff, and iOS-safe document scroll locking.
- Updated the canonical keyboard-aware-input contract and linked intention-plan tracking.

## Files changed

- `packages/ui/src/components/primitives/floating-keyboard-bar/`: panel variant, animation, scroll lock, exports, and regression tests.
- `packages/ui/src/components/primitives/option-list/`: option types, list primitives, barrel, and tests.
- `packages/ui/src/components/primitives/input/`: `SearchableSelectInput` and exports.
- `packages/ui/src/index.ts`: public searchable-select exports.
- `packages/ui/vitest.config.ts`: package-level Vitest configuration.
- `architecture/37_keyboard_aware_inputs.md`: panel capability and responsibility documentation.
- `docs/architecture/under_construction/intention/input_select.md`: implementation tracking link.

## Contract adherence

- `architecture/02_types.md`: uses generic named types and a discriminated result union without `any`.
- `architecture/06_client_state.md`: query, active option, and popup state remain component-local.
- `architecture/07_components.md`: composes the existing `TextInput` and uses named shared primitives.
- `architecture/31_animations.md`: uses centralized animation tokens, transform/opacity channels, a single progress value, and a reduced-motion fallback.
- `architecture/33_vaul_drawer.md`: uses a separate raw-portal lock with fixed-position scroll capture/restore because Vaul is not involved.
- `architecture/37_keyboard_aware_inputs.md`: extends `FloatingKeyboardBar` rather than introducing a duplicate keyboard-positioning mechanism.

## Validation evidence

- `npm run typecheck`: pass, zero TypeScript errors.
- `npx vitest run --config packages/ui/vitest.config.ts`: pass, 5 files / 12 tests.
- Playwright mobile/desktop: deferred; no consuming feature route exists for this shared primitive yet.

## Known gaps or deferred items

- The first consuming feature should run the mobile and desktop Playwright flows to validate the real visual keyboard takeover, animation, and nested-surface behavior.

## Handoff notes

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_searchable_select_input_20260713_0947.md`
