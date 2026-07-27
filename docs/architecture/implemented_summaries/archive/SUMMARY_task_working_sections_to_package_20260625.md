# SUMMARY_task_working_sections_to_package_20260625

## Metadata

- Summary ID: `SUMMARY_task_working_sections_to_package_20260625`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_working_sections_to_package_20260625.md`
- Implemented at (UTC): `2026-06-25T17:53:39Z`

## Implementation summary

- Moved the working-sections slide feature into `@beyo/tasks`, including its surface IDs, task query/mutation API files, action hooks, controller, provider, step-list component, and both working-sections pages.
- Reworked the package boundary to inject surface behavior through `TaskWorkingSectionsSurfaceOpeners`, so the package controller no longer reaches into app-local `useSurface` or `useSurfaceStore`.
- Updated the managers app to lazy-load the package-owned working-sections pages, assemble the slide/discard/reopen/preload surface openers in `use-task-detail.flow.ts`, and consume the moved task query types/hooks from `@beyo/tasks`.
- Removed the old managers-app-local working-sections implementation files and aligned the package task schema with the managers app by restoring the `item_location` enum typing.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
