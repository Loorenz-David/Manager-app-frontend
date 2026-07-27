# SUMMARY_item_issues_self_fetch_20260601

## Metadata

- Summary ID: `SUMMARY_item_issues_self_fetch_20260601`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-01T08:22:34Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_issues_self_fetch_20260601.md`
- Related debug plan (optional): `—`

## What was implemented

- Replaced the package-level task issues surface with a self-fetching `itemId`-driven design built on a new shared `GET /api/v1/items/{client_id}/issues` query in `packages/tasks`.
- Switched both task detail pages to pass only `itemId` into `TaskIssuesSection`, so workers now get live issue display without parent data wiring and managers no longer depend on `taskDetail.item_issues`.
- Removed `item_issues` from the managers task detail schema and moved the fast issue sheet initialization to the shared `useItemIssuesQuery` hook.
- Added item-issue cache invalidation to the managers create/delete issue mutations so shared issue sections refetch after edits.

## Files changed

- `packages/tasks/src/*`: removed the temporary issue-category-config path, added `ItemIssueSchema`, item-issue query keys/fetch hook, and rewired `TaskIssuesSection` to self-fetch from `itemId`.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`: changed the shared issue section call site to `itemId`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`: removed `item_issues` from `TaskDetailRawSchema`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-create-item-issue.ts` and `use-delete-item-issue.ts`: added `itemIssueKeys.byItem(itemId)` invalidation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/pages/ItemFastIssueSheetPage.tsx`: switched initial issue loading to `useItemIssuesQuery(itemId)`.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepItemDetailsSection.tsx`: now passes `step.item.client_id` into the shared issue section.

## Contract adherence

- `architecture/04_api_client.md` and `04_api_client_local.md`: the new shared fetcher uses `apiClient.get` with the standard backend envelope parser.
- `architecture/05_server_state.md`: the item-issues query path now has its own key factory and TanStack Query hook with missing-key fallback and `enabled` gating.
- `architecture/07_components.md`: `TaskIssuesSection` is now self-contained at the package boundary and consumes only caller props.
- `architecture/08_hooks.md`: managers issue mutations invalidate both task detail data and the new shared item-issues query key.
- `architecture/35_shared_packages.md`: shared logic remains inside `packages/tasks`, and both apps consume the same package surface.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run typecheck`: pass, executed in `apps/workers-app/ManagerBeyo-app-workers`
- `npm run build`: not run
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- Workers still have no issue edit surface; this plan only enables live read display through the shared query.
- No dedicated error UI was added for the issue section; on fetch failure the section stays hidden unless `onAddIssue` is available, matching the plan scope.

## Handoff notes (if needed)

- Backend contract consumed from `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_issues_by_item_id_contract_20260601.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_item_issues_self_fetch_20260601.md`
