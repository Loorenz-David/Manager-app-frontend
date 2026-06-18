# SUMMARY_more_tabs_nav_20260618

## Metadata

- Summary ID: `SUMMARY_more_tabs_nav_20260618`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-18T12:28:16Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_more_tabs_nav_20260618.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a shared `VerticalScrollArea` primitive to `@beyo/ui` for vertically scrollable overflow content with a thin custom scrollbar track.
- Split managers and workers app tab routing into `PRIMARY_TABS`, `MORE_TABS`, and `DEFAULT_MORE_TAB` so the bottom nav can keep five visual slots while still navigating all existing tab routes.
- Added app-local `useMoreTabLastSelected` hooks to persist the last selected overflow tab in `localStorage` with a guarded fallback.
- Added `MoreTabsPopup` in both apps and rewired each `BottomTabBar` to render `Tasks | Cases | Home | [Dynamic] | [More]`, keep the active indicator on slot 3 for overflow routes, and dismiss the popup on outside click or `Escape`.
- Refined the More affordance after the first pass: replaced the More icon with `Grip`, moved the popup/shadow behind the nav row so the bar visually stays on top, and strengthened the CSS slide+fade transition while keeping it lightweight.
- Finalized the overflow-list behavior so the popup does not render the overflow tab that is already promoted into the dynamic bottom-nav slot, avoiding duplicate “selected” states between the dynamic slot and the More list.

## Files changed

- `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx`: added the new vertical scroll primitive.
- `packages/ui/src/components/primitives/vertical-scroll-area/index.ts`: exported the new primitive locally.
- `packages/ui/src/index.ts`: exported `VerticalScrollArea` from `@beyo/ui`.
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/routes.ts`: added primary/overflow tab constants and `MoreTabPath`.
- `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts`: added primary/overflow tab constants and `MoreTabPath`.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/use-more-tab-last-selected.ts`: added overflow-tab persistence.
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/use-more-tab-last-selected.ts`: added overflow-tab persistence.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx`: added the managers overflow popup, then refined it to slide/fade, render beneath the nav row, and hide the currently promoted overflow tab from the list.
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/MoreTabsPopup.tsx`: added the workers overflow popup, then refined it to slide/fade, render beneath the nav row, and hide the currently promoted overflow tab from the list.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/BottomTabBar.tsx`: rewired the managers nav to use dynamic and more slots, swapped the More icon to `Grip`, and adjusted stacking so the bar stays visually above the popup.
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/BottomTabBar.tsx`: rewired the workers nav to use dynamic and more slots, swapped the More icon to `Grip`, and adjusted stacking so the bar stays visually above the popup.

## Contract adherence

- `architecture/16_feature_workflow.md`: the change stayed in UI primitives, routes, and shell components without crossing into controller/provider logic.
- `task_system/frontend_contract_goal_mapping_guide.md`: contracts were used for structure, and existing implementation files were read only to understand current route, badge, and shell behavior.
- `architecture/07_components.md`: the new popup stays a presentational shell component and consumes existing badge state.
- `architecture/08_hooks.md`: `useMoreTabLastSelected` is a small focused client-state hook with a narrow API.
- `architecture/26_persistence.md`: `localStorage` is used only for lightweight UI preference persistence.
- `architecture/31_animations.md`: popup visibility uses CSS transitions on opacity and transform rather than adding heavier motion dependencies, including the later slide+fade refinement.

## Validation evidence

- `npm run typecheck`: pass after the initial implementation and again after the visual/behavior refinements
- `npx playwright test --project=mobile`: not run
- Manual runtime validation: not run

## Known gaps or deferred items

- Manual app verification for popup positioning, overflow scrolling, duplicate-tab removal, and badge visuals was not run in-browser in this pass.
- Playwright coverage for the new overflow-nav behavior remains deferred per the plan’s non-goals.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_more_tabs_nav_20260618_1228.md`
