# SUMMARY_task_date_pills_and_sheets_20260625

## Metadata

- Summary ID: `SUMMARY_task_date_pills_and_sheets_20260625`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_date_pills_and_sheets_20260625.md`
- Implemented at (UTC): `2026-06-25T22:13:15Z`

## Implementation summary

- Added shared `formatShortDate` and `isoWeek` utilities to `@beyo/lib`, then moved task week formatting to the shared export boundary.
- Reworked `@beyo/tasks` task-detail schedule rendering into package-owned `TaskReadyByAtPill` and `TaskScheduledDeliveryDatePill` components, plus two package-owned sheet pages for editing ready-by and delivery-window dates.
- Added focused `PATCH /ready-by-at` and `PATCH /schedule` task mutations in `@beyo/tasks` with optimistic detail-cache updates, rollback, and detail/list invalidation.
- Rewired the managers app task surfaces and task-detail flow to open the new package sheets and inject app-owned calendar picker openers, then removed the obsolete local combined `TaskScheduledDateSheetPage`.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
