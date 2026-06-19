# SUMMARY_PLAN_realtime_06_task_step_socket_handlers_20260619

## Metadata

- Summary ID: `SUMMARY_PLAN_realtime_06_task_step_socket_handlers_20260619`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T11:34:08Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_realtime_06_task_step_socket_handlers_20260619.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended `@beyo/realtime` `ServerToClientEvents` with the missing `task:step-created` and `task:step-deleted` events.
- Corrected the shared realtime payload contract so `task:created` now exposes `working_section_ids` and `case:participant-added` now exposes `unread_count`.
- Extended managers `taskSocketEvents` so step assignment and state changes also invalidate task detail queries, and added handlers for step creation and deletion.
- Extended workers `taskStepSocketEvents` with targeted section-level invalidation for step creation and deletion using `working_section_id`.

## Files changed

- `packages/realtime/src/lib/socket-types.ts`: added the two missing task-step events and corrected two existing payload shapes.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`: added the missing task-detail invalidations and new step create/delete handlers.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`: added targeted section invalidation handlers for step create/delete.

## Contract adherence

- `architecture/21_realtime.md`: handlers remain feature-owned `SocketEventHandlers` slices and use `refetchType: "active"` for invalidations.
- `architecture/05_server_state.md`: delete handling removes stale detail caches before invalidating affected parent queries.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`: preserved the documented semantics that `client_id` on `task:step-*` events is the step id, while `working_section_id` drives workers-side section targeting.

## Validation evidence

- `npm run typecheck`: pass.

## Known gaps or deferred items

- No runtime socket validation or Playwright coverage was added in this plan; the work is limited to typed event contracts and cache invalidation wiring.

## Handoff notes

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_06_task_step_socket_handlers_20260619_1134.md`
