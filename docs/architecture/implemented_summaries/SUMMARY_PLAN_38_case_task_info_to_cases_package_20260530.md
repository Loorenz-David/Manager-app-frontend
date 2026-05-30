# SUMMARY_PLAN_38_case_task_info_to_cases_package_20260530

## Metadata

- Summary ID: `SUMMARY_PLAN_38_case_task_info_to_cases_package_20260530`
- Status: `summarized`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T09:22:49Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_38_case_task_info_to_cases_package_20260530.md`
- Related debug plan (optional): `-`

## What was implemented

- Added `CaseConversationSurfaceOpeners` to `@beyo/cases` surface types and threaded optional `surfaceOpeners` through conversation surface props.
- Added optional `renderTaskCard?: (taskId: string) => ReactNode` to `CaseTaskInfoSheetSurfaceProps` for app-injected task-card rendering.
- Updated `CaseConversationRouteEntry` and `CaseConversationProvider` to accept and forward `surfaceOpeners`.
- Extended `useCaseConversationController` options with `surfaceOpeners` and passed `renderTaskCard: options.surfaceOpeners?.renderLinkedTaskCard` when opening `CASE_TASK_INFO_SHEET_SURFACE_ID`.
- Exported `CaseConversationSurfaceOpeners` from the `@beyo/cases` public API.

## Files changed

- `packages/cases/src/surface-ids.ts`
- `packages/cases/src/components/CaseConversationRouteEntry.tsx`
- `packages/cases/src/providers/CaseConversationProvider.tsx`
- `packages/cases/src/controllers/use-case-conversation.controller.ts`
- `packages/cases/src/index.ts`
- `packages/cases/tsconfig.json`

## Validation evidence

- `npx tsc --noEmit` (in `packages/cases`): pass
- `npm run typecheck` (in `apps/workers-app/ManagerBeyo-app-workers`): pass
- `npm run typecheck` (in `apps/managers-app/ManagerBeyo-app-managers`): pass
- `npx playwright test --project=mobile`: not run for this lifecycle closure
- `npx playwright test --project=desktop`: not run for this lifecycle closure

## Known gaps or deferred items

- Managers-app integration wiring (`surfaceOpeners` caller wiring and sheet renderer consumption) remains in Plan 37 scope, not Plan 38 package scope.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_38_case_task_info_to_cases_package_20260530_0922.md`
