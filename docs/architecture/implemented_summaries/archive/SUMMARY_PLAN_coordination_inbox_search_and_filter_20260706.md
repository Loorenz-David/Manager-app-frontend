# SUMMARY_PLAN_coordination_inbox_search_and_filter_20260706

## Metadata

- Summary ID: `SUMMARY_PLAN_coordination_inbox_search_and_filter_20260706`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-06T10:49:17Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_coordination_inbox_search_and_filter_20260706.md`
- Related debug plan (optional): `—`

## What was implemented

- Turned the coordination inbox search bar into a server-side `q` query with a 300ms debounce and removed the old client-side thread text filtering.
- Added a reusable inbox filter button pass-through in `@beyo/emails` and wired a new coordination inbox filter sheet surface for multi-select coordination-state filtering.
- Registered the new filter sheet in the sellers app and injected the opener so applying filters immediately re-queries the inbox and updates the active filter badge count.

## Files changed

- `packages/emails/src/components/EmailInboxHeader.tsx`: added filter-button props and forwarded them to `SearchBar`.
- `packages/emails/src/components/EmailInboxView.tsx`: threaded filter-button props from the inbox view into the header.
- `packages/task-customer-coordination/src/types.ts`: added inbox `q` params plus shared coordination inbox filter state/defaults.
- `packages/task-customer-coordination/src/api/get-coordination-inbox-threads.ts`: appended `q` to the inbox request query params.
- `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts`: added debounced server-side search, coordination-state filter state, active filter count, and filter-sheet opening.
- `packages/task-customer-coordination/src/pages/CustomerCoordinationInboxFilterSheetPage.tsx`: added the new sheet UI using the existing `BoxPicker` pattern.
- `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailInboxPage.tsx`: enabled the filter button and badge wiring on the inbox page.
- `packages/task-customer-coordination/src/surface-ids.ts`: added the filter sheet surface id plus opener/props types.
- `packages/task-customer-coordination/src/index.ts`: exported the filter state, surface ids/types, page, and lazy loader.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/surfaces.ts`: registered the new coordination inbox filter sheet as a lazy-loaded `sheet` surface.
- `apps/selleres-app/ManagerBeyo-app-sellers/src/features/home/components/HomeView.tsx`: wired the inbox filter sheet opener through the existing surface-openers boundary.

## Contract adherence

- `architecture/04_api_client.md`: kept inbox fetching as a typed API function and extended it only with the new query param.
- `architecture/05_server_state.md`: allowed refetches to flow from query-key changes by deriving inbox params from debounced search/filter state.
- `architecture/07_components.md`: kept `@beyo/emails` generic by adding pass-through props only, without feature logic.
- `architecture/16_feature_workflow.md`: followed the bottom-up order from types/api into controller, page, dynamic loader, and app registration.
- `architecture/28_surfaces.md`: implemented the filter UI as a registered `sheet` surface rather than an in-package drawer.
- `architecture/30_dynamic_loading.md`: exposed the new sheet through a `loadCustomerCoordinationInboxFilterSheetPage` lazy loader and app-side `lazyWithPreload` registration.
- `architecture/35_shared_packages.md`: kept the shared package surface boundary intact by opening the sheet through injected `surfaceOpeners`.
- `task_system/frontend_contract_goal_mapping_guide.md`: used contracts for implementation structure and implementation files only to understand existing local wiring and shapes.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- Runtime browser verification of the inbox search/filter request flow was not run in this pass.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_coordination_inbox_search_and_filter_20260706.md`
