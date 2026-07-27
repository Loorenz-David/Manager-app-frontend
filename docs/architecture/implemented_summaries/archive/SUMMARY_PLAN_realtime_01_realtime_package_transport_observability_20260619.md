# SUMMARY_PLAN_realtime_01_realtime_package_transport_observability_20260619

## Metadata

- Summary ID: `SUMMARY_PLAN_realtime_01_realtime_package_transport_observability_20260619`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T08:35:19Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_realtime_01_realtime_package_transport_observability_20260619.md`
- Related debug plan (optional): `—`

## What was implemented

- Added `@beyo/realtime` as a raw-source workspace package with typed Socket.IO event contracts matching the backend event catalog.
- Added `RealtimeProvider`, `useSocket`, `useSocketStatus`, and `useEntityView` with authenticated connection lifecycle, server-managed room assumptions, active-query catch-up on reconnect, and session-expired DOM event dispatch on failed refresh.
- Added debounced and batch invalidation helpers for feature-owned handlers.
- Added realtime observability with a capped ring buffer, `useRealtimeLog()`, event dispatch middleware, handler timing, handler error isolation, and recording of invalidated/removed query keys.
- Added `socket.io-client` to the workspace install and wired `packages/realtime` into the root `npm run typecheck` script.

## Files changed

- `packages/realtime/package.json`: added package metadata and peer dependencies.
- `packages/realtime/tsconfig.json`: added source-package TypeScript configuration.
- `packages/realtime/src/lib/socket-types.ts`: added server/client event contracts and `AppSocket`.
- `packages/realtime/src/lib/socket-registry-types.ts`: added injected handler registry types.
- `packages/realtime/src/lib/socket-debounce.ts`: added debounced active invalidation.
- `packages/realtime/src/lib/socket-batch.ts`: added cache-aware batch invalidation.
- `packages/realtime/src/env.ts`: added `resolveSocketUrl()` with `VITE_WS_URL`, `VITE_API_URL`, and same-origin fallback.
- `packages/realtime/src/observability/*`: added ring-buffer log, React subscription hook, and dispatch middleware.
- `packages/realtime/src/providers/RealtimeProvider.tsx`: added the authenticated Socket.IO provider.
- `packages/realtime/src/hooks/*`: added public socket and entity-view hooks.
- `packages/realtime/src/index.ts`: exported the public realtime API.
- `package.json`: added realtime package to the root typecheck command.
- `package-lock.json`: updated workspace lockfile after installing `socket.io-client`.

## Contract adherence

- `architecture/21_realtime.md`: followed the corrected client/server event model, server-managed rooms, `view_entity`/`leave_entity`, token refresh behavior, and active-query invalidation on reconnect.
- `architecture/35_shared_packages.md`: package exposes raw TypeScript through `exports`, uses peer dependencies, and avoids app aliases or app-owned feature imports.
- `architecture/03_environment.md`: `VITE_WS_URL` is typed and optional, with runtime resolution staying inside the realtime package.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`: `ServerToClientEvents` and `ClientToServerEvents` were copied from the catalog.

## Validation evidence

- `npm run typecheck`: pass.
- Dependency boundary check: `rg -n "@beyo/(cases|tasks|items|working-sections|notifications)|Keys|keys" packages/realtime/src` returned no matches.
- `npm run test`: not run; no package test harness exists for this package yet.
- `npx playwright test --project=mobile`: not run; package is not mounted in apps until PLAN_04.
- `npx playwright test --project=desktop`: not run; package is not mounted in apps until PLAN_04.

## Known gaps or deferred items

- App mounting, registry assembly, `VITE_WS_URL` deployment wiring, and runtime smoke validation are deferred to `PLAN_realtime_04_app_wiring_and_env_20260619`.
- Domain event handlers are intentionally excluded and remain in later plans.

## Handoff notes

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`
- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_contract21_corrections_20260619.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_01_realtime_package_transport_observability_20260619_0835.md`
