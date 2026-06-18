# SUMMARY_more_tabs_nav_corrections_20260618

## Metadata

- Summary ID: `SUMMARY_more_tabs_nav_corrections_20260618`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-18T13:07:58Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_more_tabs_nav_corrections_20260618.md`
- Related debug plan (optional): `—`

## What was implemented

- Replaced the invalid `origin-bottom-gpu` class in both `MoreTabsPopup` implementations with valid Tailwind utilities: `origin-bottom transform-gpu`.
- Removed dead active-row logic from both More popups now that the promoted overflow tab is excluded from the popup list.
- Wrapped `selectMoreTab` in `useCallback` in both `useMoreTabLastSelected` hooks so the URL-sync effect in `BottomTabBar` no longer depends on a re-created callback every render.
- Fixed the `VerticalScrollArea` flex-row layout so the scrollable content uses `flex-1 min-w-0` and the track keeps `flex-shrink-0`.
- Removed the redundant `className="w-full"` override from both popup `VerticalScrollArea` usages.
- Added `z-[50]` to the managers app bottom nav to match the workers app stacking behavior.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx`: fixed the invalid transform-origin class, removed dead active-row state, and dropped the redundant width override.
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/MoreTabsPopup.tsx`: fixed the invalid transform-origin class, removed dead active-row state, and dropped the redundant width override.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/use-more-tab-last-selected.ts`: wrapped `selectMoreTab` in `useCallback`.
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/use-more-tab-last-selected.ts`: wrapped `selectMoreTab` in `useCallback`.
- `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx`: added the missing flex sizing for the scroll area and track.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/BottomTabBar.tsx`: added `z-[50]` to the nav root.

## Contract adherence

- `architecture/16_feature_workflow.md`: this correction pass stayed inside the existing primitive and shell-component layer and did not expand scope into routing, provider, or controller changes.
- `task_system/frontend_contract_goal_mapping_guide.md`: only the already-targeted implementation files were read and edited for relational fixes.

## Validation evidence

- `npm run typecheck`: pass
- `rg -n "origin-bottom-gpu" apps/managers-app apps/workers-app packages/ui`: pass, no matches
- `npx playwright test --project=mobile`: not run
- Manual runtime validation: not run

## Known gaps or deferred items

- The requested visual smoke check for popup motion and restored overflow selection was not rerun in-browser in this pass.
- Playwright coverage remains deferred.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_more_tabs_nav_corrections_20260618_1307.md`
