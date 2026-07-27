# SUMMARY_PLAN_20_basic_message_composer_and_send_flow_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_20_basic_message_composer_and_send_flow_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T09:33:51Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_20_basic_message_composer_and_send_flow_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a pessimistic send-message action hook that always generates a `CaseConversationMessage` client ID, posts the plain-text block payload, and invalidates the active conversation/detail/list queries after success.
- Extended the case conversation controller with draft state, send orchestration, recoverable error handling, and the send-success bridge into both bottom-scroll and PLAN 19's `requestMarkRead(createdMessage.message_seq)` path.
- Added a bottom-docked `react-textarea-autosize` composer with safe-area padding, disabled empty sends, visible error/retry state, and the required test IDs.
- Updated the conversation slide/list spacing so the fixed composer does not cover the last message, and added focused mobile Playwright coverage for send enablement, payload shape, success clearing, retry behavior, and layout overlap prevention.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/case-keys.ts`: added a per-case conversation-pages prefix key for targeted invalidation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-send-case-message.ts`: added the send-message action hook and invalidation behavior.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: added composer draft state, send orchestration, and send-to-read-position wiring.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/providers/CaseConversationProvider.tsx`: bridged the conversation controller to the message-list `scrollToBottom` API.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/composer/CaseBasicComposer.tsx`: added the fixed plain-text composer UI.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`: mounted the composer and defined the shared bottom inset variable.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageList.tsx`: switched message-list footer/empty/error spacing to use the shared composer inset.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`: exported the new send hook.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/case-composer.spec.ts`: added mobile runtime coverage for the basic composer and send flow.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 20 linkage and progress note.

## Contract adherence

- `architecture/05_server_state.md`: kept the backend as the authoritative message-order source by invalidating/refetching instead of injecting synthetic optimistic rows.
- `architecture/08_hooks.md`: isolated the send mutation in an action hook and kept draft/send behavior inside the feature controller.
- `architecture/14_styling.md`: used app tokens plus safe-area padding for the bottom-docked composer.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`: posted both `content` and `plain_text` with the path/body `conversation_client_id`, matching the backend router contract.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/case-composer.spec.ts --project=mobile`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run

## Known gaps or deferred items

- This plan keeps the send flow pessimistic; no optimistic message row insertion or reconciliation is attempted yet.
- Rich formatting, mentions authoring, image attachments, edit/delete flows, and keyboard-specific mobile polish remain deferred to later composer plans.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_20_basic_message_composer_and_send_flow_20260526.md`
