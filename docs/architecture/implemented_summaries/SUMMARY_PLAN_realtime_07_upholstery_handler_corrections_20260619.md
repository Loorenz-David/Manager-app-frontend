# SUMMARY_PLAN_realtime_07_upholstery_handler_corrections_20260619

## Metadata

- Summary ID: `SUMMARY_PLAN_realtime_07_upholstery_handler_corrections_20260619`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T12:58:04Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_realtime_07_upholstery_handler_corrections_20260619.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended managers `itemSocketEvents` so every `item:upholstery-*` event now invalidates both the managers upholstery-requirements cache namespace and the shared `@beyo/tasks` item-upholstery namespace used by task and task-step upholstery views.
- Added pending-seat upholstery list/count invalidations for all managers `item:upholstery-*` handlers, and added upholstery-ordering invalidation for `item:upholstery-requirement-state-changed`.
- Extended managers `upholsterySocketEvents` so `upholstery:updated` also refreshes inventory lists and `upholstery:inventory-updated` also refreshes picker lists.
- Extended workers `taskStepSocketEvents` with the four `item:upholstery-*` handlers so task-step upholstery views refetch on shared item-upholstery changes.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/socket-events.ts`: added the missing shared/package key invalidations and pending-seat / ordering invalidations.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/socket-events.ts`: added the missing cross-surface invalidations for upholstery entity and inventory updates.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`: added `item:upholstery-*` handlers that invalidate the shared `@beyo/tasks` item-upholstery namespace.

## Contract adherence

- `architecture/21_realtime.md`: kept the feature-owned `SocketEventHandlers` structure and used `refetchType: "active"` for all invalidations.
- `architecture/05_server_state.md`: relied on TanStack Query prefix invalidation semantics so `tasksItemUpholsteryKeys.all` correctly refreshes all `@beyo/tasks` item-upholstery queries.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`: preserved the documented payload constraint that `item:upholstery-*` events expose only the item-upholstery `client_id`, requiring root-namespace invalidation instead of item-targeted invalidation.

## Validation evidence

- `npm run typecheck`: pass.

## Known gaps or deferred items

- No runtime socket validation or Playwright coverage was added in this plan; the work is limited to cache invalidation corrections in existing handler slices.

## Handoff notes

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_07_upholstery_handler_corrections_20260619_1258.md`
