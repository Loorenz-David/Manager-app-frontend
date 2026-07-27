# SUMMARY_PLAN_cases_schema_fab_creation_20260628

## Metadata

- Summary ID: `SUMMARY_PLAN_cases_schema_fab_creation_20260628`
- Source plan: `docs/architecture/archives/implementation/PLAN_cases_schema_fab_creation_20260628.md`
- Implemented at (UTC): `2026-06-28T21:16:02Z`

## Implementation summary

- Added `reference_number` and `scalar_id` to the cases package DTO schemas, and updated the create-case API/mutation typing to return the created case identifiers from the backend response.
- Updated the cases list UI so each card can render the human-readable reference number and use an absolute unread badge, then added a bottom-right FAB in `CasesView` to open standalone case creation.
- Wired the managers app to the existing package-owned case creation, case type picker, and participant picker route entries through new page wrappers and registered surfaces.
- Added a workers-app follow-up so the shared cases FAB accepts an app-provided bottom offset, and the workers cases page lifts the FAB to `bottom-[calc(var(--safe-bottom,0px)+9rem)]` while the shell `LastActiveStepCard` is visible.

## Verification

- `npm run typecheck`: passed.
- `npm run typecheck` after the workers FAB offset follow-up: passed.

## Notes

- `npx playwright test --project=mobile` was not run for this implementation.
