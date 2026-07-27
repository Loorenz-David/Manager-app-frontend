# SUMMARY_PLAN_25_bottom_sheet_styling_interactions_and_keyboard_restoration_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_25_bottom_sheet_styling_interactions_and_keyboard_restoration_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T18:22:17Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_25_bottom_sheet_styling_interactions_and_keyboard_restoration_20260526.md`
- Related debug plan (optional): `—`

## What changed from the original plan

- PLAN 25 was originally written around a bottom-sheet color picker that would dismiss the keyboard, preserve the Lexical selection, and restore focus after the sheet closed.
- During implementation review, that strategy proved to be the wrong interaction model because keyboard dismissal and selection restoration were interfering with the editor flow instead of improving it.
- The feature was therefore implemented with a different approach: an inline expanded toolbar mode that keeps the editor active and avoids the sheet/keyboard choreography entirely.

## What was implemented instead

- Reverted the uncommitted sheet-oriented PLAN 25 work back to the committed PLAN 24 toolbar baseline before rebuilding the feature.
- Added a feature-owned inline color palette for the composer toolbar with `Default`, `Accent`, `Ocean`, `Forest`, and `Rose` options.
- Refactored the toolbar so `Color` expands inline to a full-width mode with visible swatches and a right-aligned `X` control, while disabling horizontal escape from that mode.
- Kept color application inside the editor/serialization boundary by replacing the old toggle-only color action with explicit token-based color application.
- Preserved the rest of the rich composer behavior: typing continues without keyboard dismissal, and outgoing payloads remain backend-safe plain text.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseColorPalette.tsx`: added the inline swatch palette and app-owned color token helpers.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerToolbar.tsx`: added the inline expanded color mode and dismiss control.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseRichComposer.tsx`: replaced the old color action entry point with generic expanded-tool state and inline color orchestration.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseComposerEditor.tsx`: kept editor ownership limited to direct color application.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/lib/case-lexical-serialization.ts`: added active-color reporting and token-based color application while preserving the serializer boundary.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`: replaced sheet assumptions with inline-expansion assertions and continued typing/send validation.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 25 linkage and progress note describing the strategy pivot.

## Contract adherence

- Preserved the PLAN 24 / PLAN 23 editor boundary by keeping Lexical selection and style application logic out of the presentation toolbar.
- Kept the styling semantics app-owned and still degraded unsupported marks to backend-safe text blocks.
- Avoided scattering focus or timing hacks through the tree by removing the sheet-based keyboard restoration path entirely.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/case-composer.spec.ts --project=mobile`: pass

## Known gaps or deferred items

- Only `Color` uses the inline expanded-tool model in this iteration, although the rich composer state now leaves room for future expandable tools.
- The inline palette is intentionally small and app-owned; no arbitrary color input or persistence contract expansion was added.
- Backend persistence still strips composer-owned color semantics to backend-safe text blocks until the message-content contract grows.

## Handoff notes (if needed)

- None.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_25_bottom_sheet_styling_interactions_and_keyboard_restoration_20260526.md`
