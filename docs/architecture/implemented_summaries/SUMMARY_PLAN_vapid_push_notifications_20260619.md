# SUMMARY_PLAN_vapid_push_notifications_20260619

## Metadata

- Summary ID: `SUMMARY_PLAN_vapid_push_notifications_20260619`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T14:43:47Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_vapid_push_notifications_20260619.md`
- Related debug plan (optional): `n/a`

## What was implemented

- Added the shared `@beyo/notifications` Web Push API layer for fetching the VAPID public key, registering a browser push subscription, and unregistering the current subscription.
- Added browser push utilities, payload types, `usePushSubscription`, and `unregisterCurrentDevicePush` to centralize capability detection, startup reconciliation, explicit enable/disable, and sign-out cleanup.
- Updated `@beyo/auth` sign-out to best-effort unregister the current browser push subscription before clearing auth state.
- Switched managers and workers PWA configs from generated service workers to `injectManifest`, with custom `src/sw.ts` handlers for Workbox precaching, push display suppression when a focused app window exists, stable notification tags, and notification-click routing.
- Added authenticated push reconciliation mounts to both apps after `NotificationRealtimeMount`.
- Extended both settings controllers and settings views with push status, loading state, and enable/disable actions.

## Files changed

- `packages/notifications/src/api/push/*`: added VAPID public-key fetch, subscription register/unregister functions, and push query keys.
- `packages/notifications/src/push/*`: added push crypto conversion, support detection, payload types, subscription lifecycle hook, and sign-out cleanup helper.
- `packages/notifications/src/index.ts`: exported the push API, utilities, types, hook, and cleanup helper.
- `packages/auth/src/api/use-sign-out.ts`: calls `unregisterCurrentDevicePush()` before the logout request.
- `apps/managers-app/ManagerBeyo-app-managers/src/sw.ts`: custom managers service worker with push and notification click handlers.
- `apps/workers-app/ManagerBeyo-app-workers/src/sw.ts`: custom workers service worker with push and notification click handlers.
- `apps/managers-app/ManagerBeyo-app-managers/vite.config.ts`: configured `vite-plugin-pwa` `injectManifest`.
- `apps/workers-app/ManagerBeyo-app-workers/vite.config.ts`: configured `vite-plugin-pwa` `injectManifest`.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/PushMount.tsx` and `apps/workers-app/ManagerBeyo-app-workers/src/app/PushMount.tsx`: added null-rendering push reconciliation mounts.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/RootRoute.tsx` and `apps/workers-app/ManagerBeyo-app-workers/src/app/RootRoute.tsx`: mounted push reconciliation inside the authenticated app tree.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/*` and `apps/workers-app/ManagerBeyo-app-workers/src/features/settings/*`: exposed push status/actions and added the settings toggle UI.

## Contract adherence

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_push_notification_system_20260619.md`: used the documented VAPID key, register, unregister, and push payload contracts.
- `architecture/16_feature_workflow.md`: implemented bottom-up from package API/utilities through app controllers and views.
- `architecture/05_server_state.md`: kept backend calls in typed async API functions; this push lifecycle does not introduce cached server state beyond idempotent registration.
- `architecture/23_providers.md`: preserved settings provider/controller ownership and consumed push state through the existing settings context.

## Validation evidence

- `npm run typecheck`: pass.

## Known gaps or deferred items

- No test-notification endpoint exists yet, so the settings UI does not include a test action.
- Physical-device push validation was not run in this implementation pass.
- Cases push notifications remain out of scope because the backend handoff documents that gap.

## Handoff notes

- No backend handoff required. The frontend uses the live backend APIs documented in `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_push_notification_system_20260619.md`.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_vapid_push_notifications_20260619_1443.md`
