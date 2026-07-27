# SUMMARY_PLAN_35_task_step_cases_summary_20260529

## Metadata

- Summary ID: `SUMMARY_PLAN_35_task_step_cases_summary_20260529`
- Status: `summarized`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-29T16:51:39Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_35_task_step_cases_summary_20260529.md`
- Related debug plan (optional): `-`

## What was implemented

- Added `cases_summary` parsing and `casesSummary` view-model mapping to workers task step types.
- Extended the shared cases view controller/provider to accept optional `entity_client_id` and `entity_type` filters.
- Exported `CasesView` from `@beyo/cases` and added a workers-only `TaskCasesSlidePage` surface filtered to the current task.
- Registered `TASK_CASES_SLIDE_SURFACE_ID` in workers case surfaces and routed task-step case entry through smart branching: create case, open single unread conversation, or open filtered task cases list.
- Exposed `casesSummary` on the task detail controller and updated the task detail header/footer plus task cards to render unread case badges.

## Files changed

- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepDetailHeader.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/TaskStepCard.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskCasesSlidePage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`
- `packages/cases/src/controllers/use-cases-view.controller.ts`
- `packages/cases/src/providers/CasesViewProvider.tsx`
- `packages/cases/src/index.ts`

## Validation

- `npm run typecheck` passed in `apps/workers-app/ManagerBeyo-app-workers`.
- `npm run typecheck` passed in `apps/managers-app/ManagerBeyo-app-managers`.
- `npm run typecheck --workspaces` at repo root is not a valid repo-wide gate today because multiple workspaces do not define a `typecheck` script.

## Known gaps or deferred items

- Monorepo root validation remains incomplete as a single command: several workspaces/packages still lack a `typecheck` script, so repo-wide `npm run typecheck --workspaces` cannot currently serve as the acceptance gate.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_35_task_step_cases_summary_20260529_1651.md`
