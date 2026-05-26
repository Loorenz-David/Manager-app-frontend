# SUMMARY_PLAN_19_message_read_unread_integration_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_19_message_read_unread_integration_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T09:08:22Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_19_message_read_unread_integration_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added the missing case-participants query layer and a `useMarkCaseRead` action so the frontend now uses the backend participant row as the authoritative read-position source.
- Extended the conversation controller to resolve the current participant, expose `lastReadMessageSeq`, and suppress duplicate or regressive mark-read submissions with monotonic requested/acknowledged sequence tracking.
- Connected the message-list controller to visibility-driven read updates using the existing distance-from-bottom scroll signal, so opening a thread at the latest message or scrolling back down advances the read position and refreshes unread badges.
- Expanded the cases Playwright spec with mutable participants/unread-count mocks and assertions for the mark-read request payload, unread-badge clearing, and duplicate-call suppression.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/list-case-participants.ts`: added the participants list API wrapper.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-case-participants.ts`: added the participants query hook.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-mark-case-read.ts`: added the mark-read action hook with participant and unread-count invalidation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: resolved the current participant and exposed monotonic `requestMarkRead`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation-messages.controller.ts`: added latest-message visibility tracking from the list scroll signal.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/providers/CaseConversationProvider.tsx`: passed the shared read-state API into the message controller.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageList.tsx`: continued forwarding bottom-distance scroll data used by read tracking.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`: exported the new participants and mark-read hooks.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`: added participants, unread-count, and mark-read runtime coverage.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 19 linkage and progress note.
- `docs/architecture/under_construction/implementation/PLAN_20_basic_message_composer_and_send_flow_20260526.md`: updated the send-flow dependency note to call the now-implemented `requestMarkRead` controller API.

## Contract adherence

- `architecture/05_server_state.md`: kept unread badge freshness on TanStack Query invalidation instead of feature-local mirrored state.
- `architecture/08_hooks.md`: isolated the backend mutation and the read orchestration inside feature actions/controllers rather than scattering network calls into list components.
- `architecture/23_providers.md`: kept the shared conversation read API at the provider/controller boundary and passed it into the message-list controller as a dependency.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`: matched `GET /api/v1/cases/{case_client_id}/participants` and `POST /api/v1/cases/messages/mark-read` exactly, including monotonic `last_read_message_seq` behavior.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run

## Known gaps or deferred items

- PLAN 20 still needs to call `requestMarkRead(createdMessage.message_seq)` immediately after a successful send so outbound messages also advance the participant read pointer.
- This plan does not add per-bubble seen indicators or any push/realtime unread synchronization outside the current query invalidation flow.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_19_message_read_unread_integration_20260526.md`
