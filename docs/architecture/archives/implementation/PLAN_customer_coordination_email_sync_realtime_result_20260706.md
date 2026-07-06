# PLAN_customer_coordination_email_sync_realtime_result_20260706

## Metadata

- Plan ID: `PLAN_customer_coordination_email_sync_realtime_result_20260706`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-06T06:13:05Z`
- Last updated at (UTC): `2026-07-06T07:00:49Z`
- Related issue/ticket: `n/a` — backend contract change reported verbally by David, no written handoff doc exists yet for this specific change (searched `docs/handoff/from_backend/` — nothing matches `email.threads.synced` or an async `sync-targeted` contract).
- Intention plan: `docs/architecture/under_construction/intention/making_seller_app_2.txt` (email inbox capability — this plan corrects the sync mechanics under that same intention, it does not introduce new user-facing scope).
- Predecessor: `docs/architecture/archives/implementation/PLAN_email_thread_seed_last_message_and_syncing_indicator_20260705.md`

## Goal and intent

- Goal: Migrate **both** customer-coordination email sync endpoints — batch (`sync-targeted`) and single-thread (`{thread_id}/sync`) — from "await the sync HTTP response, then invalidate based on its body" to "fire the sync request, then invalidate based on the `email.threads.synced` Socket.IO event that the backend now emits once its worker finishes."
- Business/user intent: The backend no longer processes either `POST /api/v1/email-threads/sync-targeted` or `POST /api/v1/email-threads/{thread_id}/sync` synchronously — both enqueue a worker job and respond immediately, emitting the same `email.threads.synced` event to the requesting user's `user:{requested_by_user_id}` room when the job completes (confirmed by David 2026-07-06: `postThreadSync` follows the identical pattern). This explains why the sample payload already carries `thread_client_ids` as an **array** — it's shaped to represent either a many-thread batch sync or a one-thread targeted sync through the same event. The frontend's current code on both call sites awaits the old synchronous response body (`created_message_count`, `threads_with_new_messages`/`sync_success`) to decide whether to invalidate/refetch. Once the backend ships the async version, that body no longer reflects real sync results, so the current gating logic silently breaks on both endpoints — invalidation would fire on the wrong signal (an empty ack) or not at all, and the inbox list, the open thread's messages, and the unread badge would all stop updating after a sync.
- Non-goals:
  - Redesigning the sync trigger cadence (mount / visibility-regain / manual pull-to-refresh, on-open per-thread sync) — that was already corrected in the prior session (10s polling removed, self-activation on app load added) and is not changing here. This plan only changes *what happens after* each request is sent.
  - The coordination *state* counts badge (`customerCoordinationKeys.counts`, "Coordinate" button) — driven by `customer_coordination` record state (pending/coordinating/completed/failed), not by email sync. Not touched here.
  - The email batch-send job (`postEmailBatch` / `useSendEmailBatch`, `job_id` + `status: "queued"`) — a separate async flow with its own (currently toast-only, no socket) completion handling. Not touched here.
- Assumptions:
  - The socket connection itself is unaffected: `RealtimeProvider` already connects on auth and joins `user:{id}` server-side automatically (see `packages/realtime/src/providers/RealtimeProvider.tsx:71-155`). No provider-level change is needed to *receive* `user`-room events — only a new registry entry to *handle* this one.
  - `email.threads.synced` is scoped to the authenticated user via the `user:{requested_by_user_id}` room, matching the existing `case:participant-added` precedent for user-scoped events documented in `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`.
  - Confirmed via real captures (2026-07-06, corrected after an initial transcription error — see Review log): `thread_client_ids` and `entity_client_ids` at the top level of the socket payload echo the **explicit scoping IDs from the request**, not "all threads/entities the sync touched." A `sync-targeted` call with no explicit ids (just `entity_type` + `max_threads`) comes back with both as `[]` even though `requested_thread_count: 3` — but a single-thread `POST /email-threads/{thread_id}/sync` call comes back with `thread_client_ids: ["<that same thread_id>"]`, correctly echoing what was requested. The actual sync result counts live in `requested_thread_count`/`synced_thread_count`/`created_message_count`/etc., not in the length of these two echo arrays — but `thread_client_ids` **is** a valid correlation signal for a single-thread-scoped request specifically (see Clarification 5).

## Scope

- In scope:
  - `packages/realtime/src/lib/socket-types.ts` — add `'email.threads.synced'` to `ServerToClientEvents` with its full payload type.
  - `packages/task-customer-coordination/src/socket-events.ts` — **new file**, the feature's registry handler for this event.
  - `packages/task-customer-coordination/src/index.ts` — export the new handler map.
  - `apps/selleres-app/ManagerBeyo-app-sellers/src/app/socket-registry.ts` — merge the new handler map into the app registry.
  - `packages/task-customer-coordination/src/api/post-sync-targeted.ts` — update the response schema to the **confirmed** immediate/ack shape (Clarification 1 resolved for this endpoint via a real network capture — see below).
  - `packages/task-customer-coordination/src/api/post-thread-sync.ts` — same schema rework, ack shape assumed identical (same underlying job-enqueue mechanism) but not yet captured live for this specific endpoint — low-risk residual, see Clarification 1.
  - `packages/task-customer-coordination/src/sync/use-customer-coordination-email-sync.ts` — stop branching on the (now meaningless) synchronous result body; keep firing the request as the trigger, let the socket handler own invalidation.
  - `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts` — rework `refreshInbox()`, the on-open per-thread sync effect, and `refreshThread()` so none of them manually refetch/invalidate right after their respective POST resolves (see Clarification 5 for the UX trade-off this implies, now applying to both list-level and thread-level syncing indicators).
- Out of scope: everything under Non-goals above; any manager-app or workers-app changes (customer coordination email is a seller-app-only feature today — confirmed via `grep -rl "task-customer-coordination" apps/` returning only the sellers app).
- Assumptions: see above.

## Clarifications required

- [x] **1. Exact immediate response shape.** **Fully resolved 2026-07-06 (David)** via real network captures of **both** endpoints — identical ack shape:
  ```json
  { "data": { "enqueued": true, "task_client_id": "task_...", "connection_client_id": "ecn_01KWPXN70VB16EE1Z2K92BSTGR" }, "ok": true, "warnings": [] }
  ```
  `sync-targeted` and `POST /email-threads/{thread_id}/sync` (captured against `eth_01KWS49NA60JER46TTA3G0GD4E`) both return this exact shape. So the ack `data` schema is `{ enqueued: boolean; task_client_id: string | null; connection_client_id: string | null }` for both endpoints — Implementation steps 2 and 8 use the same schema, no assumption remaining. `task_client_id` is present even on calls with no explicit task/entity scoping in the request; treat it as informational only, never branch on it.
- [x] **2. Does `POST /email-threads/{thread_id}/sync` (single-thread, `postThreadSync`) get the same async treatment?** **Resolved 2026-07-06 (David): yes** — same worker + `email.threads.synced` pattern as `sync-targeted`. `openThread`'s on-open sync effect and `refreshThread()` (both in `use-customer-coordination-email-inbox.controller.ts`) are now in firm scope — see Implementation step 9.
  **Structural finding from the capture (corrected — see Review log):** for a single-thread sync call (`POST /email-threads/eth_01KWS49NA60JER46TTA3G0GD4E/sync`), the resulting `email.threads.synced` payload's `thread_client_ids` correctly echoes back `["eth_01KWS49NA60JER46TTA3G0GD4E"]` — the specific thread requested. This means, unlike a broad `sync-targeted` call (which has no specific thread to echo, so `thread_client_ids: []`), a single-thread sync **can** be correlated to its own completion event by checking `payload.thread_client_ids.includes(selectedThreadId)`. This makes Clarification 5's Option B (keep the thread-level "Syncing…" indicator alive until its own event arrives) technically buildable for the thread-scoped case specifically — see the revised discussion in Clarification 5. It does not change anything for the list-level indicator, since `refreshInbox()`/the background sync never scope by thread id.
- [x] **3. Does `email.threads.synced` need scoping by `entity_type` / `major_entity_type`?** **Resolved 2026-07-06 (David)** via the same real capture — the actual socket payload for a customer-coordination sync-targeted call carries `"entity_type": "task_customer_coordination"` (matching `SyncTargetedInput.entity_type` exactly) and `"major_entity_type": null`. My earlier example payload's `"task"`/`"case"` values were illustrative placeholders, not real backend output. Since we now have the confirmed literal, Implementation step 3 adds the `entity_type === "task_customer_coordination"` filter guard — cheap, correct, and future-proofs against a second consumer of this event without waiting for one to exist.
- [ ] **4. Field duplication in the payload — which name is authoritative?** Partially clarified by the real capture, still open for one pair:
  - `connection_client_id` (singular, `"ecn_01KWPXN70VB16EE1Z2K92BSTGR"`) vs `connection_client_ids` (plural, `["ecn_01KWPXN70VB16EE1Z2K92BSTGR"]`) — the real payload shows the singular value is also the sole element of the plural array, consistent with "singular = the connection that serviced *this* request, plural = the full set of mailbox connections touched by the sync" (could differ if a sync ever spans multiple mailbox connections). Not a true duplicate — **read `connection_client_id`** for this feature's purposes (single mailbox), the plural field is informational.
  - `threads_with_new_messages` vs `thread_ids_with_new_messages` — **still ambiguous.** In the captured example both are `[]` because `created_message_count: 0` (no new mail that run) — an uninformative case that doesn't distinguish "same list, two names" from "materially different lists." **Recommendation:** keep reading `threads_with_new_messages` (matches the pre-existing synchronous-response field name, likely the surviving one) for the `hasNewMessages` gate; low risk either way since the gate also checks `created_message_count > 0`, which the real payload confirms is populated correctly (`0` when nothing changed, per the example).
- [ ] **5. "Syncing" UX after both endpoints become fire-and-forget.** This now applies to two indicators:
  - **List-level:** `EmailInboxView`'s `PullToRefresh` awaits `onRefreshInbox()` and stops its spinner when that promise resolves (`packages/emails/src/components/EmailInboxView.tsx:57-62`).
  - **Thread-level:** `isMessagesSyncing` (`messagesQuery.isFetching || isThreadSyncing`) drives the "Syncing…" indicator in `EmailThreadView`; `isThreadSyncing` is currently set true until `postThreadSync(...)` resolves (`use-customer-coordination-email-inbox.controller.ts`'s on-open effect and `refreshThread()`).
  Once both POSTs resolve almost immediately (they're just acks now), both indicators will clear **before** new mail has actually synced — the UI updates a moment later, silently, when the socket event lands and its invalidation re-triggers a real (actively-observed) refetch, which flips `isFetching`/loading state back on briefly. There is a small gap in between (ack resolved, socket event not yet arrived) where neither indicator is showing anything, even though the backend is still working. Two options, same trade-off for both indicators:
  - **Option A — accept eventual consistency (recommended, matches this codebase's existing real-time philosophy in `architecture/21_realtime.md`: "frontend never fetches speculatively, it reacts to events").** Both `refreshInbox()`/the on-open effect/`refreshThread()` just await their ack and return; each indicator stops quickly, dips, then (if a refetch is triggered by the socket event) reappears briefly during the real refetch. No new machinery.
  - **Option B — keep each indicator alive until its matching socket event arrives.** **Partially buildable, per the corrected Clarification 2 finding:** for the **thread-level** indicator specifically, `payload.thread_client_ids` echoes back the exact thread id from a single-thread sync request, so a handler *could* correlate `payload.thread_client_ids.includes(selectedThreadId)` to know "this event is (at least in part) about my open thread" and keep `isThreadSyncing` alive until then. For the **list-level** indicator this correlation doesn't exist — `refreshInbox()`/the background sync never scope by thread id, so `thread_client_ids` is always `[]` for those calls, giving nothing to match against. Building Option B would still require new machinery not used elsewhere in this codebase (e.g. extending `useEmailInboxSyncStore` with a pending-promise resolver the socket handler calls), and only for the thread case — the list-level indicator would stay on Option A regardless, so the two indicators would end up with different behavior.
  **Recommendation:** ship Option A for both indicators for consistency and simplicity (still the codebase's established real-time philosophy — react to events, don't correlate requests to responses). Note for future revisit: `thread_client_ids` correlation makes Option B a real, low-effort upgrade path for the thread-level indicator specifically, if the eventual-consistency gap ever proves confusing in practice.

## Acceptance criteria

1. `packages/realtime/src/lib/socket-types.ts` types `'email.threads.synced'` with the full payload shape from the backend (per Implementation step 1); no other `ServerToClientEvents` entries are altered.
2. Opening the seller app (or bringing it back to foreground) still fires `POST /email-threads/sync-targeted` immediately (unchanged trigger behavior from the prior session's work), and that request now resolves near-instantly regardless of how many/few threads actually had new mail.
3. When the backend emits `email.threads.synced` for the current user with `entity_type === "task_customer_coordination"`, and the payload indicates new messages (`created_message_count > 0` or `threads_with_new_messages.length > 0`), the coordination inbox list (`useCoordinationInboxThreadsQuery`), the open thread's messages (`useThreadMessagesQuery`, via the shared `customerCoordinationEmailKeys.all` prefix), and the Home unread badge (`useEmailUnreadCountQuery`) all refetch — with no manual `refetch()` call left in `use-customer-coordination-email-sync.ts` driving this.
4. When the payload indicates no new messages, no query is invalidated (mirrors today's gating — avoids a pointless refetch storm on every no-op sync).
5. Pull-to-refresh on the inbox (`refreshInbox`) no longer performs its own `Promise.all([inboxQuery.refetch(), invalidateQueries(unreadCount)])` immediately after the POST resolves; per Clarification 5 Option A, the spinner stops on ack and the actual data refresh happens on the subsequent socket event.
6. Opening a thread and `refreshThread()` no longer call `messagesQuery.refetch()` / `inboxQuery.refetch()` based on `postThreadSync`'s (now-meaningless) synchronous result; the same `email.threads.synced` socket handler's invalidation drives the thread messages refetch when new messages actually arrive (the shared `customerCoordinationEmailKeys.all` prefix already covers `thread-messages` — no separate handler needed).
7. `npm run typecheck` passes for the seller app and `@beyo/realtime`, `@beyo/task-customer-coordination`.
8. No other feature's socket handling regresses — `socketRegistry` in the seller app still spreads all existing handler maps plus the new one; no event name collisions (`'email.threads.synced'` does not exist anywhere else in `ServerToClientEvents` today — confirmed via grep).

## Contracts and skills

### Contracts loaded

- `architecture/21_realtime.md`: primary contract — event typing, per-feature `socket-events.ts` registry pattern, app-level assembly, `refetchType: 'active'` semantics, and the explicit rule "never handle the same event in two different registry files."
- `architecture/05_server_state.md`: TanStack Query invalidation semantics (`invalidateQueries`, `refetchType`, observer-based refetch decisions).
- `architecture/35_shared_packages.md`: package boundary rules — the new socket handler lives in `@beyo/task-customer-coordination` (the feature package), not the seller app, matching the existing `caseSocketEvents` / `taskNoteSocketEvents` placement.
- `architecture/04_api_client_local.md`: `apiClient` + `ApiEnvelopeSchema` pattern for the `post-sync-targeted.ts` and `post-thread-sync.ts` schema updates.
- `task_system/frontend_contract_goal_mapping_guide.md`: pattern-vs-relational read discipline.

### Local extensions loaded

- None beyond the above — this plan does not touch auth, permissions, or DTO-layer concerns.

### File read intent — pattern vs. relational

All reads for this plan were **relational**: confirming what `postSyncTargeted`, `use-customer-coordination-email-sync.ts`, the inbox controller, and the existing `caseSocketEvents`/`taskNoteSocketEvents` files currently do. The new socket-events.ts file should be **written from the `21_realtime.md` contract's registry pattern**, not cloned line-for-line from `packages/cases/src/socket-events.ts` — that file was read only to confirm the shape/cleanliness convention (no stray `console.log`, unlike `packages/task-notes/src/socket-events.ts` which has debug logging that should NOT be copied).

Permitted relational reads already performed:
- `packages/task-customer-coordination/src/api/customer-coordination-email-keys.ts` — confirmed `customerCoordinationEmailKeys.all` is the correct invalidation prefix (covers `inbox-threads`, `thread-messages`, `unread-count` — all nested under it).
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/controllers/use-home-view.controller.ts` — confirmed `emailUnreadCount` reads `useEmailUnreadCountQuery()` directly, so the `customerCoordinationEmailKeys.all` invalidation also refreshes the Home badge with no separate wiring needed.
- `packages/realtime/src/providers/RealtimeProvider.tsx` and `packages/realtime/src/lib/socket-registry-types.ts` — confirmed the registry mechanism requires no provider changes, only a new `ServerToClientEvents` entry + a new handler map merged into `socket-registry.ts`.

