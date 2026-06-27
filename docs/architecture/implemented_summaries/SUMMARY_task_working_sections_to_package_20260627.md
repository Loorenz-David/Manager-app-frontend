# SUMMARY_task_working_sections_to_package_20260627

## Metadata

- Summary ID: `SUMMARY_task_working_sections_to_package_20260627`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_working_sections_to_package_20260627.md`
- Implemented at (UTC): `2026-06-27T10:00:16Z`

## Implementation summary

- Created a new `@beyo/task-working-sections` workspace package and moved the working-sections controller, provider, step list, slide page, discard sheet page, and working-sections surface contracts into it.
- Removed the moved working-sections exports from `@beyo/tasks`, leaving task date surfaces and the in-detail `TaskWorkingSectionsField` in `@beyo/tasks`.
- Updated the managers app to depend on `@beyo/task-working-sections`, register its Tailwind source path, lazy-load the new package pages, and read the working-sections surface IDs and prop types from the new package boundary.

## Verification

- `npm run typecheck`: passed.
- `npm run build --workspace managerbeyo-app-managers`: passed.

## Notes

- Managers build verification required repairing missing optional native packages in local `node_modules`; no application code changes were needed for that environment issue.
