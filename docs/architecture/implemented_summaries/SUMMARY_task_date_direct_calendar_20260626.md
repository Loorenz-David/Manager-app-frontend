# SUMMARY_task_date_direct_calendar_20260626

## Metadata

- Summary ID: `SUMMARY_task_date_direct_calendar_20260626`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_date_direct_calendar_20260626.md`
- Implemented at (UTC): `2026-06-25T22:37:30Z`

## Implementation summary

- Replaced both intermediate task-date form sheets in `@beyo/tasks` with direct calendar sheets that render `DayCalendar` in-place and mutate immediately on valid selection.
- Simplified the task date surface prop contracts to package-owned `{ taskId }` payloads by removing calendar opener and prefill plumbing from `packages/tasks/src/surface-ids.ts`.
- Removed the managers app’s calendar-surface opener wiring from the task-detail flow so opening either pill now directly opens the package-owned calendar sheet.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
