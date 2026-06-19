# PLAN_realtime_02_notifications_package_20260619

## Metadata

- Plan ID: `PLAN_realtime_02_notifications_package_20260619`
- Status: `archived`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T08:40:46Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_realtime_layer_shared_packages_20260619.md`

## Goal and intent

- Goal: Create the greenfield `@beyo/notifications` package — notification list/unread-count queries, an unread badge, toast-from-fetched-data, and the `notification:new` socket handler — shared by all apps.
- Business/user intent: Users see a live unread count and a toast when a new notification arrives, with the content always sourced from the REST API (never from the socket payload).
- Non-goals: web push (deferred); per-app notification UI shells (apps mount the provided primitives).

## Scope

- In scope: package scaffold, notification types + DTO/view-model, `notificationKeys`, list query, unread-count query, mark-read mutation, `NotificationBadge`, a toast-on-new mechanism, and `notificationSocketEvents` (the `notification:new` handler).
- Out of scope: socket transport (PLAN_01), feature handlers (PLAN_03/04), app mounting (PLAN_04).
- Assumptions: `notification:new` is user-scoped and carries only `{ client_id }` (per catalog); the full notification is fetched via REST. No notification domain exists anywhere today (greenfield).

## Clarifications required

- [x] **Notification REST contract** — exact endpoints + response envelope for (a) list, (b) unread count, (c) mark-read. Not in any handoff. Blocks finalizing `api/*` functions.
  - **Answered 2026-06-19:** All three endpoints are implemented. Details:

  **(a) List**
  ```
  GET /api/v1/notifications
  Query params:
    unread_only:      bool   (default false)
    limit:            int    (default 30, max 100)
    before_client_id: string (keyset pagination cursor — client_id of the oldest item on current page)

  Response:
  {
    "notifications": [ NotificationItem ],
    "has_more":      bool,
    "unread_count":  int   ← always included; use this for the badge without a second request
  }
  ```

  **(b) Unread count only** (lightweight — badge polling or post-login hydration without loading the full list)
  ```
  GET /api/v1/notifications/unread-count

  Response: { "unread_count": int }
  ```
  Note: since the list response already returns `unread_count` inline, `notificationKeys.unreadCount()` can be satisfied by either endpoint. The dedicated endpoint is useful when only the badge needs refreshing.

  **(c) Mark read**
  ```
  POST /api/v1/notifications/mark-read
  Body:
  {
    "notification_client_ids": string[] | null,  // specific IDs to mark read, or null
    "mark_all_read":           bool              // true to clear all unread
  }
  ```

- [x] **Notification payload fields** — needed for toast (title/body/type/severity, deep-link target). Blocks the view-model.
  - **Answered 2026-06-19:** Two corrections to the assumed shape, plus two additional fields:

  ```ts
  type NotificationItem = {
    client_id:         string;
    notification_type: string;       // ← field is "notification_type", NOT "type"
    title:             string;
    body:              string;
    entity_type:       string | null; // ← deep-link domain (e.g. "task", "case") — was missing from assumption
    entity_client_id:  string | null; // ← deep-link target id — was missing from assumption
    read_at:           string | null;  // ISO datetime, null if unread
    created_at:        string;         // ISO datetime
  }
  ```

  Changes required in `src/types.ts`:
  1. Rename `type` → `notification_type` in `NotificationDtoSchema` and `NotificationViewModel`.
  2. Add `entity_type: z.string().nullable()` and `entity_client_id: z.string().nullable()` to the schema.
  3. No `severity` field exists — remove it from any assumption.
  4. `entity_type` + `entity_client_id` are the deep-link target: use them in the toast action and in click handlers on notification list items to navigate to the entity.

## Acceptance criteria

1. `@beyo/notifications` typechecks and exports the public API below.
2. `notificationSocketEvents['notification:new']` invalidates `notificationKeys.list()` and `notificationKeys.unreadCount()` with `refetchType: 'active'` and calls **no** `notify()` directly (content comes from the refetched list).
3. A toast appears for genuinely new notifications, derived from the **fetched** list (diff against previously-seen ids), not from the socket payload.
4. `NotificationBadge` renders the unread count from the unread-count query and stays live (the socket handler invalidates it).

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: query hook + key structure.
- `architecture/08_hooks.md`: action/mutation hook shape (mark-read).
- `architecture/24_dto.md` + `architecture/34_runtime_validation.md`: DTO → view-model + Zod parsing.
- `architecture/21_realtime.md`: the `notification:new` handler rule (pointer only; fetch from API).
- `architecture/20_notifications.md` (if present): `notify`/toast conventions.

### Local extensions loaded

- `architecture/04_api_client_local.md`: backend envelope shape (`ok`/`data`/`warnings`), error shape.

### File read intent — pattern vs. relational

Permitted relational reads:
- `packages/lib/src/notify.ts` — the toast API (`notify.success/info/error`).
- `packages/lib/src/client-id.ts` — `Notification` prefix is `not`; reuse `ClientIdSchema`.
- `packages/cases/src/api/case-keys.ts` and `packages/cases/src/api/get-unread-counts.ts` — relational example of an existing unread-count query + key factory shape to mirror.
- `packages/api-client/src/index.ts` — `apiClient` usage.

Prohibited: reading another query hook merely to copy TanStack setup (use `05_server_state.md`).

### Skill selection

- Trigger terms: `notification, toast, notify, unread`.

## Implementation plan

1. **Scaffold `packages/notifications/`** like the other source-only packages. `package.json` `"name": "@beyo/notifications"`, peer deps: `@beyo/api-client`, `@beyo/lib`, `@beyo/realtime` (for `SocketEventHandlers` type), `@beyo/ui`, `@tanstack/react-query >=5`, `react >=19`, `zod >=4`.

2. **`src/types.ts`** — `NotificationDtoSchema` (Zod) + `NotificationViewModel` + `toNotificationViewModel`. Use the assumed field set until the clarification resolves; keep extra-field access defensive (optional chaining) per the catalog payload-shape rules.

3. **`src/api/notification-keys.ts`**:
   ```ts
   export const notificationKeys = {
     all: ['notifications'] as const,
     lists: () => [...notificationKeys.all, 'list'] as const,
     list: (params: ListNotificationsParams = {}) => [...notificationKeys.lists(), params] as const,
     unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
   };
   ```

4. **`src/api/use-notifications-query.ts`**, **`src/api/use-unread-count-query.ts`**, **`src/api/use-mark-read.ts`** — standard query/mutation hooks against the assumed endpoints; mark-read does optimistic update + invalidates `unreadCount()`.

5. **`src/socket-events.ts`** — the package-owned handler:
   ```ts
   export const notificationSocketEvents: SocketEventHandlers = {
     'notification:new': (_payload, { queryClient }) => {
       queryClient.invalidateQueries({ queryKey: notificationKeys.lists(), refetchType: 'active' });
       queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(), refetchType: 'active' });
       // No notify() here — content arrives via the refetched list (see step 6).
     },
   };
   ```

6. **Toast-from-fetch** — `src/hooks/use-notification-toasts.ts`: subscribes to the list query, keeps a ref of seen `client_id`s, and on each successful refetch calls `notify.info(title, body)` for ids not previously seen (skip on first load). This guarantees toast content is always the persisted notification, never the socket pointer. Apps mount this once (PLAN_04).

7. **`src/components/NotificationBadge.tsx`** — reads `useUnreadCountQuery()`, renders a count chip; accepts `className` so each app styles it.

8. **`src/hooks/use-notifications.ts`** — convenience controller exposing `{ notifications, unreadCount, markRead, markAllRead }`.

9. **`src/index.ts`** — export `notificationKeys`, the query/mutation hooks, `notificationSocketEvents`, `useNotificationToasts`, `NotificationBadge`, `useNotifications`, and notification types.

10. Add `tsc -p packages/notifications/tsconfig.json --noEmit` to the root `typecheck` script.

## Risks and mitigations

- Risk: building against unconfirmed REST endpoints. Mitigation: isolate all endpoint strings + response parsing in `api/*`; a backend correction touches only those files. Flagged as a clarification.
- Risk: toast storm on reconnect (the reconnect-time `invalidateQueries({ refetchType:'active' })` refetches the list). Mitigation: the seen-ids diff in step 6 only toasts ids not seen before; a full refetch of already-seen items produces no toasts.
- Risk: duplicate toasts across multiple mounted consumers. Mitigation: `useNotificationToasts` is documented as mount-once (app root), with a module guard if needed.

## Validation plan

- `npm run typecheck`: zero errors.
- Unit (MSW): `notification:new` handler invalidates both keys; toast hook toasts only new ids and skips the initial load.
- Integration (PLAN_04): emit a backend notification → badge increments and a single toast appears with the fetched title.

## Implementation summary

- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_realtime_02_notifications_package_20260619.md`
- Archive record: `docs/architecture/archives/ARCHIVE_PLAN_realtime_02_notifications_package_20260619_0840.md`
- Validation: `npm run typecheck` passed; socket handler invalidates list/unread-count keys and does not call `notify()`.

## Review log

- `2026-06-19` author: initial draft.

## Lifecycle transition

- Current state: `archived`
- Next state: `complete`
- Transition owner: `Codex`
