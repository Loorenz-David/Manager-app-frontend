# SUMMARY_PLAN_item_upholstery_amount_field_20260522

## Metadata

- Summary ID: `SUMMARY_PLAN_item_upholstery_amount_field_20260522`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-22T21:46:51Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_upholstery_amount_field_20260522.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended `ItemUpholsteryFieldsSchema` with the optional nullable decimal field `upholstery_amount_meters` and validation for numeric positive values.
- Added `ItemUpholsteryAmountField`, a React Hook Form-connected decimal `NumberInput` with `m` unit display, quarter-meter stepping, and two pill buttons for `× 0.25` and `× 0.5`.
- Implemented multiplier behavior so empty state seeds the factor directly, existing values are multiplied, and results are rounded to four decimals to avoid floating-point drift.
- Exported the new field from the items feature barrel and registered it in the testing forms harness with a default `null` value.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/types.ts`: added `upholstery_amount_meters` to `ItemUpholsteryFieldsSchema`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemUpholsteryAmountField.tsx`: added the new RHF number field and multiplier pills.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/index.ts`: exported `ItemUpholsteryAmountField`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx`: added the field to the testing harness and default values.

## Contract adherence

- `task_system/frontend_contract_goal_mapping_guide.md`: domain names and form paths were taken from the items feature types and current harness wiring rather than contract examples.
- `architecture/08_hooks.md`: the field uses `useFormContext` and `useController` for RHF composition consistent with the existing field layer.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test:unit`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- No dedicated unit or Playwright coverage was added for the multiplier interaction in this pass.
- The field is only wired into the testing harness, matching the plan scope; no production form adopted it yet.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_item_upholstery_amount_field_20260522_2146.md`
