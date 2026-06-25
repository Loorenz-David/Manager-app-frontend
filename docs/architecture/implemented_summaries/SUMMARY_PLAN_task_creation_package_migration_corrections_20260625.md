# SUMMARY_PLAN_task_creation_package_migration_corrections_20260625

## Metadata

- Summary ID: `SUMMARY_PLAN_task_creation_package_migration_corrections_20260625`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-25T10:09:47Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_creation_package_migration_corrections_20260625.md`
- Related debug plan (optional): `—`

## What was implemented

- Repointed managers-app task-creation-related calendar preload calls to `@beyo/task-creation` so the warmed chunk now matches the surface registrations that actually render.
- Removed the redundant `calendarSurfaces` import and spread from the managers app surface registry because those entries were already overridden by `taskCreationSurfaces`.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskReadyByDateField.tsx`: moved `preloadCalendarSinglePickerSurface` import to `@beyo/task-creation`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskDeliveryDateField.tsx`: moved `preloadCalendarRangePickerSurface` import to `@beyo/task-creation`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx`: moved both calendar preload imports to `@beyo/task-creation`.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskScheduledDateSheetPage.tsx`: moved both calendar preload imports to `@beyo/task-creation`.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`: removed the dead `calendarSurfaces` import and spread.

## Contract adherence

- `architecture/35_shared_packages.md §6`: consumed preload helpers from the package’s public API instead of the app-local calendar module.
- `architecture/30_dynamic_loading.md`: aligned `usePreloadSurface` with the same package-owned chunks that are registered in the active surface registry.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- The orphaned local calendar page files and `components/primitives/date/surfaces.ts` remain in place intentionally; this correction only fixed consumers and registry dead code.
- I did not run runtime smoke tests for the calendar surfaces after the preload correction.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_task_creation_package_migration_corrections_20260625.md`
