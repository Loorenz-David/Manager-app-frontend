# SUMMARY_PLAN_task_detail_slide_to_package_20260703

## Metadata

- Summary ID: `SUMMARY_PLAN_task_detail_slide_to_package_20260703`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_detail_slide_to_package_20260703.md`
- Implemented at (UTC): `2026-07-03T17:12:19Z`

## Implementation summary

- Moved the manager task-detail slide stack into `@beyo/tasks`, including the task detail flow, controller, provider, page loader, and the new surface contracts for task edit, quantity, upholstery amount, and flow-record detail openings.
- Added the task/item mutation APIs and hooks needed by that slide to package boundaries: task delete/resolve/update in `@beyo/tasks`, item upholstery create/update in `@beyo/items`, and the task-owned item mutation wrappers in `@beyo/tasks`.
- Rewired the managers app to lazy-load `loadTaskDetailSlidePage()` from `@beyo/tasks`, consume the migrated surface IDs/types from package exports, and remove the obsolete local task-detail/task-mutation/item-upholstery implementations.
- Preserved the managers-only pending-upholstery and sheet flows by repointing them to the new package APIs instead of the deleted local files.

## Verification

- `npm run typecheck`: passed.

## Notes

- `ContentCard` and `DashedInfoGroup` were already exported by `@beyo/ui` in the current repo shape, so the migration reused the existing package primitives instead of creating duplicate component files.
