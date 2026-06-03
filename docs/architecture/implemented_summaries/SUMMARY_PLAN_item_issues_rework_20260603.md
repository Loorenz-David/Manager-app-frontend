# SUMMARY_PLAN_item_issues_rework_20260603

## Metadata

- Summary ID: `SUMMARY_PLAN_item_issues_rework_20260603`
- Status: `summarized`
- Owner agent: `Codex (GPT-5)`
- Created at (UTC): `2026-06-03T10:16:55Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_issues_rework_20260603.md`

## What was implemented

- Added a new `@beyo/item-issues` package with the new backend contract types, issue-type and item-issue queries, batch create/delete save action, surface ids, issue-selection helpers, the preview pill section, and the animated item-issue selection sheet.
- Replaced the workers task-detail issue preview with the new package, registered the new bottom-sheet surface, and wired pending-to-working transitions so configured issue types open the issue sheet before the state change.
- Threaded `onConfirm` through the dependency warning sheet so "Start anyway" still runs the pre-start issue check instead of bypassing it.
- Prefetched issue types for every worker working section on home load so the start guard can synchronously inspect the cache without a spinner.
- Removed the old issue-category-config / fast-issue implementation from `@beyo/tasks`.
- Cleaned the managers app of obsolete issue surfaces and preview UI; task-creation/testing forms now keep the `item_issues` payload field but no longer expose the removed issue picker UI.

## Files changed

- `packages/item-issues/`: new shared package for the issue-type based item issue flow.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/`: new pre-start guard helper, updated controllers, new issue sheet surface wiring, dependency warning callback, and detail preview integration.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/controllers/use-working-sections-home.controller.ts`: issue-type prefetch added.
- `packages/tasks/src/`: old issue APIs, UI, store, flow, and surface exports removed; non-issue task exports retained.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/` and task-creation/testing/task-detail files: removed obsolete issue UI and surface registrations while preserving local form schemas.

## Contract adherence

- `architecture/05_server_state.md`: kept request parsing in package API helpers, used TanStack queries for section/category-scoped caches, and applied optimistic cache updates plus invalidation in the save action.
- `architecture/08_hooks.md`: kept mutation logic inside an action hook and controller orchestration inside workers-app controllers.
- `architecture/28_surfaces.md` and `architecture/30_dynamic_loading.md`: registered the new issue sheet as a worker `sheet` surface with lazy loading and preload hooks.
- `architecture/35_shared_packages.md`: implemented the new issue flow as a self-contained shared package rather than embedding it directly in the workers app.

## Validation evidence

- `npm run typecheck`: `pass` in `apps/workers-app/ManagerBeyo-app-workers`
- `npm run typecheck`: `pass` in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: `not run`
- `npx playwright test --project=mobile`: `not run`

## Known gaps or deferred items

- Real-time invalidation for `issueTypeKeys.all()` is still deferred until the workers-app socket/event binding location is chosen.
- The managers app intentionally has no replacement issue UI in this plan; only obsolete issue surfaces and preview references were removed.

## Handoff notes (if needed)

- Backend contract source: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_issue_system_rework_contract_20260603.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_item_issues_rework_20260603_1016.md`
