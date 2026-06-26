# ARCHIVE_task_date_pills_and_sheets_20260625_2213

## Metadata

- Archive ID: `ARCHIVE_task_date_pills_and_sheets_20260625_2213`
- Archived at (UTC): `2026-06-25T22:13:15Z`
- Owner agent: `codex`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_date_pills_and_sheets_20260625.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_task_date_pills_and_sheets_20260625.md`

## Outcome

- Replaced the task detail section’s single delivery-week control with separate always-visible ready-by and delivery-window pills owned by `@beyo/tasks`.
- Added package-owned task date sheet pages and focused schedule/ready-by mutations so the managers app no longer owns the combined task-date sheet implementation.
- Moved short-date and ISO-week formatting to shared `@beyo/lib` utilities and updated task detail rendering to consume them through package exports.

## Validation

- `npm run typecheck`: pass.

## Notes

- Manual UI validation and Playwright were not run in this lifecycle pass.
