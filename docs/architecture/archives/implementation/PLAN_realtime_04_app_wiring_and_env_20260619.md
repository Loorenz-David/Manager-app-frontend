# PLAN_realtime_04_app_wiring_and_env_20260619

## Metadata

- Plan ID: `PLAN_realtime_04_app_wiring_and_env_20260619`
- Status: `archived`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T08:54:54Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_realtime_layer_shared_packages_20260619.md`

## Goal and intent

- Goal: Wire the real-time layer into the managers and workers apps — define app-owned handlers (tasks/items/working-sections/steps/membership), assemble each app's registry, mount `RealtimeProvider`, add `VITE_WS_URL` + `socket.io-client`, and surface connection status + a debug panel.
- Business/user intent: Both apps reactively update on entity changes and notifications, with a visible "Live/Reconnecting/Offline" indicator and an inspectable event log.
- Non-goals: web push (deferred); sellers app (not yet scaffolded — wiring is documented for reuse).

## Scope

- In scope (per app): env additions, `socket.io-client` dependency, app-owned `socket-events.ts` files, `src/app/socket-registry.ts`, `RealtimeProvider` mount in `RootRoute`, `ConnectionStatus` component, optional dev debug panel, notification badge/toaster mount.
- Out of scope: package internals (PLAN_01/02/03).
- Assumptions: each app keeps its own `QueryClient` in `app/providers.tsx`; `QueryClientProvider` wraps the router, so `RootRoute` can use `useQueryClient()`; `AuthProvider` lives in `RootRoute`.

## Clarifications required

- [ ] Final `VITE_WS_URL` per environment (or rely on the PLAN_01 fallback that derives from `VITE_API_URL`). Confirm whether the Socket.IO server shares the API origin.
- [ ] Whether the workers app needs `task:*` (task-level) handlers or only `task:step-*` (workers operate on steps; managers own tasks). Default below: workers handle `task:step-*` + `working_section:*` + `user:working_sections_updated`; managers handle the full set.

## Acceptance criteria

1. Managers and workers apps each declare `VITE_WS_URL` (env + `vite-env.d.ts`) and depend on `socket.io-client`.
2. Each app has `src/app/socket-registry.ts` merging: `caseSocketEvents` (if cases used), `notificationSocketEvents`, and the app's own handlers — every catalog event the app cares about has exactly one handler, and the registry object is module-scoped (stable identity).
3. `RealtimeProvider` is mounted in each app's `RootRoute` inside `AuthProvider`, receiving the app registry.
4. A `ConnectionStatus` indicator (Live/Reconnecting/Offline) renders in each app shell, and `useRealtimeLog()` powers a DEV-only debug panel.
5. Playwright (mobile + desktop) verifies: socket connects after sign-in; a backend entity change refetches the observing query; a `notification:new` increments the badge and toasts once.

## Contracts and skills

### Contracts loaded

- `architecture/21_realtime.md`: app-level assembly + provider placement (inside `AuthProvider`/`QueryClientProvider`); `ConnectionStatus` example.
- `architecture/23_providers.md`: provider composition order.
- `architecture/05_server_state.md`: targeted invalidation for app-owned keys.
- `architecture/34_runtime_validation.md` + `architecture/34_runtime_validation_local.md`: Playwright fixture/credential setup, project names, websocket validation.
- `architecture/03_environment.md` (if present): `VITE_` env declaration.

### Local extensions loaded

- `architecture/04_api_client_local.md`: token/refresh behavior the socket auth relies on.
- `architecture/34_runtime_validation_local.md`: bootstrapped fixture paths, `npm run test:e2e:*` scripts, credential env vars.

### File read intent — pattern vs. relational

Permitted relational reads (exact app-owned keys + provider placement):
- `apps/managers-app/.../app/providers.tsx` + `app/RootRoute.tsx` — current provider tree (QueryClient outer, AuthProvider in RootRoute).
- `apps/workers-app/.../app/providers.tsx` + `app/RootRoute.tsx` — same.
- `apps/managers-app/.../features/tasks/api/task-keys.ts`, `.../features/items/api/item-keys.ts`, `.../features/working-sections/api/working-section-keys.ts`, `.../features/tasks/subfeatures/task_steps/api/task-step-keys.ts`.
- `apps/workers-app/.../features/task_steps/api/task-step-keys.ts`, `.../features/working_sections/api/working-section-keys.ts`.
- `apps/managers-app/.../vite-env.d.ts`, `.env`, `.env.production`; `apps/workers-app/.../.env`, `.env.test`.

Prohibited: reading another socket handler to learn structure (use `21_realtime.md` + PLAN_03).

### Skill selection

- Primary skill: `verify` / `run` for runtime checks; Playwright per `34_runtime_validation_local.md`.
- Trigger terms: `socket, realtime, websocket validation, playwright`.

## Implementation plan

### Shared (both apps)

1. **Dependency**: add `socket.io-client` to each app's `package.json` `dependencies` (the realtime package declares it as a peer). Run install so it hoists to root `node_modules` for package typecheck.

2. **Env**:
   - Add `VITE_WS_URL` to each app's `.env`, `.env.production`, `.env.test` (leave blank to use the PLAN_01 fallback, or set the socket origin).
   - Add `readonly VITE_WS_URL?: string;` to each app's `vite-env.d.ts` `ImportMetaEnv`.

3. **App-owned handlers** — create `src/features/<f>/socket-events.ts` next to each app-owned key file, exporting a `SocketEventHandlers` slice. Pattern (managers tasks shown):
   ```ts
   // apps/managers-app/.../features/tasks/socket-events.ts
   import type { SocketEventHandlers } from '@beyo/realtime';
   import { taskKeys } from './api/task-keys';
   import { taskStepKeys } from './subfeatures/task_steps/api/task-step-keys';

   export const taskSocketEvents: SocketEventHandlers = {
     'task:created':       (_p, { queryClient }) => queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'active' }),
     'task:updated':       ({ client_id }, { queryClient }) => { queryClient.invalidateQueries({ queryKey: taskKeys.detail(client_id), refetchType: 'active' }); queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'active' }); },
     'task:deleted':       ({ client_id }, { queryClient }) => { queryClient.removeQueries({ queryKey: taskKeys.detail(client_id) }); queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'active' }); },
     'task:state-changed': ({ client_id }, { queryClient }) => { queryClient.invalidateQueries({ queryKey: taskKeys.detail(client_id), refetchType: 'active' }); queryClient.invalidateQueries({ queryKey: taskKeys.lists(), refetchType: 'active' }); },
     'task:step-assigned':      ({ client_id }, { queryClient }) => queryClient.invalidateQueries({ queryKey: taskStepKeys.detail(client_id), refetchType: 'active' }),
     'task:step-state-changed': ({ client_id }, { queryClient }) => queryClient.invalidateQueries({ queryKey: taskStepKeys.detail(client_id), refetchType: 'active' }),
   };
   ```
   Repeat for: `items/socket-events.ts` (item:* → `itemKeys`), `working-sections/socket-events.ts` (`working_section:*` → `workingSectionKeys`), and a `user:working_sections_updated` handler (invalidate the current user's section-membership query). Match the **exact** key factory signatures found during the relational reads.

4. **Registry assembly** — `src/app/socket-registry.ts` (module-scoped, stable identity):
   ```ts
   import type { SocketEventHandlers } from '@beyo/realtime';
   import { caseSocketEvents } from '@beyo/cases';
   import { notificationSocketEvents } from '@beyo/notifications';
   import { taskSocketEvents } from '@/features/tasks/socket-events';
   import { itemSocketEvents } from '@/features/items/socket-events';
   import { workingSectionSocketEvents } from '@/features/working-sections/socket-events';

   export const socketRegistry: SocketEventHandlers = {
     ...caseSocketEvents,
     ...taskSocketEvents,
     ...itemSocketEvents,
     ...workingSectionSocketEvents,
     ...notificationSocketEvents,
     'user:working_sections_updated': (_p, { queryClient }) =>
       queryClient.invalidateQueries({ queryKey: workingSectionKeys.membership(), refetchType: 'active' }),
   };
   ```
   Each app includes only the slices for features it has (workers: steps/sections/notifications/membership; managers: full set + cases).

5. **Mount `RealtimeProvider`** in `RootRoute`, inside `AuthProvider` (needs `isAuthenticated`) — `QueryClientProvider` already wraps the router so `useQueryClient()` resolves:
   ```tsx
   <SurfaceProvider>
     <PwaProvider surfaceOpeners={pwaSurfaceOpeners}>
       <AuthProvider /* …app props… */>
         <RealtimeProvider registry={socketRegistry}>
           <Outlet />
         </RealtimeProvider>
       </AuthProvider>
     </PwaProvider>
   </SurfaceProvider>
   ```

6. **`ConnectionStatus`** — add `src/components/shell/ConnectionStatus.tsx` per `21_realtime.md`, using `useSocketStatus()`; mount in the app shell (top bar / nav).

7. **Notifications UI** — mount `useNotificationToasts()` once at the app root (e.g. in `RootRoute` or a small mount component) and place `<NotificationBadge />` from `@beyo/notifications` in the shell.

   **Sign-out reset (required):** `useNotificationToasts` uses module-level singleton state (`seenNotificationIds`, `hasBootstrappedToastSeenIds`) that persists across a sign-out/sign-in cycle in the same tab. Call `resetNotificationToastTracking()` from `@beyo/notifications` inside `useSignOutMutation`'s `onSuccess` (or wherever `clearAuth()` is called) to prevent the previous user's seen-id set leaking into the next session:
   ```ts
   import { resetNotificationToastTracking } from '@beyo/notifications';

   // in sign-out onSuccess:
   resetNotificationToastTracking();
   ```

8. **Connection lifecycle events in the ring buffer** — add `recordRealtimeEvent` calls to the three connection handlers in `RealtimeProvider.tsx` so the debug panel shows a full timeline (connection transitions alongside domain events):
   ```ts
   // in on('connect'):
   recordRealtimeEvent({ event: 'system:connected', payload: null, invalidated: [], status: 'ok' });

   // in on('disconnect'):
   recordRealtimeEvent({ event: 'system:disconnected', payload: null, invalidated: [], status: 'ok' });

   // in handleReconnectFailed:
   recordRealtimeEvent({ event: 'system:reconnect-failed', payload: null, invalidated: [], status: 'error', error: 'all reconnection attempts exhausted' });
   ```
   Import `recordRealtimeEvent` from `'../observability/realtime-log'` in `RealtimeProvider.tsx`. These entries will carry `scope: 'system'` automatically (the `scopeFromEvent` function already handles the `system:` prefix). The `client` scope is reserved for future client-emitted event tracing.

9. **DEV debug panel** — a `RealtimeDebugPanel` gated by `import.meta.env.DEV` that renders `useRealtimeLog()` (event, scope, ms, invalidated keys, errors). Keep it behind a hidden toggle. The system lifecycle entries from step 8 will appear in chronological order alongside domain events, making "did the socket drop before the handler error?" immediately visible.

### Validation

10. Run `npm run typecheck` (root) — must include `packages/realtime` and `packages/notifications` project references added in PLAN_01/02.

11. Playwright per `34_runtime_validation_local.md` — add `tests/playwright/features/realtime/*.spec.ts`:
    - sign in → assert socket `connect` (status indicator becomes "Live");
    - trigger a backend change (or mock socket emit) → assert the observing list/detail refetches;
    - emit `notification:new` → assert badge increments and exactly one toast.
    - Run `npm run test:e2e:mobile` then `npm run test:e2e:desktop`.

## Risks and mitigations

- Risk: registry identity changes each render → provider reconnect loop. Mitigation: `socketRegistry` is a module-scoped constant (step 4); provider deps documented in PLAN_01.
- Risk: provider mounted outside `QueryClientProvider` → `useQueryClient` throws. Mitigation: mount inside `RootRoute`, which is rendered under the router that `QueryClientProvider` wraps (verified in providers.tsx).
- Risk: app-owned key factory signatures differ from the example. Mitigation: relational read of each `*-keys.ts` before writing handlers; match exact signatures.
- Risk: workers app subscribing to `task:*` it has no keys for → dead handlers. Mitigation: workers registry includes only `task:step-*`/sections/notifications/membership (per clarification default).

## Validation plan

- `npm run typecheck`: zero errors across all packages and both apps.
- `npm run test:e2e:mobile` and `npm run test:e2e:desktop`: realtime specs pass.
- Manual: open the DEV debug panel, trigger a change, confirm the event, its scope, duration, and invalidated keys are logged.

## Implementation summary

- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_realtime_04_app_wiring_and_env_20260619.md`
- Archive record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_04_app_wiring_and_env_20260619_0854.md`
- Validation: `npm run typecheck` passed. Playwright realtime specs were not run because deterministic backend/socket trigger helpers are not present in the frontend workspace yet.

## Review log

- `2026-06-19` author: initial draft.

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