## Implementation plan

1. **`packages/realtime/src/lib/socket-types.ts`** — add the new event to `ServerToClientEvents` (append near the other feature-scoped entries, e.g. after `'notification:new'`):
   ```ts
   'email.threads.synced': (payload: {
     task_client_id: string | null;
     workspace_id: string;
     requested_by_user_id: string;
     role_name: string;
     connection_client_id: string | null;
     connection_client_ids: string[];
     thread_client_ids: string[];
     entity_type: string;
     entity_client_ids: string[];
     major_entity_type: string | null;
     major_entity_client_id: string | null;
     max_threads: number;
     requested_thread_count: number;
     synced_thread_count: number;
     searched_rfc_message_id_count: number;
     matched_uid_count: number;
     fetched_message_count: number;
     created_message_count: number;
     existing_message_count: number;
     threads_with_new_messages: string[];
     thread_ids_with_new_messages: string[];
     thread_errors: Record<string, string>;
     sync_success: boolean;
     sync_error: string | null;
   }) => void;
   ```
   Both fields from Clarification 4's pairs are included defensively; the handler in step 3 should read only the confirmed-canonical one once Clarification 4 resolves, but the type carries both so nothing throws either way. `role_name` and `entity_type`/`major_entity_type` are typed as plain `string`, not literal unions — matching the existing convention for `new_state` fields in this file (values may grow, and this is a socket payload, not a validated API response).

