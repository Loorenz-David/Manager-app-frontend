# SUMMARY_PLAN_pin_notifications_20260620

## Metadata

- Plan ID: `PLAN_pin_notifications_20260620`
- Implemented at (UTC): `2026-06-20T15:44:44Z`
- Summary owner: `codex`
- Archived plan: `docs/architecture/archives/implementation/PLAN_pin_notifications_20260620.md`

## What changed

- Added notification pin client logic in `@beyo/notifications`: pin DTO/Zod schemas, `npin_` client-id generation, list/create/delete/update API functions, hydration query, and diff-based save action.
- Updated `@beyo/lib` `NotificationPin` client-id prefix from `npn` to `npin` and synced `docs/architecture/backend/tables/client_id_prefix_map.md`.
- Added shared `@beyo/tasks` task-step-by-task read for `GET /api/v1/tasks/{task_id}/steps`, exported as `useTaskStepsByTaskQuery`.
- Added workers pin notification slide and nested task-step state sheet, opened from the existing task-step actions sheet.
- Added managers pin notification slide and nested task-step state sheet, opened from the registered task actions menu.
- Threaded `itemId` into workers and managers actions surfaces so the single item upholstery entry can be resolved and pinned.

## Validation

- `npm run typecheck` passed.

## Notes

- The registered managers actions surface is `TaskDetailMenuSheetPage`; that is where the pin action was implemented.
- Broad Playwright coverage from the plan was not added in this pass. The completed quality gate for this implementation is the requested `npm run typecheck`.
