# SUMMARY_PLAN_task_steps_dedicated_endpoints_20260627

## Metadata

- Summary ID: `SUMMARY_PLAN_task_steps_dedicated_endpoints_20260627`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-27T10:43:58Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_steps_dedicated_endpoints_20260627.md`
- Related debug plan (optional): `n/a`

## What was implemented

- Moved task-step sourcing in `@beyo/tasks` off `GET /tasks/{task_id}` by removing `task_steps` from `TaskDetailRaw`, introducing `TaskStepRich` and `TaskStepCountsByState`, and wiring dedicated `/steps` and `/steps/counts` query APIs.
- Updated `@beyo/task-working-sections` so the slide controller reads the rich step list from `useTaskStepsByTaskQuery`, while `TaskWorkingSectionsField` fetches counts internally through a new flow hook that derives assigned and completed pills from the counts endpoint.
- Updated managers and workers pin-notification step pickers to consume the rich step shape, switched the managers task-detail page off the removed `task_steps` field, and expanded managers realtime task socket invalidation plus shared socket typings for the new step event types.

## Files changed

- `packages/tasks/src/types.ts`: added rich step and counts schemas, plus removed `task_steps` from `TaskDetailRawSchema`.
- `packages/tasks/src/api/task-step-keys.ts`, `fetch-task-step-counts.ts`, `use-task-step-counts-query.ts`, `list-task-steps-by-task.ts`, `index.ts`: added counts query support and switched task step list parsing to the rich schema.
- `packages/tasks/src/actions/use-add-task-step.ts`, `use-remove-task-step.ts`: removed stale `task_steps` cache writes and invalidated the dedicated step list and counts queries after mutations.
- `packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts`, `components/TaskWorkingSectionsField.tsx`, `flows/use-task-working-sections-counts.flow.ts`, `components/TaskWorkingSectionsField.test.tsx`, `index.ts`: migrated working-sections state to the dedicated step list and internal counts flow.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`: replaced `task_steps` reads with the counts flow and new field props.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/PinNotificationsSlidePage.tsx` and `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/PinNotificationsSlidePage.tsx`: updated pin step cards to use `TaskStepRich`, `working_section_name_snapshot`, and `null` image placeholders.
- `packages/realtime/src/lib/socket-types.ts` and `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`: registered `task:step-readiness-changed` and `task:step-updated` and broadened step-query invalidation.

## Contract adherence

- `architecture/05_server_state.md`: new `/steps` and `/steps/counts` endpoints are represented as dedicated TanStack Query hooks with explicit key factory entries and mutation invalidation.
- `architecture/08_hooks.md`: the new working-sections counts logic lives in a flow hook, while the controller aggregates task detail plus step-list query state for the slide surface.
- `architecture/21_realtime.md`: socket typing and handlers were updated by invalidating affected query families instead of patching stale local assumptions.
- `architecture/35_shared_packages.md`: shared package components own their internal hook usage and expose the updated package API without leaking app-specific implementation.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- Working-section images in manager and worker pin step cards remain placeholders because the dedicated task-step endpoint does not expose an image field; that follow-up remains out of scope for this plan.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_steps_list_rich_and_count_20260627.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_task_steps_dedicated_endpoints_20260627_1043.md`