2. **`packages/task-customer-coordination/src/api/post-sync-targeted.ts`** — replace `SyncTargetedResponseSchema` with the confirmed ack shape (Clarification 1):
   ```ts
   const SyncTargetedResponseSchema = ApiEnvelopeSchema(
     z.object({
       enqueued: z.boolean(),
       task_client_id: z.string().nullable(),
       connection_client_id: z.string().nullable(),
     }),
   ).extend({ ok: z.literal(true) });
   ```
   `postSyncTargeted`'s return type becomes `{ enqueued, task_client_id, connection_client_id }` — callers in steps 6/7 must stop relying on `created_message_count`/`threads_with_new_messages` from this return value; there is nothing meaningful left to branch on synchronously.

3. **`packages/task-customer-coordination/src/socket-events.ts`** — new file:
   ```ts
   import type { SocketEventHandlers } from "@beyo/realtime";

   import { customerCoordinationEmailKeys } from "./api/customer-coordination-email-keys";

   export const customerCoordinationEmailSocketEvents: SocketEventHandlers = {
     "email.threads.synced": (payload, { queryClient }) => {
       if (payload.entity_type !== "task_customer_coordination") return;

       const hasNewMessages =
         payload.created_message_count > 0 ||
         payload.threads_with_new_messages.length > 0;

       if (!hasNewMessages) return;

       queryClient.invalidateQueries({
         queryKey: customerCoordinationEmailKeys.all,
         refetchType: "active",
       });
     },
   };
   ```
   The `entity_type` guard uses the literal confirmed via a real capture (Clarification 3) — a customer-coordination sync-targeted call emits `entity_type: "task_customer_coordination"` on the socket event, matching `SyncTargetedInput.entity_type` exactly.

