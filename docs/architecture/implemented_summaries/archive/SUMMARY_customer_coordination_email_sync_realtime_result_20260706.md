# SUMMARY_customer_coordination_email_sync_realtime_result_20260706

## Metadata

- Summary ID: `SUMMARY_customer_coordination_email_sync_realtime_result_20260706`
- Status: `summarized`
- Owner agent: `codex`
- Created at (UTC): `2026-07-06T07:00:49Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_customer_coordination_email_sync_realtime_result_20260706.md`
- Related debug plan (optional): `—`

## What was implemented

- Added typed realtime support for `email.threads.synced` in `@beyo/realtime`, then registered a customer-coordination-owned socket handler that invalidates `customerCoordinationEmailKeys.all` only when the backend reports new messages for `entity_type === "task_customer_coordination"`.
- Updated both sync POST helpers to the new enqueue-ack contract `{ enqueued, task_client_id, connection_client_id }`, removing the old assumption that the HTTP response body contains final sync results.
- Reworked customer-coordination email sync callers so background sync, inbox pull-to-refresh, on-open thread sync, and manual thread refresh now only fire the enqueue request and let the socket event drive actual refetches.
- Wired the seller app socket registry to include the new feature handler without changing any other existing registry ownership.

## Files changed

- `packages/realtime/src/lib/socket-types.ts`: added the full `email.threads.synced` server event payload type.
- `packages/task-customer-coordination/src/socket-events.ts`: added the feature-owned realtime invalidation handler.
- `packages/task-customer-coordination/src/index.ts`: exported the new socket handler map.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/app/socket-registry.ts`: merged the customer-coordination socket handlers into the seller app registry.
- `packages/task-customer-coordination/src/api/post-sync-targeted.ts`: changed the response schema to the async enqueue ack shape.
- `packages/task-customer-coordination/src/api/post-thread-sync.ts`: changed the response schema to the async enqueue ack shape.
- `packages/task-customer-coordination/src/sync/use-customer-coordination-email-sync.ts`: removed synchronous result-based invalidation and kept only the fire-and-forget sync trigger.
- `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts`: removed manual post-ack refetches for inbox and thread sync flows and kept thread syncing state scoped to the ack lifecycle.

## Contract adherence

- `architecture/21_realtime.md`: kept event typing centralized, declared the new feature handler inside the owning package, and assembled it only at the app-level registry join point.
- `architecture/05_server_state.md`: used `invalidateQueries` with `refetchType: "active"` against the feature key root instead of speculative manual fetches after enqueue responses.
- `architecture/16_feature_workflow.md`: changes stayed within the established types/API/controller/app wiring order for the affected realtime and sync layers.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- `threads_with_new_messages` vs `thread_ids_with_new_messages` remains backend-naming ambiguous in the socket payload; the handler currently reads `threads_with_new_messages` plus `created_message_count > 0`, which is sufficient for the confirmed payloads.
- The list-level and thread-level "syncing" indicators now follow the enqueue ack rather than the worker completion event; this matches the approved Option A eventual-consistency behavior from the plan.
- No runtime browser validation was run in this pass.

## Handoff notes (if needed)

- From backend dependency: `n/a` — backend contract details for both async sync endpoints were confirmed via live captures and verbal clarification referenced in the source plan.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_customer_coordination_email_sync_realtime_result_20260706_0700.md`
