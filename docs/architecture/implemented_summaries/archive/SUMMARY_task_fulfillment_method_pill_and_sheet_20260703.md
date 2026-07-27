# SUMMARY_task_fulfillment_method_pill_and_sheet_20260703

## Metadata

- Summary ID: `SUMMARY_task_fulfillment_method_pill_and_sheet_20260703`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_fulfillment_method_pill_and_sheet_20260703.md`
- Implemented at (UTC): `2026-07-03T10:12:28Z`

## Implementation summary

- Added a shared `updatePostHandling` API function and `useUpdatePostHandling` optimistic mutation in `@beyo/tasks`, and migrated the existing scheduled-delivery save path from `PATCH /schedule` to `PATCH /post-handling`.
- Added a package-owned `TaskFulfillmentMethodPill`, `TaskFulfillmentMethodSheetPage`, and fulfillment-method sheet surface contract so `pre_order` task details can update `fulfillment_method` with a single tap.
- Wired the managers task-detail flow and surface registry to open the new fulfillment sheet from `TaskScheduledDeliverySection`, while keeping the pill hidden for `return` and `internal` tasks.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
