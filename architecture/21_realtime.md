# 21 — Real-Time Contract

## Definition

Real-time updates are pushed from the backend via Socket.io. Backend workers emit events when entities change. The frontend reacts by invalidating the relevant TanStack Query cache entries — TanStack Query then decides whether to fetch immediately (if a component is actively observing that data) or lazily (if the user has navigated away).

Event payload IDs are public client-facing IDs, matching API responses, route params, and query keys. Socket events never expose backend database primary keys.

```
Backend worker
      ↓  emits
Socket.io event  ('invoice:updated', { client_id })
      ↓  received by
SocketProvider   (one connection, all handlers registered here)
      ↓  calls
Event handler    (declared by the feature, assembled at app level)
      ↓  calls
queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
      ↓
TanStack Query:  user is viewing that invoice → refetch now
                 user is on another page      → mark stale, refetch on next visit
```

The frontend never fetches speculatively. It reacts to events and lets TanStack Query decide when the network round-trip is worth making.

---

## Typed events

All events are defined in one file. This is the contract between the backend and the frontend — every event the server can emit and every event the client can emit must appear here.

```ts
// src/lib/socket-types.ts

// Events the server (workers + API) emits to the client.
// All single-entity payloads carry { client_id } as the entity identifier.
// Room targeting is handled server-side; workspace_id is never in the payload.
export type ServerToClientEvents = {
  // Single-entity events — one change, one client_id
  'invoice:created': (payload: { client_id: string }) => void;
  'invoice:updated': (payload: { client_id: string }) => void;
  'invoice:deleted': (payload: { client_id: string }) => void;
  'payment:processed': (payload: { client_id: string; status: string }) => void;

  // Batch events — worker processed many entities at once, one event with N ids
  'invoice:batch-updated': (payload: { ids: string[] }) => void;
  'invoice:batch-deleted': (payload: { ids: string[] }) => void;

  // Notification events — pointer only; fetch content from the API
  'notification:new': (payload: { client_id: string }) => void;

  // NOTE: 'auth:session-expired' is NOT a server-emitted socket event.
  // The backend rejects an invalid JWT at handshake time via connect_error.
  // The SocketProvider dispatches a client-generated 'auth:session-expired'
  // DOM CustomEvent in its connect_error handler — it is never received from the server.
};

// Events the client emits to the server.
// Room joining is server-managed on connect; clients never emit room:join / room:leave.
export type ClientToServerEvents = {
  // Signals the user has opened an entity surface.
  // Backend writes a Redis presence key (TTL 90s) for all entity types.
  // For entity_type === "conversation": also joins the conversation Socket.IO room.
  'view_entity':  (payload: { entity_type: string; entity_client_id: string }) => void;
  // Signals the user has closed the entity surface.
  'leave_entity': (payload: { entity_type: string; entity_client_id: string }) => void;
};

export type AppSocket = import('socket.io-client').Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;
```

---

## Socket event registry

Each feature declares its socket event handlers in a `socket-events.ts` file. Handlers receive the typed event payload and a context object with `queryClient` and `notify` — everything needed to react to an event without importing feature internals.

```ts
// src/lib/socket-registry-types.ts
import type { QueryClient }          from '@tanstack/react-query';
import type { ServerToClientEvents } from '@/lib/socket-types';
import type { notify }               from '@/lib/notify';

export type SocketHandlerContext = {
  queryClient: QueryClient;
  notify:      typeof notify;
};

// Each handler matches the payload type of its event from ServerToClientEvents
export type SocketEventHandlers = {
  [K in keyof ServerToClientEvents]?: (
    payload: Parameters<ServerToClientEvents[K]>[0],
    ctx:     SocketHandlerContext,
  ) => void;
};
```

### Per-feature declaration

