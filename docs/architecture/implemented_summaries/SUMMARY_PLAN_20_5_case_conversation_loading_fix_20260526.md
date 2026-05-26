# SUMMARY_PLAN_20_5_case_conversation_loading_fix_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_20_5_case_conversation_loading_fix_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T12:20:13Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_20_5_case_conversation_loading_fix_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a real `/cases/:caseId` route so the conversation identity survives refresh and direct entry instead of depending only on transient surface props.
- Kept the case conversation visually consistent with the existing slide-surface system by restoring `surface.open(...)` for in-app opens and hydrating that same slide surface from the route on reload or deep link entry.
- Made task context optional in the case conversation controller so task lookup failures no longer collapse the entire conversation into the generic load error state.
- Reused cached case-list snapshots for conversation header/task fallback context when task detail is unavailable and separated the loading shell from hard error states.
- Added focused Playwright coverage for route-backed refresh, direct URL entry, and optional task-context failure on both desktop and mobile.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/app/router.tsx`: added the route-backed case conversation page entry.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-cases-view.controller.ts`: restored slide-surface opens for case cards.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: made task context optional, added cached case snapshot fallback logic, and kept close behavior aligned with route-backed entry.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/providers/CaseConversationProvider.tsx`: reset scroll chrome when the case id changes.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`: added explicit loading-shell behavior and preserved the shared conversation layout contract.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationRouteEntry.tsx`: kept the actual conversation UI mounted through the feature provider stack.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationRouteHydrator.tsx`: added route-to-surface hydration for refresh/direct URL restoration.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationPage.tsx`: resolved `caseId` from the router and delegated to the route hydrator.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationSlidePage.tsx`: kept the slide page able to read the case id from either route params or surface props.
- `apps/managers-app/ManagerBeyo-app-managers/src/providers/SurfaceProvider.tsx`: added `hydrate(...)` support and allowed route-backed non-page surfaces to render through the overlay portal.
- `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-surface.ts`: exposed the new `hydrate` surface-store API.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`: added and extended route-backed conversation coverage.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 20.5 linkage and progress note.

## Contract adherence

- `architecture/05_server_state.md`: kept the case detail query authoritative for conversation payloads while reusing cached list data only as fallback presentation context.
- `architecture/11_routing.md`: introduced a stable route identity for refresh-safe and deep-link-safe conversation loading.
- `architecture/28_surfaces.md`: preserved the existing slide-surface presentation model instead of replacing it with routed shell content.
- `architecture/30_dynamic_loading.md`: used lazy route entry points for the new page/hydrator path without changing the feature’s provider/component ownership.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=desktop --grep "refreshing a case conversation|direct case conversation URL|optional task context fails"`: pass
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile --grep "refreshing a case conversation|direct case conversation URL|optional task context fails"`: pass
- `npm run test`: not run

## Known gaps or deferred items

- Message edit/delete interactions remain out of scope and continue in later conversation plans.
- Rich-content rendering, attachments, and composer polishing remain deferred to the follow-up case conversation plans.

## Handoff notes (if needed)

- None.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_20_5_case_conversation_loading_fix_20260526.md`