4. **`packages/task-customer-coordination/src/index.ts`** — export the new registry map, mirroring the existing `useCustomerCoordinationEmailSync` export line:
   ```ts
   export { customerCoordinationEmailSocketEvents } from "./socket-events";
   ```

5. **`apps/selleres-app/ManagerBeyo-app-sellers/src/app/socket-registry.ts`** — import and spread it in:
   ```ts
   import { customerCoordinationEmailSocketEvents } from "@beyo/task-customer-coordination";
   // ...
   export const socketRegistry: SocketEventHandlers = {
     ...caseSocketEvents,
     ...taskSocketEvents,
     ...taskNoteSocketEvents,
     ...notificationSocketEvents,
     ...customerCoordinationEmailSocketEvents,
   };
   ```

6. **`packages/task-customer-coordination/src/sync/use-customer-coordination-email-sync.ts`** — simplify `runSync()` now that the response body carries no actionable result:
   ```ts
   async function runSync(): Promise<void> {
     if (inFlightRef.current) return;
     inFlightRef.current = true;
     try {
       await postSyncTargeted({
         entity_type: "task_customer_coordination",
         max_threads: 50,
       });
     } finally {
       inFlightRef.current = false;
     }
   }
   ```
   Remove the `result.created_message_count > 0 || result.threads_with_new_messages.length > 0` branch and the `queryClient.invalidateQueries({ queryKey: customerCoordinationEmailKeys.all })` call entirely from this file — that responsibility now belongs solely to the socket handler (step 3). `queryClient` becomes unused in this hook if nothing else references it; remove the `useQueryClient()` call and its import if so (check after editing — `queryClient` is currently only used in this one invalidation call per the file read during this plan's research).

7. **`packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts`** — rework `refreshInbox()` per Clarification 5 Option A:
   ```ts
   async function refreshInbox(): Promise<void> {
     try {
       await postSyncTargeted({
         entity_type: "task_customer_coordination",
         max_threads: 50,
       });
     } catch (error) {
       notify.error(error instanceof Error ? error.message : "Inbox sync failed.");
       throw error;
     }
   }
   ```
   Remove the `Promise.all([inboxQuery.refetch(), queryClient.invalidateQueries({ queryKey: customerCoordinationEmailKeys.unreadCount() })])` block — it raced ahead of the backend worker and is no longer meaningful. The pull-to-refresh spinner now reflects "request accepted," and the list/badge update moments later when the socket event's invalidation refetches them (they are actively observed at that point, so `refetchType: 'active'` fires immediately). If `queryClient` becomes unused elsewhere in this controller after this edit, keep it (it's still used by `useQueryClient()` for other purposes — verify at edit time; do not remove speculatively).

