# SUMMARY_task_pages_to_package_20260703

## Metadata

- Summary ID: `SUMMARY_task_pages_to_package_20260703`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_pages_to_package_20260703.md`
- Implemented at (UTC): `2026-07-03T17:57:30Z`

## Implementation summary

- Moved the 9 managers-app task pages into `@beyo/tasks`, including the pin notifications controller/provider and the two pin surface contracts.
- Added `setItemUpholsteryAmount` plus `useSetItemUpholsteryAmount` to `@beyo/tasks`, and kept package invalidation limited to shared task/upholstery query keys.
- Updated the managers app task surface registry to lazy-load the moved pages from `@beyo/tasks` and removed the app-local page/controller/provider duplicates.
- Deleted the stale managers-app `useUpdateItem` and `useSetUpholsteryQuantity` actions after confirming the moved pages were their only consumers.

## Verification

- `npm run typecheck`: passed.

## Notes

- `npx playwright test --project=mobile` was not run in this pass.
