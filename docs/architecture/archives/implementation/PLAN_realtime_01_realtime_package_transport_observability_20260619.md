# PLAN_realtime_01_realtime_package_transport_observability_20260619

## Metadata

- Plan ID: `PLAN_realtime_01_realtime_package_transport_observability_20260619`
- Status: `archived`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T08:35:19Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_realtime_layer_shared_packages_20260619.md`

## Goal and intent

- Goal: Create the `@beyo/realtime` package — the app-agnostic transport and observability mechanism for Socket.IO real-time, with the event registry **injected** by each app.
- Business/user intent: One real-time engine shared by managers/workers/sellers, with every event traceable so debugging is fast.
- Non-goals: No domain handlers (cases/tasks/notifications) here; no web push; the package never imports a feature package or any query keys.

## Scope

- In scope: package scaffold, `socket-types.ts`, `socket-registry-types.ts`, `socket-debounce.ts`, `socket-batch.ts`, `env.ts` (`VITE_WS_URL`), observability (ring buffer + `useRealtimeLog` + logging middleware), `RealtimeProvider`, `useSocket`/`useSocketStatus`, `useEntityView`, public `index.ts`.
- Out of scope: app wiring (PLAN_04), notifications (PLAN_02), feature handlers (PLAN_03/04).
- Assumptions: backend is Socket.IO (confirmed by handoff); each app owns its own `QueryClient` (so the provider binds via `useQueryClient()`, never a singleton); token lives in-memory in `@beyo/api-client`.

## Clarifications required

- [x] Confirm production `VITE_WS_URL` host (same origin as `VITE_API_URL` vs dedicated). Does not block: PLAN ships a fallback that derives from `VITE_API_URL`; final value confirmed in PLAN_04.
  - **Answered 2026-06-19:** Same origin as `VITE_API_URL`. The backend mounts Socket.IO via `socketio.ASGIApp(sio, other_asgi_app=fastapi_app)` — both FastAPI and Socket.IO run on the same process and port. The fallback `resolveSocketUrl()` already handles this correctly (`api || window.location.origin`). No change to the implementation plan needed.

## Acceptance criteria

1. `@beyo/realtime` builds and typechecks with zero errors and exports the full public API listed below.
2. `ServerToClientEvents` / `ClientToServerEvents` match `HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619` exactly (all payloads carry `client_id`; client emits only `view_entity`/`leave_entity`).
3. `RealtimeProvider` accepts a `registry: SocketEventHandlers` prop, connects only when authenticated, joins nothing client-side (rooms are server-managed), invalidates active queries on reconnect, and tears down on sign-out.
4. Every dispatched event passes through the logging middleware; `useRealtimeLog()` returns the last N entries with `{ ts, event, scope, payload, handlerMs, invalidated, error }`.
5. The package imports **no** feature package and **no** query keys (verify with a dependency check).

## Contracts and skills

### Contracts loaded

- `architecture/21_realtime.md`: baseline for SocketProvider shape, registry-types, debounce/batch, `useEntityView`, token lifecycle, "what real-time must NOT do".
- `architecture/35_shared_packages.md`: package boundary + callback-injection pattern (mirror `@beyo/pwa` `surfaceOpeners`).
- `architecture/03_environment.md` (if present): `VITE_` env validation pattern.

### Local extensions loaded

- `architecture/04_api_client_local.md`: token accessors (`getAccessToken`, `refreshAccessToken(scope)`) and refresh envelope.

### File read intent — pattern vs. relational

Permitted relational reads (understand what exists):
- `packages/pwa/src/providers/PwaProvider.tsx` + `packages/pwa/src/types.ts` — the callback-injection precedent this package mirrors.
- `packages/api-client/src/auth-token.ts`, `packages/api-client/src/env.ts`, `packages/api-client/src/index.ts` — token + env exports to reuse.
- `packages/auth/src/store/auth.store.ts` — `useAuthStore` selectors (`selectIsAuthenticated`, `selectWorkspaceId`).
- `packages/ui/package.json` + `packages/ui/tsconfig.json` — the package scaffold/peer-dep shape to copy.

Prohibited (pattern reads — `21_realtime.md` already defines these): do not read another provider to learn the context shell, or another hook to learn TanStack setup.

### Skill selection

- Primary skill: none (package scaffolding + contract-driven).
- Trigger terms: `socket, realtime, websocket, live update`.

## Implementation plan

1. **Scaffold `packages/realtime/`** mirroring `@beyo/ui`/`@beyo/api-client`:
   - `package.json`: `"name": "@beyo/realtime"`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, `peerDependencies`: `@beyo/api-client`, `@beyo/auth`, `@beyo/lib`, `@tanstack/react-query >=5`, `react >=19`, `react-dom >=19`, `socket.io-client >=4.7`.
   - `tsconfig.json`: copy from a sibling source-only package.
   - `src/vite-env.d.ts`: declare `VITE_WS_URL?: string` on `ImportMetaEnv`.

2. **`src/lib/socket-types.ts`** — paste the full `ServerToClientEvents` from the event catalog (tasks, task steps, cases, conversation messages, items, working_sections, notification:new, user:working_sections_updated). `ClientToServerEvents` = `view_entity` + `leave_entity` only. Export `AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>`. Do **not** add `room:join`/`room:leave` or `auth:session-expired` (per corrected contract).

3. **`src/lib/socket-registry-types.ts`** — per `21_realtime.md`:
   ```ts
   export type SocketHandlerContext = { queryClient: QueryClient; notify: typeof notify };
   export type SocketEventHandlers = {
     [K in keyof ServerToClientEvents]?: (
       payload: Parameters<ServerToClientEvents[K]>[0],
       ctx: SocketHandlerContext,
     ) => void;
   };
   ```

4. **`src/lib/socket-debounce.ts`** and **`src/lib/socket-batch.ts`** — copy `debouncedInvalidation` and `batchInvalidation` verbatim from `21_realtime.md` (use `client_id`/`string`, not branded ids — the package is domain-agnostic).

5. **`src/env.ts`** — resolve the socket URL with a fallback so apps work before `VITE_WS_URL` is set:
   ```ts
   export function resolveSocketUrl(): string {
     const ws = import.meta.env.VITE_WS_URL as string | undefined;
     if (ws) return ws;
     const api = import.meta.env.VITE_API_URL as string | undefined;
     return api || window.location.origin;   // Socket.IO connects to API origin by default
   }
   ```

6. **Observability — `src/observability/realtime-log.ts`** (module-level ring buffer + pub/sub):
   ```ts
   export type RealtimeLogEntry = {
     id: number; ts: number; event: string;
     scope: 'workspace' | 'user' | 'conversation' | 'client' | 'system';
     payload: unknown; handlerMs?: number;
     invalidated: string[];           // serialized query keys touched by the handler
     status: 'ok' | 'error' | 'no-handler'; error?: string;
   };
   ```
   Keep a capped array (e.g. 200), a monotonic id, and a `Set` of listeners. Export `recordRealtimeEvent(entry)`, `getRealtimeLog()`, `subscribeRealtimeLog(fn)`, `clearRealtimeLog()`. Scope is derived from the event name prefix (`conversation:` → conversation, `notification:`/`user:` → user, else workspace).

7. **Observability — `src/observability/use-realtime-log.ts`** — `useRealtimeLog()` via `useSyncExternalStore(subscribeRealtimeLog, getRealtimeLog)`.

8. **Observability — `src/observability/dispatch-event.ts`** — the logging middleware that wraps every handler call. It builds a **recording proxy** of `queryClient` so the log captures which keys a handler invalidated without the handler doing anything special:
   ```ts
   export function dispatchEvent(event, payload, handler, ctx) {
     const invalidated: string[] = [];
     const recordingClient = new Proxy(ctx.queryClient, {
       get(target, prop) {
         if (prop === 'invalidateQueries' || prop === 'removeQueries') {
           return (args) => { invalidated.push(JSON.stringify(args?.queryKey ?? 'all')); return target[prop](args); };
         }
         const v = (target as any)[prop];
         return typeof v === 'function' ? v.bind(target) : v;
       },
     });
     const start = performance.now();
     try {
       if (!handler) { recordRealtimeEvent({ ...base, status: 'no-handler', invalidated }); return; }
       handler(payload, { ...ctx, queryClient: recordingClient });
       recordRealtimeEvent({ ...base, handlerMs: performance.now() - start, invalidated, status: 'ok' });
     } catch (err) {
       recordRealtimeEvent({ ...base, handlerMs: performance.now() - start, invalidated, status: 'error', error: String(err) });
       if (import.meta.env.DEV) console.error(`[RT] handler error "${event}"`, err);
     }
     if (import.meta.env.DEV) { /* console.groupCollapsed(`[RT] ${event}`) … */ }
   }
   ```
   This is the core of the debuggability requirement: a handler bug cannot crash the provider, and every dispatch is recorded with the exact keys it touched.

9. **`src/providers/RealtimeProvider.tsx`** — adapt the `SocketProvider` from `21_realtime.md` with these deltas:
   - Signature: `RealtimeProvider({ registry, children }: { registry: SocketEventHandlers; children: ReactNode })`.
   - Imports from packages: `getAccessToken`, `refreshAccessToken` (`@beyo/api-client`), `useAuthStore` + selectors (`@beyo/auth`), `notify` (`@beyo/lib`), `resolveSocketUrl` (`./env`).
   - `io(resolveSocketUrl(), { auth: (cb) => cb({ token: getAccessToken() }), transports: ['websocket'], reconnectionAttempts: 10, reconnectionDelay: 1000, reconnectionDelayMax: 30000 })`.
   - `on('connect')`: set status connected; **no client room emits** (server joins workspace/user rooms on connect); `queryClient.invalidateQueries({ refetchType: 'active' })` to catch up missed events.
   - `on('connect_error')`: if `unauthorized`, `await refreshAccessToken()`; if it fails, `window.dispatchEvent(new CustomEvent('auth:session-expired'))`.
   - Registry loop: for each `[event, handler]` in `registry`, `s.on(event, (payload) => dispatchEvent(event, payload, handler, { queryClient, notify }))`.
   - Effect deps `[isAuthenticated, workspaceId, userId, queryClient, registry]`; full teardown on cleanup.
   - Provide `SocketContext` (the socket) and `SocketStatusContext` (`{ connected, reconnecting }`).

10. **`src/hooks/use-socket.ts`** — `useSocket()` (emit-only) and `useSocketStatus()` reading the two contexts.

11. **`src/hooks/use-entity-view.ts`** — copy `useEntityView(entityType, entityClientId)` from the corrected contract (emits `view_entity` on mount, `leave_entity` on cleanup).

12. **`src/index.ts`** — export: `RealtimeProvider`, `useSocket`, `useSocketStatus`, `useEntityView`, `useRealtimeLog`, `debouncedInvalidation`, `batchInvalidation`, `clearRealtimeLog`; and types `SocketEventHandlers`, `SocketHandlerContext`, `ServerToClientEvents`, `ClientToServerEvents`, `AppSocket`, `RealtimeLogEntry`.

13. **Wire typecheck**: add `tsc -p packages/realtime/tsconfig.json --noEmit` to the root `typecheck` script. Ensure `socket.io-client` resolves (installed at app level in PLAN_04; for package typecheck it is hoisted to root `node_modules`).

## Risks and mitigations

- Risk: handler throws and silences subsequent events. Mitigation: `dispatchEvent` try/catch per handler (step 8).
- Risk: stale token on reconnect. Mitigation: function-form `auth` callback reads current token each attempt.
- Risk: provider re-creates the socket on every render if `registry` identity changes. Mitigation: PLAN_04 memoizes the registry at module scope (it is a static object); document this requirement in the provider JSDoc.
- Risk: `socket.io-client` version drift between client and backend. Mitigation: pin `>=4.7`; confirm against backend Socket.IO server version.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (including the new `packages/realtime` project reference).
- Dependency check: `grep -r "@beyo/cases\|@beyo/tasks\|Keys" packages/realtime/src` returns nothing (proves zero domain coupling).
- Smoke (in PLAN_04 once mounted): connect logs a `connect` status transition; a manual backend `task:updated` emit produces a `useRealtimeLog()` entry with the invalidated key.

## Implementation summary

- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_realtime_01_realtime_package_transport_observability_20260619.md`
- Archive record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_01_realtime_package_transport_observability_20260619_0835.md`
- Validation: `npm run typecheck` passed; realtime package dependency boundary check found no feature/query-key imports.

## Review log

- `2026-06-19` author: initial draft.

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
