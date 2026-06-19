# SUMMARY_PLAN_realtime_02_notifications_package_20260619

## Metadata

- Summary ID: `SUMMARY_PLAN_realtime_02_notifications_package_20260619`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-19T08:40:46Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_realtime_02_notifications_package_20260619.md`
- Related debug plan (optional): `—`

## What was implemented

- Added `@beyo/notifications` as a raw-source workspace package.
- Added notification DTO schemas, view-model conversion, list params, unread-count response, and mark-read input validation.
- Added API functions and query hooks for list, unread count, and mark-read.
- Added optimistic mark-read cache updates with rollback and final invalidation.
- Added `notificationSocketEvents` for `notification:new`; it invalidates list and unread-count queries and intentionally does not call `notify()`.
- Added `useNotificationToasts()` to emit toasts from refetched notification list data only, skipping initial load and deduping by notification `client_id`.
- Added `NotificationBadge` and `useNotifications()` convenience hook.
- Wired `packages/notifications` into root `npm run typecheck`.

## Files changed

- `packages/notifications/package.json`: added package metadata and peer dependencies.
- `packages/notifications/tsconfig.json`: added source-package TypeScript configuration.
- `packages/notifications/src/types.ts`: added notification DTOs, params, mutation input, and view model.
- `packages/notifications/src/api/*`: added key factory, API functions, query hooks, and mark-read mutation hook.
- `packages/notifications/src/socket-events.ts`: added `notification:new` socket handler.
- `packages/notifications/src/hooks/use-notification-toasts.ts`: added toast-from-fetch logic.
- `packages/notifications/src/hooks/use-notifications.ts`: added convenience controller-style hook.
- `packages/notifications/src/components/NotificationBadge.tsx`: added unread-count badge primitive.
- `packages/notifications/src/index.ts`: exported the public notification API.
- `package.json`: added notifications package to the root typecheck command.
- `package-lock.json`: updated workspace lockfile after adding the package.

## Contract adherence

- `architecture/05_server_state.md`: query keys and TanStack Query hooks own server state.
- `architecture/08_hooks.md`: mark-read wraps one mutation and owns optimistic update, rollback, and invalidation.
- `architecture/24_dto.md`: response DTOs are parsed with Zod at the API boundary and converted to view models separately.
- `architecture/34_runtime_validation.md`: stable `data-testid="notification-badge"` was added for runtime targeting.
- `architecture/21_realtime.md`: `notification:new` treats socket payload as a pointer and fetches content via REST.
- `architecture/20_notifications.md`: `notify.info()` is called from the owning toast hook, not directly from the socket handler.
- `architecture/35_shared_packages.md`: package exposes raw TypeScript through `exports`, uses peer dependencies, and avoids app aliases.

## Validation evidence

- `npm run typecheck`: pass.
- Socket handler check: `packages/notifications/src/socket-events.ts` invalidates `notificationKeys.lists()` and `notificationKeys.unreadCount()` with `refetchType: "active"` and contains no `notify()` call.
- `npm run test`: not run; no package test harness exists for this package yet.
- `npx playwright test --project=mobile`: not run; package is not mounted in apps until PLAN_04.
- `npx playwright test --project=desktop`: not run; package is not mounted in apps until PLAN_04.

## Known gaps or deferred items

- App mounting, Tailwind `@source` registration for `packages/notifications/src`, registry assembly, and runtime smoke validation are deferred to `PLAN_realtime_04_app_wiring_and_env_20260619`.
- Web push remains out of scope and deferred.

## Handoff notes

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_02_notifications_package_20260619_0840.md`
