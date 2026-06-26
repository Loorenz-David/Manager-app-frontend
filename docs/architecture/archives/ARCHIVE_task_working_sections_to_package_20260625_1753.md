# ARCHIVE_task_working_sections_to_package_20260625_1753

## Metadata

- Archive ID: `ARCHIVE_task_working_sections_to_package_20260625_1753`
- Archived at (UTC): `2026-06-25T17:53:39Z`
- Owner agent: `codex`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_working_sections_to_package_20260625.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_task_working_sections_to_package_20260625.md`

## Outcome

- Moved the working-sections slide feature from the managers app into `@beyo/tasks`.
- Replaced package-internal surface state access with injected `TaskWorkingSectionsSurfaceOpeners`.
- Updated managers-app surface registration and task-detail flow wiring to consume the package-owned working-sections surfaces and task query hooks.
- Removed the superseded managers-app-local working-sections implementation files.

## Validation

- `npm run typecheck`: pass.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
