# SUMMARY_PLAN_realtime_05_upholstery_socket_handlers_20260619

## Metadata

- Summary ID: `SUMMARY_PLAN_realtime_05_upholstery_socket_handlers_20260619`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T11:25:51Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_realtime_05_upholstery_socket_handlers_20260619.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended `@beyo/realtime` `ServerToClientEvents` with the eight backend-owned upholstery and item-upholstery events from the realtime event catalog.
- Extended managers `itemSocketEvents` with targeted `itemUpholsteryKeys` invalidation/removal for all four `item:upholstery-*` events.
- Added managers `upholsterySocketEvents` for `upholstery:*` and `upholstery:inventory-*`, including detail, list, picker-list, and inventory-list invalidation behavior aligned to the plan.
- Added workers `upholsterySocketEvents` for the four `upholstery:*` events using workers-owned `upholsteryKeys.detail()` and `upholsteryKeys.missing()`.
- Registered the new upholstery handler slices in both app socket registries.

## Files changed

- `packages/realtime/src/lib/socket-types.ts`: added eight new server-to-client realtime event signatures.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/socket-events.ts`: added managers item-upholstery handlers and imports.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/socket-events.ts`: added managers upholstery/inventory handler slice.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/socket-registry.ts`: registered managers upholstery handlers.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/upholstery/socket-events.ts`: added workers upholstery handler slice.
- `apps/workers-app/ManagerBeyo-app-workers/src/app/socket-registry.ts`: registered workers upholstery handlers.

## Contract adherence

- `architecture/21_realtime.md`: handlers are feature-owned `SocketEventHandlers` slices assembled at the app registry level and use `refetchType: "active"` for invalidation.
- `architecture/05_server_state.md`: delete events remove detail caches and invalidate the affected list keys rather than mutating server state outside TanStack Query.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`: added the exact backend event names and preserved the documented `client_id` semantics for `ItemUpholstery`, `Upholstery`, and `UpholsteryInventory`.

## Validation evidence

- `npm run typecheck`: pass.

## Known gaps or deferred items

- Playwright/runtime socket validation remains deferred; this plan only implemented the handler wiring and type contract updates.

## Handoff notes

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_05_upholstery_socket_handlers_20260619_1125.md`
