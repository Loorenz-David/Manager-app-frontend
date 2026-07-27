# SUMMARY_PLAN_36_task_step_cases_summary_live_routing_20260529

## Metadata

- Summary ID: `SUMMARY_PLAN_36_task_step_cases_summary_live_routing_20260529`
- Status: `summarized`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-29T17:22:29Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_36_task_step_cases_summary_live_routing_20260529.md`
- Related debug plan (optional): `-`

## What was implemented

- Simplified workers task-step `CasesSummarySchema` to `total_unread` only while keeping nullable/optional envelope handling in the task-step schema.
- Exported `useUnreadCountsQuery` and `CasesViewControllerParams` from `@beyo/cases` package index for consumers.
- Reworked `useTaskStepDetailController` to derive routing from live task-scoped case queries (`useListCasesQuery` + `useUnreadCountsQuery`) via `liveCasesSummary`.
- Updated `handleOpenCasesForTask` routing logic to use live counts: open creation for zero open/resolving cases, open conversation for exactly one unread case, otherwise open task cases slide.
- Exposed `liveCasesSummary` on `TaskStepDetailController` and switched task detail page badge source to `controller.liveCasesSummary.totalUnread`.
- Removed the duplicate footer `Cases` button per user request and kept header as the only entry point.

## Files changed

- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`
- `packages/cases/src/index.ts`

## Validation evidence

- `npm run typecheck`: pass (`apps/workers-app/ManagerBeyo-app-workers`)
- `npm run typecheck`: pass (`apps/managers-app/ManagerBeyo-app-managers`)
- `npm run test`: not run (not requested in this implementation turn)
- `npx playwright test --project=mobile`: not run (not requested in this implementation turn)
- `npx playwright test --project=desktop`: not run (not requested in this implementation turn)

## Known gaps or deferred items

- Task detail footer unread badge acceptance from plan was superseded by user-directed UI change: footer `Cases` entry was removed, leaving header as the only cases access point.
- Header badge is currently under active user animation testing path and still uses a temporary local constant in header component.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_36_task_step_cases_summary_live_routing_20260529_1722.md`
