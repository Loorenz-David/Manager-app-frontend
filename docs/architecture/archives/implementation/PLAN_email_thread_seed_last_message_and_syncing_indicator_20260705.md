# PLAN_email_thread_seed_last_message_and_syncing_indicator_20260705

## Metadata

- Plan ID: `PLAN_email_thread_seed_last_message_and_syncing_indicator_20260705`
- Status: `summarized`
- Owner agent: `claude`
- Created at (UTC): `2026-07-05T00:00:00Z`
- Last updated at (UTC): `2026-07-05T00:00:00Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/making_seller_app_2.txt` (email inbox capability)
- Predecessor: `docs/architecture/archives/implementation/PLAN_seller_customer_coordination_email_inbox_20260705.md`

## Amendment (2026-07-05) — inbox endpoint now returns `last_messages[]`

Supersedes the singular `last_message` references in Phase 1 below.

- **Backend change:** `GET /api/v1/tasks/customer-coordination/threads` now returns `last_messages` — an **array** of the most recent messages per thread (currently 2, newest-first) — instead of the single `last_message`. The count may grow later, so the frontend must treat it as a flexible-length list.
- **Why it matters:** our raw schema had `last_message` as a **required nullable** field; a missing key is `undefined` (not `null`), so the inbox query would fail to parse the new response. This is a breaking contract change, not just an enhancement.
- **Frontend handling (implemented):**
  - Raw schema: `last_messages: z.array(EmailMessageRawSchema).nullish().default([])` (tolerates any length + missing/null).
  - VM: `EmailInboxThreadVM.lastMessage` → `lastMessages: EmailMessageVM[]`.
  - Mapping: map all entries, **sort oldest-first by `sentOrReceivedAtIso`**, take the last as the *newest* for the card summary fields (`subject`/`preview`/`timeIso`/`lastMessageDirection`/`lastMessageSendError`/`title`).
  - Seed: the thread-view placeholder is now `{ messages: selectedThread.lastMessages, has_more: false }` (the whole known array, already oldest-first) instead of a single-element array — so opening a thread renders the last N known messages immediately, then the full fetch fills in the rest.
- **Behavior:** with 2 seeded messages the thread opens showing both instantly under the "Syncing…" indicator; when the full oldest-first list resolves it replaces the seed. No change needed in `EmailThreadView` (it already renders a `messages` array).

## Goal and intent

- Goal: When the seller opens an email thread from an inbox card, render the **already-known last message immediately** instead of full-page loading skeletons, and show a small **"Syncing…"** indicator on top of it to signal that more messages may still be loading/arriving.
- Business/user intent: The inbox list already carries `last_message`, so a blank skeleton screen on open feels slow and wasteful. Showing the known message instantly (Gmail-like) with a lightweight syncing hint makes the thread feel instant while still communicating that a fetch/sync is in flight.
- Non-goals: pagination of thread messages, reply composer, changing message ordering, scroll-to-bottom behavior, or altering the inbox list UI.

## Scope

- In scope:
  - Expose the full `lastMessage` view-model on the inbox thread VM.
  - Seed the thread messages query with the known last message so the thread view renders it immediately (no skeleton when a last message exists).
  - Replace the full-skeleton-on-open with a top **"Syncing…"** indicator whenever messages are already displayed but a fetch/sync is still running.
  - Optionally (Phase 2) trigger a single-thread IMAP sync on open so "more emails might be coming in" is literally true, and fold it into the same syncing indicator.
- Out of scope: everything under Non-goals; any backend change (all endpoints already exist).
- Assumptions:
  - `mapCoordinationInboxThread` already computes `lastMessage` internally (`packages/task-customer-coordination/src/lib/map-coordination-inbox-thread.ts:9`) — it just isn't returned yet.
  - `@beyo/emails` stays presentational: it receives resolved data + flags as props and never fetches/syncs (hard boundary from the predecessor plan).

## Clarifications required

