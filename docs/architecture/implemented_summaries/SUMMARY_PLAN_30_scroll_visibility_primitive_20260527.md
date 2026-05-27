# SUMMARY_PLAN_30_scroll_visibility_primitive_20260527

## Metadata

- Summary ID: `SUMMARY_PLAN_30_scroll_visibility_primitive_20260527`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-27T08:51:10Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_30_scroll_visibility_primitive_20260527.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a reusable `scroll-visibility` primitive with a standalone hook, provider/context path, and shared threshold-based hide/show semantics backed by Framer Motion `MotionValue`.
- Migrated `StagedForm` to the standalone hook so timeline collapse no longer owns custom threshold state, while keeping the separate top-gradient state and preserving scroll compensation during timeline height animation.
- Migrated case conversation banner collapse from the conversation controller into a provider wrapped around the Virtuoso scroller, removing the old scroll-direction state machine from controller code.
- Kept both existing layout-compensation observers and added primitive-level `suspend()` support so programmatic `scrollTop` corrections do not immediately undo hide/show transitions.
- Updated Playwright coverage for the case conversation banner to assert the new "hide after any scroll, restore at top" behavior on both mobile and desktop.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/scroll-visibility/`: added `use-scroll-visibility.ts`, `ScrollVisibilityContext.tsx`, `ScrollVisibilityProvider.tsx`, `scroll-visibility.types.ts`, and `index.ts`.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/StagedForm.tsx`: replaced hand-rolled compact state with `useScrollVisibility` and gated non-visibility scroll state to threshold crossings only.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationSlideView.tsx`: added provider wiring and Virtuoso scroller element ownership.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseConversationContextBanner.tsx`: switched banner animation source from controller state to `useScrollVisibilityContext()`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/components/CaseMessageList.tsx`: removed the collapse prop, consumed scroll visibility context directly, delayed provider attachment until initial list positioning completed, and preserved top-inset compensation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation.controller.ts`: removed banner-collapse state and related scroll bookkeeping.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/controllers/use-case-conversation-messages.controller.ts`: simplified scroll metrics to the distance-from-bottom concern that still drives conversation UX.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/providers/CaseConversationProvider.tsx`: removed the controller scroll-chrome bridge that is no longer needed.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/cases/cases-page.spec.ts`: updated the banner regression test to the new threshold behavior.

## Contract adherence

- `architecture/07_components.md`: the new primitive stays in component-primitives space and keeps consuming components free of duplicated scroll logic.
- `architecture/08_hooks.md`: the standalone hook is a reusable utility hook; the case conversation migration keeps orchestration in a provider rather than a controller.
- `architecture/18_performance.md`: hide/show state is gated through refs and threshold crossings, with `MotionValue` animation off the React render path.
- `architecture/23_providers.md`: the provider exports a dedicated consumer hook and throws on misuse outside the provider tree.
- `architecture/31_animations.md`: visibility transitions remain transform-driven and reuse the shared animation transition tokens.

## Validation evidence

- `npm run typecheck` (in `apps/managers-app/ManagerBeyo-app-managers`): pass
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=mobile --grep "context banner collapses after the list scrolls and restores at the top"`: pass
- `npx playwright test tests/playwright/features/cases/cases-page.spec.ts --project=desktop --grep "context banner collapses after the list scrolls and restores at the top"`: pass

## Known gaps or deferred items

- The existing staged-form Playwright regression file still cannot be executed end to end in this environment because its setup expects `open-testing-forms-button`, and that launcher is not currently rendered anywhere in the app shell. The failure occurs before the staged form itself is reached.
- No new dedicated Playwright entry path for the staged-form surface was added in this pass, so staged-form runtime validation remains `typecheck` plus preservation of the existing spec file.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_30_scroll_visibility_primitive_20260527.md`