```ts
// features/invoices/socket-events.ts
import { invoiceKeys }              from './api/invoice-keys';
import type { SocketEventHandlers } from '@/lib/socket-registry-types';

export const invoiceSocketEvents: SocketEventHandlers = {
  'invoice:created': (_payload, { queryClient }) => {
    // New invoice — invalidate all lists (refetches only if list is currently viewed)
    queryClient.invalidateQueries({
      queryKey:    invoiceKeys.lists(),
      refetchType: 'active',
    });
  },

  'invoice:updated': ({ client_id }, { queryClient }) => {
    // Invalidate detail + lists — refetches only the ones currently observed
    queryClient.invalidateQueries({
      queryKey:    invoiceKeys.detail(client_id),
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey:    invoiceKeys.lists(),
      refetchType: 'active',
    });
  },

  'invoice:deleted': ({ client_id }, { queryClient }) => {
    // Remove the detail cache entirely — no point keeping deleted data
    queryClient.removeQueries({ queryKey: invoiceKeys.detail(client_id) });
    queryClient.invalidateQueries({
      queryKey:    invoiceKeys.lists(),
      refetchType: 'active',
    });
  },

  'payment:processed': ({ client_id }, { queryClient, notify }) => {
    // Payment is a critical state change — notify the user regardless of their position
    notify.success('Payment processed', `Invoice ${client_id} has been paid.`);
    queryClient.invalidateQueries({
      queryKey:    invoiceKeys.detail(client_id),
      refetchType: 'active',
    });
  },
};
```

### App-level assembly

```ts
// src/app/socket-registry.ts
import { invoiceSocketEvents }  from '@/features/invoices/socket-events';
import { settingsSocketEvents } from '@/features/settings/socket-events';
import { clientSocketEvents }   from '@/features/clients/socket-events';
import type { SocketEventHandlers } from '@/lib/socket-registry-types';

export const socketRegistry: SocketEventHandlers = {
  ...invoiceSocketEvents,
  ...settingsSocketEvents,
  ...clientSocketEvents,

  // notification:new carries only a client_id pointer — fetch the content from the API.
  // Do NOT call notify() here; you don't have the title or message yet.
  // The notification UI component reacts when the list query refetches.
  'notification:new': ({ client_id: _client_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey:    notificationKeys.list(),
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey:    notificationKeys.unreadCount(),
      refetchType: 'active',
    });
  },

  // NOTE: 'auth:session-expired' is NOT registered here — the backend never emits it.
  // The SocketProvider dispatches a client-generated DOM CustomEvent in connect_error.
};
```

No feature imports another feature's event handlers. The registry is the only join point.

---

## `SocketProvider`

One socket connection per authenticated session. The provider creates the connection, exposes it via context, tracks connection status, joins the global rooms, applies every handler from the registry, and tears everything down on sign-out.

