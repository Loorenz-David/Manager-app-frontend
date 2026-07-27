# SUMMARY_calendar_picker_surface_wiring_20260625

## Metadata

- Summary ID: `SUMMARY_calendar_picker_surface_wiring_20260625`
- Source plan: `docs/architecture/archives/implementation/PLAN_calendar_picker_surface_wiring_20260625.md`
- Implemented at (UTC): `2026-06-25T21:54:23Z`

## Implementation summary

- Wired the Internal task-creation form's `TaskReadyByDateField` to open the package-owned single-date calendar surface through `useSurface()`.
- Wired the Return task-creation form's `TaskDeliveryDateField` and `TaskReadyByDateField` to open the package-owned range and single calendar surfaces.
- Wired the Pre-Order task-creation form's `TaskDeliveryDateField` and `TaskReadyByDateField` to open the package-owned range and single calendar surfaces.

## Verification

- `npm run typecheck`: passed.

## Notes

- Manual runtime validation was not run in this lifecycle pass.
