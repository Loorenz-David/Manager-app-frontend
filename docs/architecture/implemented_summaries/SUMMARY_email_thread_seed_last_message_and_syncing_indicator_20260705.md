# SUMMARY_email_thread_seed_last_message_and_syncing_indicator_20260705

## Metadata

- Summary ID: `SUMMARY_email_thread_seed_last_message_and_syncing_indicator_20260705`
- Status: `summarized`
- Owner agent: `claude`
- Created at (UTC): `2026-07-05T11:24:18Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_email_thread_seed_last_message_and_syncing_indicator_20260705.md`
- Related debug plan (optional): `—`

## What was implemented

- Opening an email thread now renders the already-known recent messages **immediately** (no full skeleton) by seeding the thread-messages query with `placeholderData` derived from the inbox list, then fetching the full conversation in the background.
- A lightweight **"Syncing…"** indicator (spinner + label) renders on top of the seeded messages while the messages fetch and the on-open IMAP sync are in flight; the full-page skeleton now only shows for a thread with no known messages.
- Phase 2: opening a thread triggers a single-thread IMAP sync (`POST /email-threads/{id}/sync`) via a `selectedThreadId`-keyed effect (avoiding stale closures), refetching messages when new ones arrive and surfacing failures via toast. The syncing flag is `messagesQuery.isFetching || isThreadSyncing`.
- Amendment: adapted to the backend contract change where `GET /tasks/customer-coordination/threads` now returns `last_messages` (a flexible-length array, currently 2, newest-first) instead of the single `last_message`. The frontend maps the array oldest-first, derives card summary fields from the newest entry, and seeds the thread view with the whole array.

## Files changed

- `packages/emails/src/types.ts`: replaced `EmailInboxThreadVM.lastMessage: EmailMessageVM | null` with `lastMessages: EmailMessageVM[]` (kept the derived summary scalars).
- `packages/emails/src/components/EmailThreadView.tsx`: added `isSyncing` / `syncingLabel` props, a top `Loader2` "Syncing…" row shown when `isSyncing && messages.length > 0`, and gated the full skeleton to the truly-empty case.
- `packages/task-customer-coordination/src/types.ts`: `CoordinationInboxThreadRawSchema.last_message` → `last_messages: z.array(EmailMessageRawSchema).nullish().default([])`.
- `packages/task-customer-coordination/src/lib/map-coordination-inbox-thread.ts`: map `last_messages`, sort oldest-first by `sentOrReceivedAtIso`, derive card fields (`subject`/`preview`/`timeIso`/`title`/direction/sendError) from the newest, expose `lastMessages`.
- `packages/task-customer-coordination/src/api/use-thread-messages-query.ts`: added optional `placeholderData` passthrough.
- `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts`: moved `selectedThread` above the messages query, memoized a `messagesPlaceholder` seed from `lastMessages`, added the on-open single-thread sync effect + `isThreadSyncing`, and exposed `isMessagesSyncing`.
- `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailInboxPage.tsx`: passes `isSyncing={controller.isMessagesSyncing}` to `EmailThreadView`.

## Contract adherence

- `architecture/35_shared_packages.md`: `@beyo/emails` stayed presentational — only a boolean/label prop and a VM field were added; no `apiClient`, endpoint paths, query keys, mutations, or cache logic entered the package (grep-verified).
- `architecture/05_server_state.md`: used TanStack Query `placeholderData` + `isFetching`/`isPending` for the seed-vs-syncing distinction; reused the existing `customerCoordinationEmailKeys.threadMessages` key and `postThreadSync` helper — no new keys or endpoints.
- `architecture/24_dto.md`: raw→view-model mapping (including the `last_messages` array shape and oldest-first ordering) lives entirely in the concrete `@beyo/task-customer-coordination` layer.

## Validation evidence

- `npm run typecheck` (seller app, `tsc -b`): pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- Thread-message pagination is still first-page-only (`limit: 200`); a >200-message thread truncates the oldest — unchanged by this work.
- When the seed (newest-first known messages) is replaced by the full oldest-first fetch, the last message reflows from top to bottom — expected/accepted, not reconciled.
- No browser/Playwright runtime validation was run in this pass.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_customer_coordination_email_and_counts_20260704.md` (plus the in-conversation `last_messages[]` contract change amended into the plan).

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_email_thread_seed_last_message_and_syncing_indicator_20260705_1124.md`