```tsx
// src/providers/SocketProvider.tsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io }                        from 'socket.io-client';
import { useQueryClient }            from '@tanstack/react-query';
import { env }                       from '@/lib/env';
import { getAccessToken, refreshAccessToken } from '@/lib/auth-token';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';
import { socketRegistry }            from '@/app/socket-registry';
import { notify }                    from '@/lib/notify';
import type { AppSocket }            from '@/lib/socket-types';

// --- Contexts ---

const SocketContext = createContext<AppSocket | null>(null);

export type SocketStatus = {
  connected:    boolean;
  reconnecting: boolean;
};

const SocketStatusContext = createContext<SocketStatus>({
  connected:    false,
  reconnecting: false,
});

// --- Hooks ---

/** Returns the socket instance. Use only to emit events — never to attach listeners. */
export function useSocket(): AppSocket | null {
  return useContext(SocketContext);
}

/** Returns live connection status for UI indicators ("Live" / "Reconnecting…"). */
export function useSocketStatus(): SocketStatus {
  return useContext(SocketStatusContext);
}

// --- Provider ---

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  // workspaceId / userId kept as effect dependencies so the connection
  // is torn down and re-created if the session identity changes.
  // They are NOT used to emit room-join requests — the backend joins
  // workspace:{id} and user:{id} rooms automatically on connect.
  const workspaceId     = useAuthStore((s) => s.workspaceId);
  const userId          = useAuthStore((s) => s.user?.id);
  const queryClient     = useQueryClient();

  // socketRef — stable reference for use inside callbacks (avoids stale closure)
  // socket state — triggers context re-render when socket connects or disconnects
  const socketRef = useRef<AppSocket | null>(null);
  const [socket,  setSocket] = useState<AppSocket | null>(null);
  const [status,  setStatus] = useState<SocketStatus>({ connected: false, reconnecting: false });

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setStatus({ connected: false, reconnecting: false });
      return;
    }

    const s = io(env.VITE_WS_URL, {
      // Function form — called on every connection attempt (initial + reconnects).
      // Ensures the socket always uses the current in-memory token, not a snapshot
      // captured at creation time that becomes stale after a JWT refresh.
      auth:                 (cb) => cb({ token: getAccessToken() }),
      transports:           ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay:    1_000,
      reconnectionDelayMax: 30_000,
    }) as AppSocket;

    socketRef.current = s;
    setSocket(s);

    // --- Auth error handling ---
    s.on('connect_error', async (err) => {
      if (err.message === 'unauthorized') {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
      }
    });

    // --- Connection status ---
    s.on('connect', () => {
      setStatus({ connected: true, reconnecting: false });

      // workspace:{id} and user:{id} rooms are joined server-side automatically
      // when the backend validates the JWT on connect. No client emit needed.

      // Missed events: events emitted by the server while the client was disconnected
      // are lost — Socket.io has no replay mechanism. Invalidating active queries on
      // reconnect is the mitigation: the UI catches up to server state immediately.
      queryClient.invalidateQueries({ refetchType: 'active' });
    });

    s.on('disconnect', () => {
      setStatus({ connected: false, reconnecting: true });
    });

    s.on('reconnect_failed', () => {
      // All reconnection attempts exhausted — socket will not retry automatically.
      setStatus({ connected: false, reconnecting: false });
      notify.persistent('warning', 'Connection lost', 'Refresh the page to reconnect.');
    });

    // --- Event registry ---
    // All feature handlers registered in one loop. Wrapped in try/catch so a
    // handler bug cannot crash the provider or silence subsequent events.
    const ctx = { queryClient, notify };

    Object.entries(socketRegistry).forEach(([event, handler]) => {
      s.on(event as string, (payload: unknown) => {
        try {
          (handler as (p: unknown, c: typeof ctx) => void)(payload, ctx);
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error(`[Socket] Handler error for "${event}":`, err);
          }
        }
      });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setStatus({ connected: false, reconnecting: false });
    };
  }, [isAuthenticated, workspaceId, userId, queryClient]);

  return (
    <SocketContext.Provider value={socket}>
      <SocketStatusContext.Provider value={status}>
        {children}
      </SocketStatusContext.Provider>
    </SocketContext.Provider>
  );
}
```

Add `SocketProvider` inside `QueryClientProvider` and inside the auth lifecycle — it needs `useQueryClient()` and authenticated identity to be available. If `AuthProvider` lives in the router root route, `SocketProvider` usually lives inside it:

```tsx
// src/app/RootRoute.tsx
export function RootRoute() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SurfaceProvider>
          <Outlet />
        </SurfaceProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
```

The outer app providers still wrap `RouterProvider` with `QueryClientProvider`, `MotionConfig`, and other router-independent providers:

```tsx
// src/app/providers.tsx
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation}>
          <BreakpointProvider>
            {children}
            <NotificationRenderer />
          </BreakpointProvider>
        </LazyMotion>
      </MotionConfig>
    </QueryClientProvider>
  );
}
```

---

## Socket token lifecycle

```
App boots → initSession() → access token stored in auth-token.ts (in-memory)
         → SocketProvider mounts → socket connects → auth fn returns current token ✓

JWT expires → HTTP 401 → refreshAccessToken() → new token stored in auth-token.ts
           → socket auto-reconnects → auth fn returns new token ✓

Token expired before handshake → connect_error('unauthorized') → refreshAccessToken()
           → Socket.io retries → auth fn returns refreshed token ✓

Refresh fails → auth:session-expired dispatched → AuthProvider redirects
             → isAuthenticated → false → SocketProvider disconnects ✓

Sign-out → isAuthenticated → false → SocketProvider disconnects immediately ✓
```

