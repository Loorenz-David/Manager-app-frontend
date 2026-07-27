# SUMMARY_PLAN_task_creation_submit_20260523

## Metadata

- Summary ID: `SUMMARY_PLAN_task_creation_submit_20260523`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-23T18:21:01Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_creation_submit_20260523.md`
- Related debug plan (optional): `—`

## What was implemented

- Added the real `PUT /api/v1/tasks` API client and a `useCreateTask` mutation with optimistic task-list insertion, query snapshot rollback, and post-success `task_scalar_id` patching.
- Added task creation payload normalizers for return, pre-order, and internal forms, including the backend-required rule that nested `item_issues` and `item_upholstery` force an `item` payload.
- Extended the task list Zustand stores with `setOne` and removal helpers so optimistic tasks, items, relations, and list images can be injected and rolled back cleanly.
- Replaced the submit stubs in all three task-creation forms with real mutation flows.
- Added `regenerateIds()` to `TaskCreationFormProvider` so internal-task success can reset the form, rotate client IDs, and return to step 1 while keeping the slide open.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/create-task.ts`: added the create-task API function and response typing.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/actions/use-create-task.ts`: added the optimistic mutation and rollback logic.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/lib/normalize-task-form-payload.ts`: added the payload builders for form submit.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/`: wired `ReturnFormContent`, `PreOrderFormContent`, and `InternalFormContent` to real submit handlers.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/providers/TaskCreationFormProvider.tsx`: replaced static refs with regeneratable client IDs.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/store/`: added single-record insert and rollback helpers for tasks, items, and task-list images.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/index.ts` and `src/features/task-creation/index.ts`: exported the new mutation and normalizer APIs.

## Contract adherence

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_route_create_task_contract_20260523.md`: matched the documented `PUT /api/v1/tasks` shape and respected the `item_issues` / `item_upholstery` dependency on `item`.
- `docs/architecture/under_construction/implementation/PLAN_task_creation_submit_20260523.md`: completed the planned submit wiring, optimistic insertion, rollback, and internal-form reset behavior.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- The optimistic task card still relies on list invalidation for the eventual server-normalized record beyond `task_scalar_id`; no client-side filter matching was added.
- No dedicated unit tests were added for `useCreateTask` or the payload normalizers in this pass.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_task_creation_submit_20260523.md`
