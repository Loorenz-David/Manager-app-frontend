# SUMMARY_PLAN_task_step_aggregate_metrics_timer_20260621

## Metadata

- Plan ID: `PLAN_task_step_aggregate_metrics_timer_20260621`
- Implemented at (UTC): `2026-06-21T15:31:11Z`
- Summary owner: `codex`
- Archived plan: `docs/architecture/archives/implementation/PLAN_task_step_aggregate_metrics_timer_20260621.md`

## What changed

- Extended `TaskStepSchema` to parse the 9 new aggregate metric fields returned by the step endpoints.
- Added `totalWorkingSeconds` to `TaskStepCardViewModel` and mapped it from `total_working_seconds`.
- Extended `@beyo/ui` `TickingTimer` with `offsetSeconds`, so live timers now render accumulated working time plus the current working interval.
- Updated all active worker-app step timer surfaces to use the aggregate metrics:
  - `LastActiveStepCard`
  - `TaskStepCircularActionButton` on the detail page
  - `TaskStepActionButton` on the list card, which is a real timer surface in the current UI
- Added a shared `formatSecondsHHMMSS` helper for frozen paused / `ended_shift` timers, with `—` as the zero-state display when `total_working_seconds` is still `0`.

## Validation

- `npm run typecheck` passed.

## Notes

- This pass intentionally did not render the other new aggregate fields (`total_pause_seconds`, counts, or `total_cost_minor`); they are parsed for contract compatibility only.
- The implementation scope was widened slightly from the original plan to include `TaskStepActionButton`, because the current list-card UI still renders a timer there.