The socket never holds a token value. Only the function that reads the current one.

---

## The "frontend decides" mechanism

`refetchType: 'active'` is the key. When a socket event arrives and a handler calls `invalidateQueries`, TanStack Query checks whether any mounted component is currently observing that cache entry:

| Observer state | What happens |
|---|---|
| Active observer (component is mounted and using this query) | Refetch fires immediately |
| No observer (user is on another page or surface is closed) | Cache marked stale — refetches when next observed |
| Query is disabled (`enabled: false`) | Marked stale but not refetched |

This means event handlers never need to check "is the user currently on this page?" — TanStack Query handles it. The handler always invalidates; the query layer decides whether the network round-trip is worth making now.

```ts
// This is all you need in a handler — TanStack Query does the rest
queryClient.invalidateQueries({
  queryKey:    invoiceKeys.detail(client_id),
  refetchType: 'active',   // refetch now if observed, mark stale if not
});
```

For critical state changes where the user needs to know regardless of their position (payment confirmed, task assigned to them), combine invalidation with a notification:

```ts
'payment:processed': ({ client_id }, { queryClient, notify }) => {
  notify.success('Payment confirmed');                          // always shown
  queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(client_id), refetchType: 'active' });
},
```

---

## Debouncing high-frequency events

Background workers processing bulk operations (50 invoices updated at once) emit 50 events in rapid succession. Each invalidation would trigger a refetch. Use `debouncedInvalidation` for events that are high-frequency by nature.

```ts
// src/lib/socket-debounce.ts
const _timers = new Map<string, ReturnType<typeof setTimeout>>();

export function debouncedInvalidation(
  queryClient: QueryClient,
  queryKey:    unknown[],
  delay = 300,
): void {
  const key = JSON.stringify(queryKey);
  const existing = _timers.get(key);
  if (existing) clearTimeout(existing);

  _timers.set(key, setTimeout(() => {
    queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
    _timers.delete(key);
  }, delay));
}
```

Use it in handlers for entity types that bulk operations target:

```ts
'invoice:updated': ({ client_id }, { queryClient }) => {
  // Detail is always immediate — only one thing changes at a time
  queryClient.invalidateQueries({
    queryKey:    invoiceKeys.detail(client_id),
    refetchType: 'active',
  });

  // Lists may receive many rapid invalidations from bulk ops — debounce
  debouncedInvalidation(queryClient, invoiceKeys.lists(), 300);
},
```

---

## Batch event handling

A batch event carries an array of IDs from a single worker operation. The handler must not blindly refetch all of them — most of those IDs are not in view. There are three possible states for each ID and the handler must act differently for each:

| Cache state | `refetchType` | Effect |
|---|---|---|
| In cache + active observer | `'active'` (default) | Refetch now — user is looking at it |
| In cache + no observer | `'none'` | Mark stale only — refetch when they navigate to it |
| Not in cache at all | Skip | Nothing to update — will fetch fresh on first access |

```ts
// src/lib/socket-batch.ts
import type { QueryClient, QueryKey } from '@tanstack/react-query';

type BatchInvalidationOptions = {
  queryClient: QueryClient;
  ids:         string[];
  toQueryKey:  (clientId: string) => QueryKey;   // maps a client_id to its detail query key
  listKey:     QueryKey;                          // the list key to always invalidate
};

export function batchInvalidation({
  queryClient,
  ids,
  toQueryKey,
  listKey,
}: BatchInvalidationOptions): void {
  const cache = queryClient.getQueryCache();

  ids.forEach((clientId) => {
    const queryKey = toQueryKey(clientId);
    const query    = cache.find({ queryKey, exact: true });

    if (!query) return;  // not in cache — nothing to do, will fetch fresh on access

    if (query.getObserversCount() > 0) {
      // Active observer — user is currently viewing this entity, refetch now
      queryClient.invalidateQueries({ queryKey });
    } else {
      // In cache but not viewed — mark stale without triggering a network request
      queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
    }
  });

  // The list always gets invalidated actively — it may show any of the changed items
  queryClient.invalidateQueries({ queryKey: listKey, refetchType: 'active' });
}
```

