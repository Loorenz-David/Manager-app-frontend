# ARCHIVE_task_working_sections_package_corrections_20260625_1823

## Metadata

- Archive ID: `ARCHIVE_task_working_sections_package_corrections_20260625_1823`
- Archived at (UTC): `2026-06-25T18:23:12Z`
- Owner agent: `codex`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_working_sections_package_corrections_20260625.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_task_working_sections_package_corrections_20260625.md`

## Outcome

- Removed the dead working-sections preload export and stabilized the working-sections slide opener wiring with `useMemo`.
- Loosened `useSurfaceProps` so package-owned surface props preserve function-valued fields and removed the downstream cast in the working-sections slide page.
- Replaced package-internal calendar surface opens in the two task date fields with injected opener props and updated managers-app callers to provide those openers.

## Validation

- `npm run typecheck`: pass.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