- [ ] **On-open IMAP sync (Phase 2):** Should opening a thread trigger a single-thread sync (`POST /api/v1/email-threads/{thread_id}/sync`) to actively pull new replies — making the "Syncing…" indicator reflect a real IMAP pull — or should the indicator only reflect the existing messages `GET` in flight? Recommended: **yes, trigger the on-open sync** (matches "more emails might be coming in"). This is the only behavior decision; Phase 1 is safe to ship without it.

## Acceptance criteria

1. Tapping an inbox card opens the thread and the **last known message renders immediately** — no full skeleton screen when the card had a `last_message`.
2. While the real messages `GET` (and, if Phase 2, the on-open sync) is in flight, a small **"Syncing…"** indicator with a spinner appears at the top of the message list, above the already-rendered message.
3. When the fetch/sync completes, the full oldest-first message list replaces the seed and the "Syncing…" indicator disappears.
4. A thread with **no** prior `last_message` (edge case) still shows the existing skeleton, then the empty/loaded state as before.
5. Errors still show the in-pane retry state; unread/mark-read behavior is unchanged.
6. `@beyo/emails` remains free of `apiClient`, endpoint paths, query keys, and mutations. `npm run typecheck` passes for the seller app and all touched packages.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query `placeholderData` / `isFetching` / `isPending` semantics.
- `architecture/24_dto.md`: view-model shaping (adding `lastMessage` to the inbox VM).
- `architecture/32_loading_skeletons.md`: skeleton vs. inline-progress conventions.
- `architecture/35_shared_packages.md`: keep `@beyo/emails` presentational; concrete integration owns data/sync.
- `task_system/frontend_contract_goal_mapping_guide.md`: pattern-vs-relational read discipline.

### Local extensions loaded

- `architecture/04_api_client_local.md`: `apiClient` + envelope pattern (only relevant if Phase 2 wiring touches the sync helper — the helper `postThreadSync` already exists).

### File read intent — pattern vs. relational

All reads for this plan were **relational** (existing VM fields, query hook options, component loading blocks). New query/prop wiring should follow the contracts, not be cloned from siblings.

## Current behavior (relational findings)

- Inbox VM `EmailInboxThreadVM` (`packages/emails/src/types.ts`) carries only *partial* last-message fields (`subject`, `preview`, `timeIso`, `lastMessageDirection`, `lastMessageSendError`) — **not** a full `EmailMessageVM`.
- `mapCoordinationInboxThread` already builds `const lastMessage = raw.last_message ? mapEmailMessage(raw.last_message) : null;` but only uses it to derive the partial fields; it does not return it.
- Controller (`packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts`):
  - `openThread(thread)` sets `selectedThreadId` + `activeIndex = 1` and marks read. **No sync on open.**
  - `messagesQuery = useThreadMessagesQuery(selectedThreadId, { limit: 200, offset: 0 }, { enabled: activeIndex === 1 })`.
  - Returns `isMessagesLoading: messagesQuery.isPending`, `messages: messagesQuery.data?.messages ?? []`, `messagesError: messagesQuery.error ?? null`.
- `useThreadMessagesQuery` (`.../api/use-thread-messages-query.ts`) currently accepts only `{ enabled }`.
- `EmailThreadView` (`packages/emails/src/components/EmailThreadView.tsx`) shows 4 skeletons when `isLoading && messages.length === 0`, an in-pane error+retry when `error`, an empty card when `!isLoading && !error && messages.length === 0`, else the message list.

## Implementation plan

### Phase 1 — Seed the last message + "Syncing…" indicator (core)

1. **`packages/emails/src/types.ts`** — add a full last message to the inbox VM:
   ```ts
   export type EmailInboxThreadVM = {
     // ...existing fields...
     lastMessage: EmailMessageVM | null;
   };
   ```
   (Type-only change; keep the existing partial fields — the card still uses them.)

2. **`packages/task-customer-coordination/src/lib/map-coordination-inbox-thread.ts`** — return the already-computed value:
   ```ts
   return {
     // ...existing fields...
     lastMessage,
   };
   ```

