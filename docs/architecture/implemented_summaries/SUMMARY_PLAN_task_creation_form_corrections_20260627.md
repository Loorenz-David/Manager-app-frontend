# SUMMARY_PLAN_task_creation_form_corrections_20260627

## Metadata

- Summary ID: `SUMMARY_PLAN_task_creation_form_corrections_20260627`
- Status: `implemented`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T20:48:44Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_creation_form_corrections_20260627.md`

## What was implemented

- Added a new `NumericKeyboardBar` primitive and rewired `ItemPositionField` to use a text input plus keyboard-overlay digit controls while preserving seat-position validation.
- Updated task-creation schemas so seat items require a position, pre-order and return flows now enforce email and phone as specified, and store returns can bypass customer validation entirely.
- Fixed the return form lookup path to use purchase API results, create item images from lookup URLs, and hide the customer step when the source is `store_return`.
- Hid the slide header across the three task-creation slide pages and added top padding to the form shells so the staged content still has breathing room.

## Files changed

- `packages/ui/src/components/primitives/floating-keyboard-bar/NumericKeyboardBar.tsx`: added the new numeric keyboard overlay primitive.
- `packages/ui/src/components/primitives/floating-keyboard-bar/index.ts`: exported the new primitive.
- `packages/items/src/components/ItemPositionField.tsx`: replaced the numeric input registration with controlled text input handling and the overlay keyboard bar.
- `packages/items/src/types.ts`: added string-to-number coercion for `item_position`.
- `packages/task-creation/src/types.ts`: split pre-order and return schemas, added seat-position refinement, and allowed partial return customers for store returns.
- `packages/task-creation/src/lib/normalize-task-form-payload.ts`: skipped customer serialization for store returns and handled partial customer payloads safely.
- `packages/task-creation/src/components/ReturnFormContent.tsx`: fixed lookup selection, added image creation invalidation, hid the customer step for store returns, and added top padding.
- `packages/task-creation/src/components/PreOrderFormContent.tsx`: added top padding.
- `packages/task-creation/src/components/InternalFormContent.tsx`: added top padding.
- `packages/task-creation/src/pages/InternalTaskSlidePage.tsx`: hid the slide header.
- `packages/task-creation/src/pages/PreOrderTaskSlidePage.tsx`: hid the slide header.
- `packages/task-creation/src/pages/ReturnTaskSlidePage.tsx`: hid the slide header.

## Contract adherence

- `architecture/09_forms.md`: kept validation in Zod schemas and preserved step-level error routing through existing staged-form patterns.
- `architecture/07_components.md`: contained UI changes inside existing package components without pulling feature logic into unrelated layers.
- `architecture/08_hooks.md`: preserved the existing `useForm` and `useStagedForm` interaction model while updating only the affected steps and handlers.
- `architecture/37_keyboard_aware_inputs.md`: implemented the numeric controls as a keyboard-aware overlay above the mobile keyboard.
- `architecture/28_surfaces.md`: used `setHeaderHidden(true)` on slide pages instead of custom header behavior.

## Validation evidence

- `npm run typecheck`: passed.
- `npm run test`: not run.
- `npx playwright test --project=mobile`: not run.
- `npx playwright test --project=desktop`: not run.

## Known gaps or deferred items

- `NumericKeyboardBar` is still a general overlay without a dedicated focus-preservation helper like `FloatingKeyboardBar`: acceptable for this scoped form correction, but worth revisiting if more keyboard accessory variants are added.
- Automated runtime validation for the new store-return/customer-step branching was not added in this task because the plan marked Playwright work out of scope.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_task_creation_form_corrections_20260627.md`
