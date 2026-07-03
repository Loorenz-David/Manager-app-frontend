# SUMMARY_task_assortment_field_and_pill_20260703

## Metadata

- Summary ID: `SUMMARY_task_assortment_field_and_pill_20260703`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_assortment_field_and_pill_20260703.md`
- Implemented at (UTC): `2026-07-03T10:43:57Z`

## Implementation summary

- Renamed the return-form item position label to "Current Position" and added an optional `assortment` field that only renders for `store_return` tasks.
- Extended the return-form schema, staged-step field map, default/reset values, and payload normalization so assortment is submitted as `assortment` on task creation.
- Added a package-owned `TaskAssortmentPill`, `TaskAssortmentSheetPage`, and assortment sheet surface contract in `@beyo/tasks`, then wired the managers task-detail flow and surface registry so store-return task details can edit assortment through `updatePostHandling`.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