3. **`packages/task-customer-coordination/src/api/use-thread-messages-query.ts`** — accept an optional `placeholderData` and forward it to `useQuery`:
   ```ts
   type UseThreadMessagesQueryOptions = {
     enabled?: boolean;
     placeholderData?: ThreadMessagesResult;
   };
   // ...
   return useQuery({
     queryKey: customerCoordinationEmailKeys.threadMessages(threadId ?? "", params),
     queryFn: () => getThreadMessages(threadId ?? "", params),
     enabled: Boolean(threadId) && (options.enabled ?? true),
     placeholderData: options.placeholderData,
   });
   ```
   (`ThreadMessagesResult` is already exported from `../types`.)

4. **Controller** (`use-customer-coordination-email-inbox.controller.ts`):
   - Build the seed from the selected thread's known last message:
     ```ts
     const messagesPlaceholder: ThreadMessagesResult | undefined = selectedThread?.lastMessage
       ? { messages: [selectedThread.lastMessage], has_more: false }
       : undefined;
     ```
   - Pass it to the query:
     ```ts
     const messagesQuery = useThreadMessagesQuery(
       selectedThreadId,
       { limit: 200, offset: 0 },
       { enabled: activeIndex === 1, placeholderData: messagesPlaceholder },
     );
     ```
   - Expose a syncing flag (fetch in flight while data/placeholder is shown):
     ```ts
     isMessagesLoading: messagesQuery.isPending,          // true only with NO data and NO placeholder
     isMessagesSyncing: messagesQuery.isFetching,         // NEW — drives the "Syncing…" indicator
     ```
   - Add `isMessagesSyncing: boolean` to `CustomerCoordinationEmailInboxController`.
   > With `placeholderData` present, `isPending` is `false` and `data` is defined, so the skeleton is skipped; `isFetching` stays `true` until the real `GET` resolves.

5. **`packages/emails/src/components/EmailThreadView.tsx`** — add the indicator and gate the skeleton:
   - New prop: `isSyncing?: boolean;` (optional; default `false`). Optionally `syncingLabel?: string` defaulting to `"Syncing…"` to keep the generic component flexible.
   - Render a small top indicator as the **first child of the scroll content**, above the message list, only when `isSyncing && messages.length > 0`:
     ```tsx
     {isSyncing && messages.length > 0 ? (
       <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
         <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
         <span>{syncingLabel}</span>
       </div>
     ) : null}
     ```
     (Import `Loader2` from `lucide-react` — already a peer.)
   - Keep the full skeleton **only** for the genuinely-empty case: `isLoading && messages.length === 0` (unchanged). Because Phase 1 seeds a placeholder, this branch now only fires for threads with no prior last message.

6. **Page** (`CustomerCoordinationEmailInboxPage.tsx`) — pass the flag:
   ```tsx
   <EmailThreadView
     // ...existing props...
     isSyncing={controller.isMessagesSyncing}
   />
   ```

### Phase 2 — On-open single-thread sync (recommended; gated by the clarification)

7. **Controller** — on open, actively pull new replies and fold it into the same indicator:
   - Add local state `isThreadSyncing` (`useState(false)`).
   - In `openThread`, after setting `selectedThreadId`/`activeIndex`, fire a background sync:
     ```ts
     setIsThreadSyncing(true);
     void postThreadSync(thread.threadId)
       .then((result) => {
         if (result.created_message_count > 0) {
           return messagesQuery.refetch();
         }
       })
       .catch((error) => {
         notify.error(error instanceof Error ? error.message : "Thread sync failed.");
       })
       .finally(() => setIsThreadSyncing(false));
     ```
     > `messagesQuery.refetch` is referenced inside a callback created during `openThread`; capture it via a ref or move the sync into an effect keyed on `selectedThreadId` if the closure would be stale. Prefer an effect: `useEffect(() => { if (!selectedThreadId || activeIndex !== 1) return; /* run sync */ }, [selectedThreadId])`.
   - Combine into the exposed flag: `isMessagesSyncing: messagesQuery.isFetching || isThreadSyncing`.

> Phase 2 makes "Syncing…" reflect a real IMAP pull and is the behavior that satisfies "more emails might be coming in." If the clarification comes back "Phase 1 only," ship Phase 1 and the indicator simply reflects the messages `GET`.