8. **`packages/task-customer-coordination/src/api/post-thread-sync.ts`** — same rework as step 2. The ack shape hasn't been captured live for this specific endpoint yet, but assumed identical to `sync-targeted`'s (same job-enqueue mechanism):
   ```ts
   const ThreadSyncResponseSchema = ApiEnvelopeSchema(
     z.object({
       enqueued: z.boolean(),
       task_client_id: z.string().nullable(),
       connection_client_id: z.string().nullable(),
     }),
   ).extend({ ok: z.literal(true) });
   ```
   If a live capture of this endpoint's response shows a different shape (e.g. it might also echo `thread_client_id` singular for the specific thread), adjust this schema accordingly before merging — a 5-minute check against the real endpoint, not a redesign.

9. **`use-customer-coordination-email-inbox.controller.ts`** — rework both `postThreadSync` call sites now that its result carries nothing actionable:
   - **On-open sync effect** (currently sets `isThreadSyncing` around `postThreadSync(...).then((result) => result.created_message_count > 0 ? messagesQuery.refetch() : undefined)`): drop the `.then()` branch and the manual `messagesQuery.refetch()` call. Fire-and-forget the sync, keep `isThreadSyncing` only around the ack itself (per Clarification 5 Option A):
     ```ts
     useEffect(() => {
       if (!selectedThreadId) return;

       let cancelled = false;
       setIsThreadSyncing(true);

       void postThreadSync(selectedThreadId)
         .catch((error) => {
           if (cancelled) return;
           notify.error(
             error instanceof Error ? error.message : "Thread sync failed.",
           );
         })
         .finally(() => {
           if (!cancelled) setIsThreadSyncing(false);
         });

       return () => {
         cancelled = true;
       };
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [selectedThreadId]);
     ```
     `isMessagesSyncing: messagesQuery.isFetching || isThreadSyncing` (already in the controller) still works unchanged — when the socket event's invalidation later triggers a real refetch of the actively-observed `messagesQuery`, `isFetching` flips true again and the "Syncing…" indicator reappears for the real fetch.
   - **`refreshThread()`** (currently `await postThreadSync(...)`, branches on `result.created_message_count`, then always refetches `inboxQuery`): drop the branch and the manual refetches — they raced ahead of the worker the same way `refreshInbox()` did:
     ```ts
     async function refreshThread(): Promise<void> {
       if (!selectedThreadId) return;

       try {
         await postThreadSync(selectedThreadId);
       } catch (error) {
         notify.error(error instanceof Error ? error.message : "Thread sync failed.");
         throw error;
       }
     }
     ```

