# ARCHIVE_task_date_direct_calendar_20260626_2237

## Metadata

- Archive ID: `ARCHIVE_task_date_direct_calendar_20260626_2237`
- Archived at (UTC): `2026-06-25T22:37:30Z`
- Owner agent: `codex`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_date_direct_calendar_20260626.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_task_date_direct_calendar_20260626.md`

## Outcome

- Reduced the managers task-detail date-edit flow from nested picker sheets plus explicit Save actions to direct calendar sheets with immediate mutation on selection.
- Removed the now-unneeded task date sheet opener/prefill contract surface from `@beyo/tasks` and simplified the managers flow wiring accordingly.
- Preserved the previous task-date fixes: shared `@beyo/lib` `isoWeek` usage and Unicode `→` short-date formatting.

## Validation

- `npm run typecheck`: pass.

## Notes

- Manual UI validation and Playwright were not run in this lifecycle pass.
