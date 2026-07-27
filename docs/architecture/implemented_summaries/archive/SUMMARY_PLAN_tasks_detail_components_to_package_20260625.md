# SUMMARY_PLAN_tasks_detail_components_to_package_20260625

## Metadata

- Summary ID: `SUMMARY_PLAN_tasks_detail_components_to_package_20260625`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-25T11:01:10Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_tasks_detail_components_to_package_20260625.md`
- Related debug plan (optional): `—`

## What was implemented

- Added the missing shared task detail surface to `@beyo/tasks`: detail components, `taskKeys`, the shared `task-detail` utility module, and the task enums/detail types those files depend on.
- Refactored the migrated detail components to receive data and callbacks via props, keeping managers-app-only item flows and mutation wiring in `TaskDetailSlidePage.tsx`.
- Removed the managers app’s duplicate `features/tasks/components/detail/` implementation and the local `features/tasks/lib/task-detail.ts`, then redirected all remaining consumers to `@beyo/tasks`.

## Files changed

- `packages/tasks/package.json`: added the peer dependencies required by the new detail component surface.
- `packages/tasks/src/types.ts`: added task enums, `TaskDetailRaw`, `ImageLight`, and `ListTasksFullParams`.
- `packages/tasks/src/api/task-keys.ts`: created the shared task query-key factory.
- `packages/tasks/src/lib/task-detail.ts`: created the shared task detail utility module.
- `packages/tasks/src/components/detail/`: added the eight migrated detail components, two migrated tests, and a barrel export.
- `packages/tasks/src/index.ts`: exported the new types, utilities, query keys, and detail components.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`: switched to package detail components and injected app-local flows/renderers as props.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/task-keys.ts`: reduced to a single-line re-export from `@beyo/tasks`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskListCard.tsx`, `src/pages/tasks/TaskScheduledDateSheetPage.tsx`, `src/components/cases/CaseTaskInfoCard.tsx`, `src/features/upholstery-ordering/components/OrderingItemCard.tsx`, `src/features/tasks/controllers/use-task-detail.controller.ts`, `src/features/tasks/controllers/use-task-working-sections.controller.ts`: moved shared task-detail imports to `@beyo/tasks`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/` and `src/features/tasks/lib/task-detail.ts`: deleted the local duplicate implementation.

## Contract adherence

- `architecture/35_shared_packages.md §6`: managers-app now consumes the migrated task detail components and utilities from the package public surface.
- `architecture/35_shared_packages.md §13`: the package components no longer read app-local context and instead receive injected values/callbacks from the app page layer.
- `architecture/16_feature_workflow.md`: package types and shared utilities were established before rewiring the page/component layer.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- `TaskBodyCategoryRow` still depends on the managers app’s item-category picker flow, but that dependency is now isolated to prop injection in `TaskDetailSlidePage.tsx` instead of the shared package.
- `TaskUpholsterySection` still relies on the managers app’s `ItemUpholsteryField` renderer, also injected from `TaskDetailSlidePage.tsx`; migrating that item field into `@beyo/items` was left out of scope.
- I did not run runtime smoke tests for the task detail slide after the package migration.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_tasks_detail_components_to_package_20260625.md`
