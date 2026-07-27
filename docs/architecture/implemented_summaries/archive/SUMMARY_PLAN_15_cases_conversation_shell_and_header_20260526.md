# SUMMARY_PLAN_15_cases_conversation_shell_and_header_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_15_cases_conversation_shell_and_header_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T07:49:37Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_15_cases_conversation_shell_and_header_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Replaced the PLAN 14 conversation stub with a real cases conversation slide shell backed by a provider/controller, fixed custom header, and task-linked header context resolution.
- Added case detail and case-link query hooks plus a state-transition action hook that invalidates the relevant case caches and closes the slide after a successful transition.
- Extended the mobile Playwright cases flow to cover the custom header, task-linked subtitle, back-button close, and the exact backend state-transition payloads for `open` and `resolving` cases.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/case-keys.ts`: added explicit links and unread-count root keys for the new queries and invalidation path.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-get-case.ts`: added the case-detail TanStack Query hook with future-ready message pagination params.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/list-case-links.ts`: added the typed case-links API reader.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-case-links.ts`: added the case-links TanStack Query hook.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/actions/use-update-case-state.ts`: wrapped the raw state API in an action hook with invalidation and the standard action surface.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: composed case detail, links, linked task detail, header view-model fields, and close/advance actions.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/providers/CaseConversationProvider.tsx`: added the conversation context provider.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationHeader.tsx`: added the fixed custom conversation header.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`: added the hidden-stock-header slide shell, loading/error states, and placeholder body.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationSlidePage.tsx`: replaced the stub page with the provider-backed slide view and missing-ID fallback.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`: exported the new provider and API/action hooks.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`: upgraded the cases mobile runtime coverage to the real conversation shell flow.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 15 linkage and implementation progress note.

## Contract adherence

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`: preserved the duplicated path/body case ID for state transitions and used the documented case-link and case-state shapes.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`: followed the existing slide-page pattern for hiding the stock surface header and handling missing IDs.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/lib/task-detail.ts`: reused the established task-type and return-source labels instead of inventing a cases-specific formatting layer.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- The info button is wired only as a controller placeholder; the actual info sheet surface is still deferred to PLAN 16.
- The body intentionally remains a placeholder shell; real message rows, read state, and the composer stay deferred to later cases plans.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_15_cases_conversation_shell_and_header_20260526.md`
