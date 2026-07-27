# INTENTION_realtime_layer_shared_packages_20260619

## Metadata

- Intention ID: `INTENTION_realtime_layer_shared_packages_20260619`
- Status: `active`
- Owner: `David` (authored with claude-opus-4-8)
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T12:58:04Z`

## Goal

Build a shared, app-agnostic real-time layer (Socket.IO event cache-sync + in-app notifications, with web push deferred) usable by the managers, workers, and future sellers apps — designed to be scalable, debuggable, and traceable.

## Why this matters

The backend already emits Socket.IO events on every entity change (see event catalog handoff). Without a frontend real-time layer, all three apps show stale data until a manual refetch. Past real-time work has been hard to debug because event flow was opaque and registration was implicit. This layer must make every event observable end-to-end and must be written once and consumed by all apps rather than duplicated per app.

## Success criteria

1. A `@beyo/realtime` package exists with zero domain dependencies, providing the socket connection, `useSocket`/`useSocketStatus`/`useEntityView` hooks, debounce/batch utilities, and a structured observability layer (`useRealtimeLog`).
2. A `@beyo/notifications` package provides the notification list/unread-count queries, badge, toast-from-fetch, and the `notification:new` handler.
3. Every server event in `HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619` has exactly one handler, assembled per-app via an injected registry; each app composes only the handlers it needs.
4. Every received event is logged (timestamp, event, scope, payload, handler duration, queries invalidated, error) and the last N are inspectable via `useRealtimeLog()`.
5. `npm run typecheck` passes; managers and workers apps connect, join workspace/user rooms server-side, and reactively refetch on entity changes verified via Playwright.

## Scope boundary

- In scope: Socket.IO transport + cache sync; in-app notifications domain; per-app registry assembly; connection-status UI; structured logging/debug panel.
- Out of scope (deferred): PWA web-push (OS notifications) — handled in a later intention extending `@beyo/pwa`; collaborative presence/typing UI beyond the `view_entity` plumbing.
- Non-goals: changing the canonical contract `architecture/21_realtime.md` (already corrected for the backend on 2026-06-19); changing backend event shapes.

## Linked implementation plans

| Plan ID | Path | Status | Covers |
|---------|------|--------|--------|
| `PLAN_realtime_01_realtime_package_transport_observability_20260619` | `docs/architecture/archives/implementation/PLAN_realtime_01_realtime_package_transport_observability_20260619.md` | `archived` | `@beyo/realtime` package: socket types, provider, hooks, utils, observability, env |
| `PLAN_realtime_02_notifications_package_20260619` | `docs/architecture/archives/implementation/PLAN_realtime_02_notifications_package_20260619.md` | `archived` | `@beyo/notifications` package: queries, badge, toast, `notification:new` handler |
| `PLAN_realtime_03_package_owned_handlers_cases_20260619` | `docs/architecture/archives/implementation/PLAN_realtime_03_package_owned_handlers_cases_20260619.md` | `archived` | `@beyo/cases` exports `caseSocketEvents` (case + conversation handlers) |
| `PLAN_realtime_04_app_wiring_and_env_20260619` | `docs/architecture/archives/implementation/PLAN_realtime_04_app_wiring_and_env_20260619.md` | `archived` | per-app handlers (tasks/items/sections/steps/membership), registry assembly, RealtimeProvider mount, `VITE_WS_URL`, status UI |
| `PLAN_realtime_05_upholstery_socket_handlers_20260619` | `docs/architecture/archives/implementation/PLAN_realtime_05_upholstery_socket_handlers_20260619.md` | `archived` | upholstery and item-upholstery socket handlers for managers/workers registries |
| `PLAN_realtime_06_task_step_socket_handlers_20260619` | `docs/architecture/archives/implementation/PLAN_realtime_06_task_step_socket_handlers_20260619.md` | `archived` | task-step realtime payload corrections and managers/workers task-step invalidation fixes |
| `PLAN_realtime_07_upholstery_handler_corrections_20260619` | `docs/architecture/archives/implementation/PLAN_realtime_07_upholstery_handler_corrections_20260619.md` | `archived` | upholstery handler cache-key corrections for managers and workers, plus pending-seat and ordering invalidations |

## Progress notes

- `2026-06-19`: Options analysis completed. Locked stack: split topology (`@beyo/realtime` + `@beyo/notifications` + push later in `@beyo/pwa`), handler injection, structured logger + ring buffer. Contract `21_realtime.md` corrected to match backend (client_id payloads, `view_entity`/`leave_entity`, no server-side room joins, `notification:new` is a pointer, `auth:session-expired` is client-only). Recon established that task/item/working-section query keys are app-owned and differ per app; only cases/item-issues/item-categories keys are package-owned.
- `2026-06-19`: PLAN 01 implemented and archived. `@beyo/realtime` now provides the shared transport, typed event contracts, provider/hooks, invalidation helpers, and observability middleware. `npm run typecheck` passed.
- `2026-06-19`: PLAN 02 implemented and archived. `@beyo/notifications` now provides REST-backed notification queries, unread badge, mark-read mutation, fetched-data toast hook, and `notification:new` invalidation handler. `npm run typecheck` passed.
- `2026-06-19`: PLAN 03 implemented and archived. `@beyo/cases` now exports `caseSocketEvents` for package-owned case and conversation-message handlers. Focused cases package typecheck and root typecheck passed.
- `2026-06-19`: PLAN 04 implemented and archived. Managers and workers now mount realtime registries/provider, notification toast tracking, connection status, notification badge, and DEV realtime log panel. Root typecheck passed; Playwright runtime validation remains a follow-up pending deterministic backend/socket trigger helpers.
- `2026-06-19`: PLAN 05 implemented and archived. `@beyo/realtime` now includes the upholstery and item-upholstery event types, managers app handles both item-upholstery and upholstery inventory invalidation, and workers app handles the shared upholstery event slice. Root typecheck passed.
- `2026-06-19`: PLAN 06 implemented and archived. Shared realtime typing now includes task-step create/delete events and corrected payload fields; managers and workers task-step handlers now refetch the affected task-step surfaces. Root typecheck passed.
- `2026-06-19`: PLAN 07 implemented and archived. Managers now invalidate both upholstery-requirement and `@beyo/tasks` item-upholstery namespaces plus pending-seat and ordering caches; upholstery entity and inventory updates now also refresh dependent inventory and picker lists; workers now react to `item:upholstery-*` events. Root typecheck passed.

## Open questions

- Notification REST endpoints (list, unread count, mark-read) are not in any handoff — impact if unresolved: PLAN_02 cannot finalize the query/mutation functions. Tracked as a clarification in PLAN_02.
- `VITE_WS_URL` value per environment (same origin as API vs dedicated socket host) — impact if unresolved: PLAN_01 ships a fallback (derive from `VITE_API_URL`) but production value must be confirmed in PLAN_04.

## Lifecycle transition

- Current status: `active`
- Next status: `achieved`
- Transition trigger: all linked implementation plans are archived and success criteria 1–5 are met.
