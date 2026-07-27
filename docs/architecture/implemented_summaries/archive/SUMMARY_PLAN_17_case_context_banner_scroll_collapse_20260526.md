# SUMMARY_PLAN_17_case_context_banner_scroll_collapse_20260526

## Metadata

- Summary ID: `SUMMARY_PLAN_17_case_context_banner_scroll_collapse_20260526`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-26T08:24:21Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_17_case_context_banner_scroll_collapse_20260526.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a fixed secondary case-context banner beneath the conversation header so the case type and creation time are visible immediately on conversation open.
- Extended the conversation controller with scroll-derived banner-collapse state and a reusable `setBodyScrollTop` / `resetScrollChrome` API that stays agnostic about the future scroll source.
- Refactored the conversation slide body into a feature-owned scroll container and extended the mobile cases Playwright spec to verify banner visibility, collapse on upward scroll, restore on downward scroll, and header persistence.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: added scroll-derived banner collapse state and reusable scroll chrome APIs.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationContextBanner.tsx`: added the animated context banner with case type and formatted creation date/time.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`: moved the conversation body to a feature-owned scroll container and wired scroll events into the controller.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationHeader.tsx`: raised the header stack level so it stays visually fixed above the collapsing banner.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`: added banner visibility and scroll-collapse runtime coverage.
- `docs/architecture/under_construction/intention/intention_of_cases.md`: added the archived PLAN 17 linkage and implementation progress note.

## Contract adherence

- `architecture/08_hooks.md`: kept scroll-state ownership inside the conversation controller rather than leaking it into the banner or page shell.
- `architecture/14_styling.md`: used existing token-based surface and text classes for the banner and scroll shell.
- `architecture/31_animations.md`: used Framer Motion for the structural banner collapse/restore transition.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- The message timeline remains a placeholder shell; real message rows and virtualization are still deferred to later cases plans.
- The banner-collapse API is ready for a future `react-virtuoso` integration, but this plan does not introduce virtualization yet.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_cases_router_contract_20260525.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archive target record: `docs/architecture/archives/implementation/PLAN_17_case_context_banner_scroll_collapse_20260526.md`
