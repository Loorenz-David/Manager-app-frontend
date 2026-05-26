# SUMMARY_PLAN_18_message_list_foundation_with_virtualization_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_18_message_list_foundation_with_virtualization_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T08:44:05Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_18_message_list_foundation_with_virtualization_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added an infinite-query message layer over the paginated case-detail endpoint and seeded it from the already-loaded case detail cache so the conversation does not duplicate the first fetch.
- Built a render-item controller plus virtualized `react-virtuoso` message list with chronological rows, centered date separators, own/other alignment, avatars, deleted-message placeholders, and prepend-safe older-page loading.
- Replaced the conversation placeholder with the real thread and normalized the scroll signal as distance-from-bottom so the PLAN 17 banner still expands on open and collapses once the user scrolls up into history.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/case-keys.ts`: added a dedicated key family for case conversation detail pages.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-case-conversation-messages.ts`: added the infinite-query hook over paginated `getCase`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation-messages.controller.ts`: added chronological flattening, date-separator insertion, own-message derivation, and list control APIs.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageList.tsx`: added the Virtuoso-based message list, prepend anchor preservation, initial bottom scroll, and bottom-distance scroll forwarding.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageRow.tsx`: added row branching, avatar rendering, and timestamp layout.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageBubble.tsx`: added own/other bubble styling and deleted-message placeholder rendering.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageDateSeparator.tsx`: added the centered separator chip component.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/providers/CaseConversationProvider.tsx`: added the conversation-messages controller context alongside the existing conversation shell context.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`: replaced the placeholder body with the virtualized message list.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`: exported the new message query and controller surface.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`: added paginated thread mocks and runtime coverage for separators, own/other layout, deleted placeholder, older-page loading, anchor preservation, and banner behavior with the virtualized list.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 18 linkage and implementation progress note.

## Contract adherence

- `architecture/05_server_state.md`: used `useInfiniteQuery` with backend-owned pagination semantics and cache-seeded initial data.
- `architecture/08_hooks.md`: kept message shaping and scroll/list control logic inside a dedicated controller instead of scattering it across row components.
- `architecture/18_performance.md`: used `react-virtuoso` for render restraint and documented the prepend-stability `firstItemIndex` strategy inline in code.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`: consumed paginated `GET /api/v1/cases/{case_client_id}` pages in ascending per-page `message_seq` order and respected `before_message_seq` / `next_before_message_seq`.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=desktop`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run

## Known gaps or deferred items

- The bubble renderer still handles only `plain_text` and deleted placeholders; image, mention, and richer DTO rendering remain deferred to later cases plans.
- Read/unread visibility, mark-read mutation behavior, composer actions, and message editing remain out of scope for this plan.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_18_message_list_foundation_with_virtualization_20260526.md`
