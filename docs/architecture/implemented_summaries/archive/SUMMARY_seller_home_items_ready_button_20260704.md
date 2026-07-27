# SUMMARY_seller_home_items_ready_button_20260704

## Metadata

- Summary ID: `SUMMARY_seller_home_items_ready_button_20260704`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-04T07:53:36Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_seller_home_items_ready_button_20260704.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a new seller `home` feature slice with a controller, provider, compact-count helper, and `HomeView` component.
- Wired `usePostHandlingCountsQuery("pending")` into the seller home button label so the home screen shows `Items Ready (N)` when counts are loaded.
- Connected the seller home button to `TASK_POST_HANDLING_SLIDE_SURFACE_ID` with the required nested surface openers and a fixed `defaultTab: "pending"`.
- Replaced the placeholder seller `HomePage` with `HomeViewProvider` and `HomeView`.
- Corrected a manager-app `TaskDetailSlidePage` import so the required repo-root typecheck passes again.

## Files changed

- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/types.ts`: added the home view state type.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/lib/format-compact-count.ts`: added compact count formatting for the button label.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/controllers/use-home-view.controller.ts`: derived the post-handling count and display label from `usePostHandlingCountsQuery("pending")`.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/providers/HomeViewProvider.tsx`: added the home controller context boundary.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/components/HomeView.tsx`: rendered the seller-only `Items Ready` button and wired all task post-handling surface openers.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/index.ts`: exported the public home feature API.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/pages/home/HomePage.tsx`: replaced the placeholder page with `HomeViewProvider` and `HomeView`.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`: switched `TaskDetailProvider` and `useTaskDetailContext` imports to `@beyo/tasks`.

## Contract adherence

- `architecture/16_feature_workflow.md`: implemented the new seller feature in feature order from types and controller through provider, component, and page entry.
- `architecture/23_providers.md`: kept the home controller behind a dedicated provider/context boundary.
- `architecture/28_surfaces_local.md`: used registered `slide` and `sheet` surfaces only, with `useSurface()`-driven openers.
- `task_system/frontend_contract_goal_mapping_guide.md`: used contracts for structure and relational reads only to mirror the existing task post-handling opener shape and seller app boundaries.

## Validation evidence

- `npm run typecheck`: pass, executed from repo root
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- Runtime visual verification of the new seller home button and its post-handling slide entry path was not run in-browser in this pass.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_seller_home_items_ready_button_20260704_0753.md`