Usage in the invoice socket events:

```ts
// features/invoices/socket-events.ts
import { batchInvalidation }        from '@/lib/socket-batch';
import { invoiceKeys }              from './api/invoice-keys';
import type { SocketEventHandlers } from '@/lib/socket-registry-types';

export const invoiceSocketEvents: SocketEventHandlers = {
  // ... single-entity handlers ...

  'invoice:batch-updated': ({ ids }, { queryClient }) => {
    batchInvalidation({
      queryClient,
      ids,
      toQueryKey: (clientId) => invoiceKeys.detail(clientId),
      listKey:    invoiceKeys.lists(),
    });
  },

  'invoice:batch-deleted': ({ ids }, { queryClient }) => {
    // Remove deleted entries from cache entirely — no point marking them stale
    ids.forEach((clientId) => {
      queryClient.removeQueries({ queryKey: invoiceKeys.detail(clientId) });
    });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.lists(), refetchType: 'active' });
  },
};
```

### Single event vs batch event — which to use

| Scenario | Event type | Reason |
|---|---|---|
| User creates one invoice | `invoice:created` (single) | One change, notify immediately |
| Worker reconciles 3 invoices | `invoice:batch-updated` (batch) | Small batch, still worth IDs |
| Worker imports 500 invoices | `invoice:batch-updated` with all IDs OR a broader signal | IDs useful; `batchInvalidation` skips what's not in cache |
| Nightly reconciliation job | Broad signal (`invoice:invalidate-all`) | Too many to enumerate — just invalidate the whole entity |

For very broad worker operations, the backend can emit a signal without IDs:

```ts
// In ServerToClientEvents — for operations too broad to enumerate
'invoice:invalidate-all': (payload: Record<string, never>) => void;
```

```ts
// Handler — broad sweep, active only
'invoice:invalidate-all': (_payload, { queryClient }) => {
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all, refetchType: 'active' });
},
```

---

## Feature entity view / presence

Global rooms (`workspace:*`, `user:*`) are joined **server-side** by the backend the moment a valid JWT is received — the client never requests this. Feature-specific rooms and presence signals are handled by the `useEntityView` hook, which emits `view_entity` / `leave_entity` to the server while a surface is open.

**What the backend does with these events:**
- Writes a Redis presence key (`presence:{entity_type}:{entity_client_id}` → SET of user_ids, 90 s TTL) for **all** entity types. The notification system reads this to skip push-notifying a user who is currently viewing an entity.
- For `entity_type === "conversation"` specifically: also joins the `conversation:{entity_client_id}` Socket.IO room so the client receives `conversation:message-*` events.

```ts
// src/hooks/use-entity-view.ts
import { useEffect } from 'react';
import { useSocket } from '@/providers/SocketProvider';

export function useEntityView(entityType: string, entityClientId: string | null) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !entityClientId) return;

    socket.emit('view_entity', { entity_type: entityType, entity_client_id: entityClientId });

    return () => {
      socket.emit('leave_entity', { entity_type: entityType, entity_client_id: entityClientId });
    };
  }, [socket, entityType, entityClientId]);
}
```

Usage in feature controllers:

```ts
// features/cases/controllers/use-conversation-detail.controller.ts
export function useConversationDetailController(conversationId: string) {
  // Joins the conversation Socket.IO room AND sets presence — both handled server-side
  useEntityView('conversation', conversationId);
  // ... rest of controller
}

// features/cases/controllers/use-case-detail.controller.ts
export function useCaseDetailController(caseId: string) {
  // Sets presence only (no socket room join) — suppresses notifications while viewing
  useEntityView('case', caseId);
  // ... rest of controller
}
```

When the surface closes, the controller unmounts and the hook cleanup emits `leave_entity` automatically.

---

## Using `useSocket()` to emit events

