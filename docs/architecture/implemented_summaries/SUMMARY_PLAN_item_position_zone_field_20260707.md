# SUMMARY_PLAN_item_position_zone_field_20260707

## Metadata

- Summary ID: `SUMMARY_PLAN_item_position_zone_field_20260707`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_position_zone_field_20260707.md`
- Implemented at (UTC): `2026-07-07T13:02:23Z`

## Implementation summary

- Replaced the shared position-only item editing flow in `@beyo/items` with a new `ItemPositionZoneField`, `ItemPositionZonePreview`, location-tracker fetch/query helpers, and a rewritten `ItemPositionSheetPage` that can open directly to Zone or Wagon while suppressing lookup inside the edit sheet.
- Widened all touched item/task schemas and optimistic payloads to carry `item_zone` alongside `item_position`, including the shared packages, workers app task-step snapshots, managers app item schemas, pending-upholstery DTOs, and task-creation payload normalization.
- Swapped the legacy `ItemPositionField` out of `InternalFormContent`, `PreOrderFormContent`, and `ReturnFormContent`, piping each form’s watched article number / SKU into the new zone lookup field and defaulting the Return form to the Zone tab.
- Reworked task detail previews in `packages/tasks` and the workers app to render `Zone | #Position` with separate zone/position tap targets that reopen the shared edit sheet on the matching side and send dirty-only `item_zone` updates through the existing `/api/v1/items/positions` mutation path.
- Updated a managers-app task page call site, testing-form defaults, and affected fixtures so the workspace typechecks cleanly against the widened contracts.

## Verification

- `npm run typecheck`: passed.

## Notes

- Playwright and Vitest runs were not executed in this pass.
