# SUMMARY_PLAN_13_cases_types_and_api_foundation_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_13_cases_types_and_api_foundation_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T07:19:39Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_13_cases_types_and_api_foundation_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Replaced the cases stub type layer with backend-aligned Zod schemas, typed DTOs, message block models, pagination models, and a `CaseConversationMessageId` branded type.
- Extended cases query keys for unread counts, participants, and conversation messages, and added the planned API modules for listing cases, fetching a case, creating cases, updating case state, sending/editing/deleting messages, listing messages, marking read, fetching unread counts, linking entities, and adding participants.
- Updated the public `features/cases` exports to expose the new data-layer types, constants, and list-card view-model helper for follow-on plans.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/types/common.ts`: added `CaseConversationMessageId`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/types.ts`: replaced the cases domain schemas and input/output types with backend-aligned models.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/case-keys.ts`: added unread, participants, and conversation message keys.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/list-cases.ts`: added list-cases API function.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/get-case.ts`: added case-detail API function.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/create-case.ts`: added case creation API function.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/update-case-state.ts`: added case-state mutation API function with path/body ID mirroring.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/send-message.ts`: added send-message API function with path/body conversation ID mirroring.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/edit-message.ts`: added edit-message API function with path/body message ID mirroring.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/delete-message.ts`: added soft-delete message API function.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/list-messages.ts`: added conversation-messages API function.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/mark-read.ts`: added mark-read API function.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/get-unread-counts.ts`: added unread-count lookup API function.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/link-entity.ts`: added case-link creation API function with path/body ID mirroring.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/add-participants.ts`: added participant-add API function with path/body ID mirroring.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`: re-exported the new public cases types and helpers.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the linked implementation-plan record and progress note.

## Contract adherence

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`: matched backend field names, enum values, pagination fields, and the required duplicate path/body IDs on affected endpoints.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/api-client.ts`: kept all cases API calls on the shared `apiClient` request helpers.
- `apps/managers-app/ManagerBeyo-app-managers/src/types/api.ts`: parsed every successful cases response through `ApiEnvelopeSchema`.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- `update-case`, `list-links`, `list-participants`, and `get-conversation` remain unimplemented because they were outside this plan’s explicit scope.
- No query hooks, optimistic mutations, or UI integration were added in this pass by design.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_13_cases_types_and_api_foundation_20260526_0719.md`
