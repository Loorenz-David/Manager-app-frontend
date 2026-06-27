---
name: project_task_steps_dedicated_endpoints
description: PLAN_task_steps_dedicated_endpoints_20260627; dedicated step list + counts endpoints replacing task_steps in TaskDetailRaw; 3 new + 10 modified = 13 files; awaiting approval before Codex
metadata:
  type: project
---

PLAN_task_steps_dedicated_endpoints_20260627 created 2026-06-27.

**Why:** Backend removed `task_steps` from `GET /tasks/{task_id}`. Steps now served by dedicated `GET /tasks/{task_id}/steps` (rich shape). New `GET /tasks/{task_id}/steps/counts` endpoint drives `TaskWorkingSectionsField` pill counts via an internal flow hook.

**How to apply:** When working on step data sourcing, step counts display, or socket invalidation for step events — this plan is the reference. The plan is at `docs/architecture/under_construction/implementation/PLAN_task_steps_dedicated_endpoints_20260627.md`.

Key changes:
- `TaskDetailRawSchema` loses `task_steps` key
- New `TaskStepRichSchema` / `TaskStepRich` + `TaskStepCountsByStateSchema` / `TaskStepCountsByState` in `@beyo/tasks`
- New `fetchTaskStepCounts` + `useTaskStepCountsQuery` in `@beyo/tasks`
- `taskStepKeys.counts(taskId)` added to package key factory
- Controller uses `useTaskStepsByTaskQuery` instead of `taskQuery.data?.task_steps`
- New flow hook `useTaskWorkingSectionsCountsFlow` in `@beyo/task-working-sections`
- `TaskWorkingSectionsField` props: `taskSteps` removed, `taskId: string` added (flow called internally)
- Socket event types: `task:step-readiness-changed` and `task:step-updated` added to `ServerToClientEvents`
- `socket-events.ts` in managers app extended with `pkgTaskStepKeys.all` broad invalidation for all step events