## UX / rendering notes

- On open the seed shows the **single last message** (newest). When the real oldest-first list resolves, that message moves to the bottom and the earlier messages appear — a brief, expected reflow. Do not attempt to reconcile order during the placeholder phase.
- The "Syncing…" indicator is a lightweight inline row (spinner + label), not a skeleton and not a full-width banner. It sits above the message list inside the scrollable body.
- Reopening a cached thread: React Query serves cached data; a stale-time refetch may briefly show "Syncing…" — acceptable.

## Styling constraints

- No new colors. Spinner uses `text-muted-foreground` + `animate-spin`; label uses existing muted text sizing (`text-xs text-muted-foreground`), consistent with the "Sending…" hint already in `EmailMessageCard`.
- Keep the indicator inside `@beyo/emails` as generic UI; the label defaults to `"Syncing…"` but is overridable via prop.

## Component / file structure

- `packages/emails/src/types.ts` *(modify — add `lastMessage` to `EmailInboxThreadVM`)*
- `packages/emails/src/components/EmailThreadView.tsx` *(modify — `isSyncing`/`syncingLabel` prop + top indicator + skeleton gating)*
- `packages/task-customer-coordination/src/lib/map-coordination-inbox-thread.ts` *(modify — return `lastMessage`)*
- `packages/task-customer-coordination/src/api/use-thread-messages-query.ts` *(modify — `placeholderData` option)*
- `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts` *(modify — placeholder seed, `isMessagesSyncing`, Phase 2 on-open sync)*
- `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailInboxPage.tsx` *(modify — pass `isSyncing`)*

## Query / state strategy

- Seed via TanStack Query `placeholderData` (per-query, from the inbox cache's `lastMessage`) — no new query key, no cache mutation.
- `isPending` (no data/placeholder) → skeleton; `isFetching` (data or placeholder shown, fetch in flight) → "Syncing…". Phase 2 ORs in a manual `isThreadSyncing`.
- Reuse the existing `customerCoordinationEmailKeys.threadMessages(...)` key and `postThreadSync` helper; no new keys or endpoints.

## Risks and mitigations

- Risk: `placeholderData` leaves `isPending` semantics ambiguous. Mitigation: drive skeleton off `isPending` and the indicator off `isFetching`; verify a no-`lastMessage` thread still skeletons.
- Risk: Phase 2 stale closure on `messagesQuery.refetch`/`selectedThreadId`. Mitigation: run the on-open sync in a `useEffect` keyed on `selectedThreadId` rather than inside the `openThread` callback.
- Risk: `@beyo/emails` boundary regression. Mitigation: only a boolean/label prop is added; no data-fetching enters the package.
- Risk: reflow when placeholder (newest) is replaced by oldest-first list. Mitigation: accepted/expected; documented in UX notes.

## Validation plan

- `npm run typecheck`: zero errors (seller app + `@beyo/emails`, `@beyo/task-customer-coordination`).
- Manual QA:
  - Open a thread with a known last message → last message renders instantly, "Syncing…" shows on top, then the full list resolves and the indicator clears.
  - Open a thread with no last message (if reproducible) → skeleton, then loaded/empty state.
  - Trigger a messages fetch error → in-pane retry (unchanged).
  - Phase 2: open a thread and confirm a `POST /email-threads/{id}/sync` fires and, on new inbound messages, the list updates.
- `grep -rE "apiClient|/api/v1/email-threads|useQuery|useMutation" packages/emails/src` → still no matches in inbox/thread files.

## Review log

- `2026-07-05` `claude`: initial plan authored.
- `2026-07-05` `David`: confirmed Phase 2 (on-open IMAP sync).
- `2026-07-05` `claude`: implemented Phases 1 + 2; amended for the `last_messages[]` backend contract change.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Summary record: `docs/architecture/implemented_summaries/SUMMARY_email_thread_seed_last_message_and_syncing_indicator_20260705.md`
- Archive record: `docs/architecture/archives/ARCHIVE_email_thread_seed_last_message_and_syncing_indicator_20260705_1124.md`
- Transition owner: `claude`
