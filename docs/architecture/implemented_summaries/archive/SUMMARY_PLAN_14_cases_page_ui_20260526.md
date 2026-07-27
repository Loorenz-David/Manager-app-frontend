# SUMMARY_PLAN_14_cases_page_ui_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_14_cases_page_ui_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T07:29:40Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_14_cases_page_ui_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added the cases list query hooks and completed the cases page controller with local search, New/Active/Resolving grouping, unread-count loading, and slide-surface open behavior.
- Built the cases page UI with the planned three-row header, grouped sections, card component, unread badges, and created-time formatting without adding new dependencies.
- Registered the cases conversation slide surface, added a stub conversation page titled `Conversation`, and covered the page flow with a mobile Playwright spec that mocks auth and case endpoints.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-list-cases.ts`: added the cases list TanStack Query hook.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/use-unread-counts.ts`: added the unread-count TanStack Query hook with keyed IDs and refresh window.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/api/case-keys.ts`: keyed unread-count queries by case ID set.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-cases-view.controller.ts`: implemented data loading, grouping, search, and case-surface opening.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseCard.tsx`: added the interactive case card UI.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CasesSectionGroup.tsx`: added grouped list sections with counts and empty states.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CasesView.tsx`: replaced the stub with the full cases page UI.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts`: registered the case conversation slide surface.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationSlidePage.tsx`: added the stub conversation slide page.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`: merged the cases surfaces into the app registry.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/index.ts`: exported the cases surface registrations and props.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`: added mobile runtime coverage for grouping, unread badges, search, and slide opening.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the linked implementation-plan record and progress note for PLAN 14.

## Contract adherence

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`: kept the list and unread-count UI aligned to the backend field names and state values established in PLAN 13.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`: followed the existing `lazyWithPreload` slide-registration pattern for the new cases surface.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/search-bar/SearchBar.tsx`: reused the existing search-bar primitive without introducing a cases-specific variant.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run
- `npm run test:e2e:mobile -- --grep "cases page"`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- The conversation slide remains a stub by design; message loading, rendering, and composer work are deferred to PLAN 15.
- The search bar currently filters client-side only; backend `q` wiring remains a future step.
- The History button is present visually but still inert because no history surface or route was in scope for this plan.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_14_cases_page_ui_20260526_0729.md`
