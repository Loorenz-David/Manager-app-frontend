# SUMMARY_item_fast_issue_sheet_package_20260601

## Metadata

- Summary ID: `SUMMARY_item_fast_issue_sheet_package_20260601`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-01T09:02:31Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_fast_issue_sheet_package_20260601.md`
- Related debug plan (optional): `—`

## What was implemented

- Moved the fast issue editing surface into `packages/tasks` as a shared page plus shared field, issue-category-config fetch path, create/delete mutations, picker flow, Zustand cache, and surface ids.
- Updated `TaskIssuesSection` to use `surfaceOpeners` instead of a raw callback so both apps can opt into the shared sheet opener while still supporting read-only rendering.
- Rewired the managers app to load the shared sheet from its surface registry and removed the managers-only issue sheet/action/query modules that are now package-owned.
- Wired the workers app to register the shared issue sheet surface and pass `issuesSurfaceOpeners` from the task-step detail controller, so workers can now open the issue sheet from the task detail page.
- Folded in the new batch delete backend contract for the shared sheet save flow so multi-remove issue edits use one delete request before invalidating `itemIssueKeys.byItem(itemId)`.

## Files changed

- `packages/tasks/src/*`: added shared issue surface ids, issue-category-config query modules, issue create/delete APIs and hooks, batch delete support, picker flow/store, `ItemIssuesField`, and `ItemFastIssueSheetPage`.
- `packages/tasks/package.json`: added `@beyo/hooks`, `react-hook-form`, and `zustand` peer dependencies for the shared sheet runtime.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/*`: replaced `openIssueSheet` with `issuesSurfaceOpeners` and removed controller ownership of the old delete hook.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/*`: switched surface registration to the package page, re-exported the shared `ItemIssuesField`, and deleted the superseded managers-only fast-issue modules.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/*`: registered the shared fast-issue sheet, added `issuesSurfaceOpeners` to the controller, and passed them into `TaskIssuesSection`.

## Contract adherence

- `architecture/35_shared_packages.md`: the issue edit sheet and its supporting logic now live in `packages/tasks`, and both apps open it through injected surface openers.
- `architecture/05_server_state.md`: issue-category-config and item-issue mutations/queries use dedicated key factories and TanStack Query hooks within the shared package.
- `architecture/08_hooks.md`: shared create/delete hooks invalidate only `itemIssueKeys.byItem(itemId)`, matching the post-`item_issues` task-detail contract.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run typecheck`: pass, executed in `apps/workers-app/ManagerBeyo-app-workers`
- `npm run build`: not run
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- The shared issue sheet now opens in the workers app, but actual create/delete runtime behavior there still depends on backend role permissions for the worker account used in testing.
- The severity picker remains disabled exactly as scoped; the shared page only creates issues by `issue_type_id`.

## Handoff notes (if needed)

- Backend batch delete contract consumed from `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_issues_batch_delete_contract_20260601.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_item_fast_issue_sheet_package_20260601.md`
