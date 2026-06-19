# SUMMARY_PLAN_realtime_04_app_wiring_and_env_20260619

## Metadata

- Summary ID: `SUMMARY_PLAN_realtime_04_app_wiring_and_env_20260619`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T08:54:54Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_realtime_04_app_wiring_and_env_20260619.md`
- Related debug plan (optional): `—`

## What was implemented

- Wired `@beyo/realtime` and `@beyo/notifications` into the managers and workers apps.
- Added app-owned Socket.IO handler slices for managers tasks, managers items, managers working sections, workers task steps, and workers working sections.
- Added module-scoped `socketRegistry` files for both apps, merging package-owned case and notification handlers with app-owned handlers.
- Mounted `RealtimeProvider` inside each app's `AuthProvider` and mounted notification toast tracking once per app root.
- Added shell `ConnectionStatus`, `NotificationBadge`, and DEV-only `RealtimeDebugPanel` to both app shells.
- Added `VITE_WS_URL` env declarations and TypeScript env typings for both apps.
- Added realtime connection lifecycle entries to the realtime ring buffer.
- Reset notification toast tracking during package auth sign-out to avoid cross-session seen-id leakage.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/app/socket-registry.ts`: managers realtime registry.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`: task and task-step handlers.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/socket-events.ts`: item handlers.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/socket-events.ts`: working-section and membership handlers.
- `apps/workers-app/ManagerBeyo-app-workers/src/app/socket-registry.ts`: workers realtime registry.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`: worker task-step handlers.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/socket-events.ts`: worker working-section and membership handlers.
- `apps/*/src/app/RootRoute.tsx`: mounted `RealtimeProvider` and notification toast tracking.
- `apps/*/src/app/AppShell.tsx`: mounted connection status, notification badge, and debug panel.
- `apps/*/src/components/shell/ConnectionStatus.tsx`: realtime connection status UI.
- `apps/*/src/components/shell/RealtimeDebugPanel.tsx`: DEV realtime event log panel.
- `apps/*/package.json`: added realtime, notifications, and socket dependencies.
- `apps/*/.env*` and `apps/*/src/vite-env.d.ts`: added `VITE_WS_URL`.
- `apps/*/src/index.css`: added Tailwind `@source` for notifications package.
- `packages/realtime/src/providers/RealtimeProvider.tsx`: added system connection log entries.
- `packages/auth/src/api/use-sign-out.ts` and `packages/auth/package.json`: reset notification toast tracking on sign-out.
- `package-lock.json`: refreshed after dependency metadata updates.

## Contract adherence

- `architecture/21_realtime.md`: registries are module-scoped, provider is mounted inside auth under query client, and socket event handlers use active query invalidation.
- `architecture/23_providers.md`: provider ordering keeps `QueryClientProvider` outermost and `RealtimeProvider` inside the auth lifecycle.
- `architecture/05_server_state.md`: handlers invalidate app-owned TanStack Query keys instead of fetching directly.
- `architecture/03_environment.md`: `VITE_WS_URL` is typed and optional, preserving same-origin/API-origin fallback behavior from `@beyo/realtime`.
- `architecture/34_runtime_validation.md`: shell connection status and debug panel expose stable test IDs.

## Validation evidence

- `npm run typecheck`: pass.
- Playwright mobile/desktop: not run in this pass; deterministic backend/socket trigger helpers are not present in this frontend workspace yet.

## Known gaps or deferred items

- Runtime socket validation still needs backend trigger or test helper support for deterministic Playwright realtime specs.
- Production `VITE_WS_URL` remains blank intentionally so `@beyo/realtime` falls back to the configured API origin / same origin.

## Handoff notes

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_04_app_wiring_and_env_20260619_0854.md`
