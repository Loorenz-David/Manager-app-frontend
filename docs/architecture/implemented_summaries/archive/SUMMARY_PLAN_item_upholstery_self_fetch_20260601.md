# SUMMARY_PLAN_item_upholstery_self_fetch_20260601

## Metadata

- Summary ID: `SUMMARY_PLAN_item_upholstery_self_fetch_20260601`
- Status: `summarized`
- Owner agent: `GitHub Copilot (GPT-5.3-Codex)`
- Created at (UTC): `2026-06-01T08:54:12Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_upholstery_self_fetch_20260601.md`

## What was implemented

- Added shared item-upholstery fetch types in `@beyo/tasks` (`ItemUpholsteryEntrySchema`, `UpholsteryRequirementEntrySchema`) with loose `source` and `state` typing to tolerate backend enum evolution.
- Added shared query flow in `packages/tasks` for `GET /api/v1/items/{itemId}/upholstery`: query keys, fetcher, and `useItemUpholsteryQuery(itemId)` hook.
- Updated `packages/tasks/src/index.ts` exports to expose the new schemas, types, keys, fetcher, and hook.
- Rewrote workers `TaskStepUpholsterySection` to self-fetch item upholstery/requirements and render joined entries without per-card `useUpholsteryQuery` calls.
- Removed `item_upholstery` and `requirements` from managers `TaskDetailRawSchema`, and removed derived `activeUpholstery` from `useTaskDetailController`.
- Rewrote managers `TaskUpholsterySection`, `ItemUpholsteryAmountSheetPage`, and `ItemQuantitySheetPage` to self-fetch via `useItemUpholsteryQuery(itemId)`.
- Updated mutation hooks `useSetUpholsteryQuantity` and `useUpdateItemUpholstery` to accept `itemId` and invalidate `itemUpholsteryKeys.byItem(itemId)`.
- Removed stale optimistic task-detail upholstery cache updates from `useSetUpholsteryQuantity` because task detail no longer owns upholstery payload.
- Updated Playwright `upholstery-swap.spec.ts` mocks: removed `item_upholstery` / `requirements` from task detail response and added explicit `**/api/v1/items/item_1/upholstery` route.

## Files changed

- `packages/tasks/src/types.ts`
- `packages/tasks/src/api/item-upholstery-keys.ts`
- `packages/tasks/src/api/fetch-item-upholstery.ts`
- `packages/tasks/src/api/use-item-upholstery-query.ts`
- `packages/tasks/src/index.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepUpholsterySection.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/controllers/use-task-detail.controller.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskUpholsterySection.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemQuantitySheetPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-set-upholstery-quantity.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item-upholstery.ts`
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/upholstery-swap.spec.ts`

## Contract adherence

- `architecture/35_shared_packages.md`: shared fetch flow was implemented in `packages/tasks` while app-owned UI components remained in their apps.
- `architecture/05_server_state.md`: introduced dedicated query keys and item-scoped invalidation to keep server-state cache coherent.
- `architecture/16_feature_workflow.md`: type/API/action/controller/component migration order was followed for safe incremental changes.

## Validation evidence

- `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`: pass
- `npm run typecheck` in `apps/workers-app/ManagerBeyo-app-workers`: pass
- `npm run typecheck` in workspace root: fail (`Missing script: "typecheck"`)
- `npx playwright test --grep "upholstery swap" --project=mobile`: not run in this pass

## Known gaps or deferred items

- Playwright upholstery-swap spec was updated but not executed in this pass.
- No additional workers-app e2e coverage was added (out of current plan scope).

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_item_upholstery_self_fetch_20260601_0854.md`
