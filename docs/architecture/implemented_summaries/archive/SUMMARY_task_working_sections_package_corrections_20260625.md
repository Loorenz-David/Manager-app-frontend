# SUMMARY_task_working_sections_package_corrections_20260625

## Metadata

- Summary ID: `SUMMARY_task_working_sections_package_corrections_20260625`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_working_sections_package_corrections_20260625.md`
- Implemented at (UTC): `2026-06-25T18:23:12Z`
- Parent plan: `docs/architecture/archives/implementation/PLAN_task_working_sections_to_package_20260625.md`

## Implementation summary

- Removed the dead `preloadTaskWorkingSectionsSurface` export from the managers-app task surfaces and confirmed there are no remaining callers.
- Memoized the `surfaceOpeners` object in `use-task-detail.flow.ts`, changed `useSurfaceProps` to accept `T extends object`, and removed the no-longer-needed `surfaceOpeners` cast in the package-owned working-sections slide page.
- Corrected the remaining §13 package-boundary violations in `TaskReadyByDateField` and `TaskDeliveryDateField` by replacing direct `useSurfaceStore` calls with injected calendar opener props.
- Updated the managers app callers in `TaskScheduledDateSheetPage` and `TestingFormsContent` to open the calendar surfaces through app-local `useSurface()`.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