`useSocket()` is for emitting client events only — ad-hoc presence announcements, typing indicators. Features never attach `socket.on()` listeners via this hook. For the standard view/leave presence pattern, use `useEntityView` instead.

```ts
// Usage — emitting a client event for a typing indicator
export function useInvoiceTypingIndicator(id: string) {
  const socket = useSocket();

  const announceTyping = useCallback(() => {
    // view_entity / leave_entity are the correct client-emitted presence events
    socket?.emit('view_entity', { entity_type: 'invoice', entity_client_id: id });
  }, [socket, id]);

  return { announceTyping };
}
```

## Using `useSocketStatus()` for connection indicators

```tsx
// src/components/shell/ConnectionStatus.tsx
import { useSocketStatus } from '@/providers/SocketProvider';

export function ConnectionStatus() {
  const { connected, reconnecting } = useSocketStatus();

  if (connected)    return <span className="text-green-500 text-xs">● Live</span>;
  if (reconnecting) return <span className="text-yellow-500 text-xs">● Reconnecting…</span>;
  return                   <span className="text-red-500   text-xs">● Offline</span>;
}
```

Mount this in the app shell (`TopBar`, `Sidebar`) where it is always visible.

---

## Agent interface consideration

Socket events are a natural trace of application state changes. For agent control, the registry handlers can optionally record events to the surface trace system:

```ts
'invoice:updated': ({ client_id }, { queryClient }) => {
  queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(client_id), refetchType: 'active' });

  // Optional: record for agent replay/debugging
  if (import.meta.env.DEV) {
    surfaceTrace.record('socket:invoice:updated', { client_id });
  }
},
```

---

## What real-time must NOT do

- **Never attach `socket.on()` listeners inside a component or hook.** All incoming event handling is declared in `features/<f>/socket-events.ts` and applied by the SocketProvider once. Components never touch listeners.
- **Never call `useSocket()` to subscribe to events.** `useSocket()` is for emitting only. Subscriptions are the registry's job.
- **Never pass `auth: { token: getAccessToken() }` as a plain object.** Use the function form so every reconnect gets the current token, not a stale snapshot captured at creation time.
- **Never ignore `connect_error`.** A rejected handshake means the token may be expired — attempt a refresh or dispatch the `auth:session-expired` DOM CustomEvent.
- **Never use socket events as the sole source of truth for UI state.** Socket events trigger cache invalidations. TanStack Query holds the truth — the socket only signals that the truth may have changed.
- **Never invalidate without `refetchType: 'active'`** unless you explicitly want to wake up all cached data regardless of whether the user can see it.
- **Never connect to the socket before the user is authenticated.** The SocketProvider checks `isAuthenticated` before creating the connection.
- **Never handle the same event in two different registry files.** Each event has exactly one handler. If two features care about the same event, merge the handlers into the app-level registry entry.
- **Never iterate batch IDs and call `invalidateQueries` with the default `refetchType`** for all of them. Use `batchInvalidation()` — it checks observer count and uses `refetchType: 'none'` for unobserved cache entries, preventing unnecessary network requests.
- **Never enumerate IDs in a batch event for very large worker operations.** If a job touches hundreds of entities, emit a broad signal (`invoice:invalidate-all`) instead. Enumerating 500 IDs in a socket payload is wasteful — the frontend will only be observing one or two of them.
- **Never emit `room:join` or `room:leave`.** These events are not registered on the backend. Use `view_entity` / `leave_entity` for feature presence, or rely on server-automatic room joining for workspace/user rooms.
- **Never call `notify()` inside the `notification:new` handler.** The payload is a pointer (`{ client_id }`) only — no title or message is included. Invalidate the notifications query and let the UI react when the list refetches.
- **Never add `auth:session-expired` to `ServerToClientEvents`.** The backend never emits this event. It is a client-generated DOM CustomEvent dispatched inside the `connect_error` handler when a token refresh fails.
- **Never read `payload.id` from a socket event payload.** All single-entity payloads use `client_id` as the entity identifier. There is no `id` field and no `workspace_id` field — room targeting is handled server-side.