## Risks and mitigations

- Risk: the `entity_type === "task_customer_coordination"` filter (step 3) is wrong if some other trigger path for this same feature ever sends a different `entity_type` value.
  Mitigation: confirmed via captures of **both** endpoints — `entity_type: "task_customer_coordination"` appears identically whether the sync was triggered by `sync-targeted` or by a single-thread `postThreadSync` call, so one literal covers every current trigger path in this feature.
- Risk: if two syncs are in flight concurrently for the same user (e.g. the background list-level sync fires while a thread is open and being synced separately), both resulting `email.threads.synced` events invalidate the same broad `customerCoordinationEmailKeys.all` prefix, causing one potentially-redundant extra refetch.
  Mitigation: harmless by design — `refetchType: 'active'` means only currently-observed queries actually refetch, and TanStack Query dedupes concurrent identical requests. An extra invalidation in this scenario costs at most one redundant network call, not a correctness issue. (Note: this is unrelated to thread correlation — `thread_client_ids` does correctly echo the specific thread for a single-thread sync, per the corrected Clarification 2 finding; this risk is just about two unrelated syncs overlapping, not about the payload being ambiguous.)
- Risk: removing the manual refetch in `refreshInbox()` (step 7) and `refreshThread()` (step 9) makes pull-to-refresh / thread-refresh feel like it "did nothing" if the socket event is slow or the connection is degraded.
  Mitigation: `RealtimeProvider`'s `connect` handler already does a blanket `queryClient.invalidateQueries({ refetchType: 'active' })` on every (re)connect (`RealtimeProvider.tsx:100-109`) as a missed-event safety net — a degraded connection self-heals on reconnect. No additional polling fallback is needed given the prior session removed the 10s poll deliberately.
