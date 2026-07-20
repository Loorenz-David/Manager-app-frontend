# HANDOFF_TO_FRONTEND_push_notification_system_20260619

## Metadata

- Handoff ID: `HANDOFF_TO_FRONTEND_push_notification_system_20260619`
- Received at (UTC): `2026-06-19T00:00:00Z`
- Receiving agent: `frontend`
- Backend source plan: none (existing backend infrastructure)
- Backend source summary: none (discovery handoff)

## Backend delivery context

- What backend implemented: Full Web Push / VAPID pipeline. The backend can store per-user browser push subscriptions and send encrypted push payloads to them via `pywebpush`. Stale subscriptions (HTTP 410 Gone) are auto-deleted.
- API or contract changes: Endpoints documented below — all already live.
- Socket event changes: `notification:new` UserEvent fires on the user's socket room simultaneously with the push — frontend should deduplicate if both arrive.
- Feature flags/toggles: None. Push is enabled as long as `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` are set in the backend environment.

## Frontend action required

1. Register a service worker (`/sw.js`) that handles `push` and `notificationclick` events.
2. On app start (post-login): fetch the VAPID public key, request notification permission, subscribe via `PushManager`, and POST the subscription to the backend.
3. On logout or permission revoke: call `PushManager.getSubscription()` → `sub.unsubscribe()` → DELETE the subscription from the backend.
4. In the service worker `notificationclick` handler: route the click using `data.entity_type` + `data.entity_client_id` from the push payload.

## Interface details

### 1 — Get VAPID public key

```
GET /api/v1/notifications/vapid-public-key
Auth: none required (public endpoint)
```

Response:
```json
{ "public_key": "<base64url-encoded VAPID public key>" }
```

Use `public_key` as the `applicationServerKey` when calling `PushManager.subscribe()`.

---

### 2 — Register push subscription

```
POST /api/v1/notifications/push-subscription
Auth: required (any role)
```

Request body — extract these directly from the `PushSubscription` object returned by `PushManager.subscribe()`:
```json
{
  "endpoint":     "https://fcm.googleapis.com/fcm/send/...",
  "p256dh":       "<base64url string>",
  "auth":         "<base64url string>",
  "device_label": "Chrome on MacBook"   // optional, human-readable label
}
```

Response:
```json
{ "subscription": { "client_id": "psh_..." } }
```

This call is **idempotent** — safe to call on every app start. If the subscription already exists it is updated in place. Call it once per browser/device after the user grants notification permission.

---

### 3 — Unregister push subscription

```
DELETE /api/v1/notifications/push-subscription
Auth: required (any role)
```

Request body — same shape as register:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh":  "<base64url string>",
  "auth":    "<base64url string>"
}
```

Response: `{}`

Call this on logout, on permission revoke, or when `PushManager.getSubscription()` returns `null` after a previously registered sub.

---

### 4 — Push payload shape (received in service worker)

The service worker `push` event delivers:
```json
{
  "title": "Task resolved",
  "body":  "A task has been resolved.",
  "data": {
    "notification_client_id": "ntf_01KVFR3T3P2R43YWBPDYYZX8HM",
    "entity_type":            "task",
    "entity_client_id":       "tsk_01KVFR3T3P2R43YWBPDYYZX8HM"
  }
}
```

`entity_type` current values: `"task"`, `"task_step"`, `"upholstery"`, `"item"`

Use `entity_type` + `entity_client_id` for click routing. `notification_client_id` can be used to mark the in-app notification read via `POST /api/v1/notifications/mark-read`.

---

### 5 — In-app notification endpoints (companion to push)

These are for the in-app notification bell / feed, which exists in parallel with push:

| Endpoint | Description |
|---|---|
| `GET /api/v1/notifications` | Paginated list. Query params: `unread_only`, `limit`, `before_client_id` |
| `GET /api/v1/notifications/unread-count` | Returns `{ count: number }` |
| `POST /api/v1/notifications/mark-read` | Body: `{ notification_client_ids?: string[], mark_all_read?: bool }` |

---

## When push notifications fire (backend triggers)

The frontend does **not** need to handle these triggers — the backend decides when to push. This list is for context only:

| Trigger | Audience |
|---|---|
| Task resolved / failed / cancelled | All workspace managers + task creator + task pin holders (actor excluded) |
| Step finalized after undo window (COMPLETED) | Same audience via task-level resolution |
| Step state changed | Only users who have pinned that specific **step** (`entity_type = "task_step"`) |
| Worker assigned to step | Same step-level pin audience |
| Upholstery order created / received | Upholstery-specific audience |
| Item requirements ordered / in-use / completed | Items-specific audience |

**Cases have no push notifications today.** Case participants receive socket events (`case:participant-added`) but no push. This is a known gap — do not build frontend logic that expects a push on case creation.

---

## Deduplication: push vs. socket

When the app is open and connected, the user receives **both** a push notification and a `notification:new` UserEvent on their socket room. The in-app notification bell should react to the socket event. The push notification (shown by the OS) should only appear when the app is backgrounded or closed — the service worker should suppress or close the push if the app is focused.

Pattern:
```js
// In service worker push handler
self.addEventListener('push', event => {
  // Check if a focused app window is already open
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const focused = clients.find(c => c.focused)
      if (focused) return // app is open — socket already handled it
      const { title, body, data } = event.data.json()
      return self.registration.showNotification(title, { body, data })
    })
  )
})
```

---

## Typical frontend lifecycle

```
App start (post-login)
  1. GET /api/v1/notifications/vapid-public-key  → public_key
  2. await navigator.serviceWorker.register('/sw.js')
  3. const permission = await Notification.requestPermission()
  4. if (permission === 'granted'):
       const sub = await registration.pushManager.subscribe({
         userVisibleOnly: true,
         applicationServerKey: urlBase64ToUint8Array(public_key),
       })
       await POST /api/v1/notifications/push-subscription with {
         endpoint: sub.endpoint,
         p256dh:   arrayBufferToBase64(sub.getKey('p256dh')),
         auth:     arrayBufferToBase64(sub.getKey('auth')),
         device_label: navigator.userAgent,
       }

Logout
  5. const sub = await registration.pushManager.getSubscription()
  6. if (sub):
       await sub.unsubscribe()
       await DELETE /api/v1/notifications/push-subscription with same body

Service worker — sw.js
  self.addEventListener('push', event => { /* show notification, suppress if focused */ })
  self.addEventListener('notificationclick', event => {
    event.notification.close()
    const { entity_type, entity_client_id } = event.notification.data
    // open/focus window at the correct route
  })
```

## Frontend contract implications

- Architecture contracts affected: none (new feature area, no existing contracts modified)
- Local extension updates needed: add push subscription lifecycle to auth/session management

## Validation notes

- Backend validation run: `GET /api/v1/notifications/vapid-public-key` returns the public key; `POST /push-subscription` is idempotent and returns `client_id`.
- Required frontend runtime validation: subscribe in a Chromium browser, trigger a task resolution, confirm the OS push notification appears when the tab is backgrounded.

## Trace links

- Originating frontend request: none (backend discovery)
- Related frontend plan: none yet
- Related debug plan: none
