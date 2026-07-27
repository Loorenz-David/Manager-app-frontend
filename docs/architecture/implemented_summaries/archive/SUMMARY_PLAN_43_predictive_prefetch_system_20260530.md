# SUMMARY_PLAN_43_predictive_prefetch_system_20260530

## Metadata

- Summary ID: `SUMMARY_PLAN_43_predictive_prefetch_system_20260530`
- Status: `summarized`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T14:54:05Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_43_predictive_prefetch_system_20260530.md`
- Related debug plan (optional): `-`

## What was implemented

- Added shared `usePrefetchOnCondition` in `@beyo/ui` and exported it from the UI package barrel.
- Added `prefetchCasesData(queryClient, caseIds)` in `@beyo/cases` and exported it from the cases package barrel.
- Switched both apps' tab badge controllers from `useGlobalCaseUnreadCountQuery` to `useUnreadCountsQuery`, while preserving badge display behavior by deriving the total from the unread map.
- Wired cases signal-based predictive prefetch in both apps' tab badge controllers:
  - preloads case conversation bundle
  - warms case detail queries for unread case IDs
- Exported `preloadCaseConversationSlideSurface` from managers/workers case surfaces.
- Exported `preloadTaskDetailSlideSurface` (and actions sheet preload) from workers `task_steps/surfaces.ts`.
- Added workers home controller predictive prefetch when sections have active counts (`paused + working + ended_shift > 0`):
  - preloads task detail surface bundle
  - prefetches first page of section steps for active sections.
- Migrated managers `task-creation/surfaces.ts` from bare `React.lazy` to `lazyWithPreload` and exported all three preload functions.
- Added managers `prefetchTaskCreationFormData(queryClient)` utility to warm item categories and working sections picker data.
- Wired task creation data prefetch into all three managers task creation forms (`Internal`, `PreOrder`, `Return`) via `usePrefetchOnCondition(true, ...)`.
- Updated managers `TaskCreationFab` to preload all three task creation slide bundles on mount.
- Extended `architecture/30_dynamic_loading_local.md` with the documented `prefetchXxx` pattern and `usePrefetchOnCondition` usage semantics.

## Files changed

- `packages/ui/src/lib/use-prefetch-on-condition.ts`
- `packages/ui/src/index.ts`
- `packages/cases/src/api/prefetch-cases.ts`
- `packages/cases/src/index.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-tab-badge-counts.controller.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/hooks/use-tab-badge-counts.controller.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/controllers/use-working-sections-home.controller.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/lib/prefetch-task-creation-form-data.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/InternalFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/PreOrderFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/ReturnFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/TaskCreationFab.tsx`
- `architecture/30_dynamic_loading_local.md`

## Validation evidence

- `npm run typecheck` (in `apps/managers-app/ManagerBeyo-app-managers`): pass
- `npm run typecheck` (in `apps/workers-app/ManagerBeyo-app-workers`): pass
- `npm run typecheck` (repo root): not available (`Missing script: typecheck`)
- `npm run typecheck` (in `packages/cases`): not available (`Missing script: typecheck`)
- `npm run typecheck` (in `packages/ui`): not available (`Missing script: typecheck`)

## Known gaps or deferred items

- Playwright runtime/mobile validation was not run in this pass.
- Manual UX validation of warm cache behavior (no suspense/skeleton flash) remains recommended.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_43_predictive_prefetch_system_20260530_1454.md`