- Risk: the "Syncing…" indicator gap described in Clarification 5 (ack resolves, ack-driven `isThreadSyncing`/pull-to-refresh flag clears, but the socket event hasn't landed yet) could read as "sync silently failed" to a user watching closely.
  Mitigation: accepted trade-off under Option A; if this proves confusing in practice, revisit with Option B (event-correlated indicator) rather than reintroducing the old racy manual refetch.
- Risk: `use-customer-coordination-email-sync.ts`'s `inFlightRef` guard is now guarding a near-instant ack instead of a slow synchronous call — its overlap-prevention value shrinks.
  Mitigation: keep it anyway (step 6) — it's a one-line guard against duplicate concurrent POSTs from rapid-fire trigger changes (e.g. visibility flapping) and costs nothing to retain.

## Validation plan

- `npm run typecheck` (root workspace script covers `managerbeyo-app-sellers`, plus `packages/realtime`): zero TypeScript errors.
- Manual QA (backend async behavior already confirmed live for both endpoints via real captures — this is confirmation testing after implementation, not discovery):
  - Open the seller app; confirm `POST /email-threads/sync-targeted` in devtools Network resolves near-instantly with the `{ enqueued, task_client_id, connection_client_id }` shape from step 2.
  - Watch the Socket.IO frames (devtools → WS) for an `email.threads.synced` frame arriving after the POST; confirm `entity_type` is `"task_customer_coordination"` and the payload otherwise matches the typed shape from step 1.
  - Send a test email into a coordinated thread's mailbox before triggering a sync; confirm the inbox list and Home "Follow-up" badge update automatically once the socket event lands (`created_message_count > 0`), with no extra user action.
  - Pull-to-refresh on the inbox: confirm the spinner stops promptly (Option A) and the list updates a moment later without a second manual pull.
  - Open a thread with new inbound mail waiting: confirm `POST /email-threads/{thread_id}/sync` resolves with the same `{ enqueued, task_client_id, connection_client_id }` shape, the "Syncing…" indicator briefly clears then reappears when the socket event's invalidation triggers the real `messagesQuery` refetch, and the new message(s) render without leaving the thread.
  - Manual "refresh thread" action: confirm no stale/premature refetch, and the thread updates once the socket event lands.
  - Background trigger (app foregrounded after being backgrounded): confirm a sync fires and, if new mail exists, the badge updates without the inbox page being open.
- `grep -rn "created_message_count\|threads_with_new_messages" packages/task-customer-coordination/src/sync packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts` → should return no matches — confirms the old synchronous-result branching is fully gone from all four call sites in scope (background sync, refreshInbox, on-open thread sync, refreshThread).

## Review log

- `2026-07-06` `claude`: initial plan authored from a live description of the backend change (no written handoff doc existed at authoring time); flagged 5 clarifications before Codex should start, since two of them (response shape, entity_type scoping) can cause silent runtime failures if guessed wrong.
- `2026-07-06` `David`: confirmed Clarification 2 — `postThreadSync` (single-thread sync) follows the identical async + `email.threads.synced` pattern as `sync-targeted`. Plan expanded from batch-only scope to cover both endpoints and both controller call sites (`refreshThread()`, on-open thread sync effect).
- `2026-07-06` `David`: provided a real network capture of `POST /email-threads/sync-targeted`'s ack response and the subsequent `email.threads.synced` socket frame. This resolved Clarification 1 for `sync-targeted` (ack shape: `{ enqueued, task_client_id, connection_client_id }`) and Clarification 3 in full (`entity_type: "task_customer_coordination"` confirmed — my earlier example payload's `"task"`/`"case"` values were illustrative placeholders, not real backend output; filter guard added to the socket handler). Clarification 4 partially resolved (`connection_client_id` vs `connection_client_ids` explained; the `threads_with_new_messages`/`thread_ids_with_new_messages` pair remains genuinely ambiguous but low-risk with the chosen default).
- `2026-07-06` `David`: provided a matching capture for `POST /email-threads/{thread_id}/sync` (single-thread endpoint) — identical ack shape, fully closing Clarification 1. His initial paste showed `thread_client_ids: []`, which `claude` misread as a structural finding ("single-thread syncs aren't actually thread-scoped, event is indistinguishable from a batch sync").
- `2026-07-06` `David`: corrected the above — the `[]` was accidentally stripped when pasting; the real value is `thread_client_ids: ["eth_01KWS49NA60JER46TTA3G0GD4E"]`, correctly echoing the specific thread requested. Plan corrected accordingly (Assumptions, Clarification 2's finding, Clarification 5's Option B discussion, and the affected Risks bullet all revised). Net effect: `thread_client_ids` **is** a valid correlation signal for single-thread-scoped sync calls specifically (though not for the list-level batch sync, which never names specific threads) — this reopens Option B as a technically-buildable (not just theoretical) future upgrade for the thread-level indicator, though Option A remains the shipped recommendation for simplicity/consistency. Only Clarification 4's second field pair (naming ambiguity, safe default already chosen) remains genuinely open, and it's non-blocking.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Note: implementation is complete, `npm run typecheck` passed, the summary and archive record were written, and the plan is ready to live only in `docs/architecture/archives/implementation/`.
- Transition owner: `codex`
