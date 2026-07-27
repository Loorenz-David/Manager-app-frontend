# SUMMARY_PLAN_task_list_card_to_package_20260627

## Metadata

- Summary ID: `SUMMARY_PLAN_task_list_card_to_package_20260627`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_list_card_to_package_20260627.md`
- Implemented at (UTC): `2026-06-27T12:08:11Z`

## Implementation summary

- Created a shared `TaskListCard` in `@beyo/tasks` with a package-safe props contract, shared task metadata rendering, preserved `tasks-card-*` testids, optional image/body/actions handlers, and a reusable `bottomAction` slot.
- Replaced the managers app local task card and the `@beyo/task-working-sections` quick-assign card with adapters that map their existing view models and raw list DTOs into the shared package component.
- Updated pending-upholstery cards to use the shared task card while preserving their upholstery action footer behavior, then removed the obsolete local card files and exports.

## Verification

- `npm run typecheck`: passed.

## Notes

- The repo already contained unrelated in-progress changes before this implementation; this summary covers only the task-card packaging work from the source plan.
