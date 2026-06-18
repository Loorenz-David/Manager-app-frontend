Intention: Upholstery Inventory Management

Purpose

Create a complete upholstery inventory management experience for the managers app.

The feature should allow users to:

- view the upholstery inventories currently available in the system
- search and filter inventories
- inspect the current quantities and condition of a specific upholstery inventory
- review its inventory history
- update its stored quantity
- access quick actions, including deletion
- navigate to the feature through the existing More navigation menu

This document describes the intended user experience and functional boundaries. Claude should research the existing application architecture, contracts, shared primitives, query patterns, surfaces, routing, and state-management conventions before producing the implementation plan.

⸻

1. Main upholstery inventory page

Create a main page for browsing upholstery inventories.

The page should follow the established structural pattern used by the tasks view:

apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TasksView.tsx

The page consists of:

- an absolute header
- a scrollable body
- pull-to-refresh support
- offset pagination or load-more behavior aligned with the backend contract

The body must be offset correctly so that the first inventory card and the pull-to-refresh indicator are not hidden behind the absolute header.

Header

The header contains:

1. A search bar using the existing shared primitive:
   packages/ui/src/components/primitives/search-bar
2. A horizontal row of quick-filter pills below the search bar.

The quick-filter row should react to scrolling through the existing scroll-visibility system in relative mode, following the tasks page behavior:

packages/ui/src/components/primitives/scroll-visibility

The exact filter options, query-state ownership, and interaction with backend filtering should be resolved during implementation planning based on the current application conventions and available API capabilities. the handoff describes how the query params can be used, the searchbar will be used to populated the query param for "q" . the quick filter pills will render the possible inventory conditions, apart from those we will render also the state "ordered" as it can be send with in that param state list .

⸻

2. Upholstery inventory cards

Each inventory should be represented by a card displaying the most useful summary information available from the list endpoint.

The card should display:

- upholstery image
- upholstery name
- upholstery code
- current stored amount
- current inventory condition
- a three-dot quick-action button in the top-right area

The visual and interaction pattern should align with the existing task list cards:

apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskListCard.tsx

Inventory condition

The card should display the inventory condition using the shared state-pill primitive or another established condition-display convention selected during planning.

The implementation must account for the intended domain rule that an active upholstery order may take precedence over the ordinary stock condition when determining the condition shown to the user.

this happens when the value at total_orders is > 0 . that > 0 represent the total ordered amount.

Card interactions

Tapping the card opens the upholstery inventory detail page.

Tapping the three-dot button opens a bottom-sheet quick-action page. For the initial implementation, this card-level quick-action page may display only a “Coming soon” placeholder.

⸻

3. Upholstery inventory detail page

The inventory detail page should open inside the existing slide-sheet surface system.

The page should define its own header instead of using the default slide-surface page header.

The interaction and layout should take inspiration from:

apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx

Detail header

The header should display:

- upholstery name as the main title
- upholstery code as the subtitle
- inventory condition on the right
- a three-dot quick-action button beside the condition

Use the shared state-pill primitive for the condition:

packages/ui/src/components/primitives/state-pill/StatePill.tsx

The list card and detail header should derive their displayed condition from the same domain or presentation rule.

Detail body

The detail body should not apply broad global horizontal padding. Its internal sections should manage their own spacing.

The main content should use the same ContentCard-oriented structure as the task detail page where appropriate.

The body contains two main sections:

1. Current quantity overview
2. Upholstery inventory history timeline

⸻

4. Current quantity overview

Create a clear visual summary of the current inventory quantities.

The overview should display:

- stored amount
- ordered amount
- amount in need
- amount in use
- total used amount

The stored amount is the primary editable value and should receive stronger visual emphasis than the other quantities.

The user should be able to open the stored-quantity editor by:

- tapping the stored amount or its edit affordance
- tapping the stored-amount action in the detail footer

All decimal values returned by the backend are precision-preserving strings. The implementation must retain this precision and must not rely on ordinary floating-point parsing for domain calculations.

⸻

5. Stored quantity editor

The stored quantity editor should open inside a bottom-sheet surface.

It should contain:

- a field for entering the total stored quantity that the inventory should reflect
- a save action below the field

The editor should follow the keyboard-safe behavior and layout pattern already established by:

apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx

The input and save action should remain usable while the mobile keyboard is open, and dismissing the keyboard should not disrupt the sheet layout.

Update semantics

The value submitted by the frontend represents the new absolute total stored amount, not a positive or negative adjustment.

The backend update endpoint is still under construction. The implementation plan may define a temporary decoy API boundary so the feature can be structured correctly, but the API integration must remain isolated and easy to replace when the real contract becomes available.

Updating the stored amount may cause the backend to recalculate:

- upholstery requirements
- inventory conditions
- requirement states
- upholstery ordering values

The frontend must therefore invalidate or refresh every materially affected query.

At minimum, Claude should research the query keys and data dependencies used by:

- task detail upholstery data:
  apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx
- upholstery picker:
  apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx
- upholstery ordering:
  apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-ordering/pages/UpholsteryOrderingSlidePage.tsx
- the new upholstery inventory list and detail queries

The plan should define a centralized and explicit invalidation strategy rather than scattering unrelated query invalidations through UI components.

⸻

6. Upholstery inventory history

Below the quantity overview, render the history or record flow for the selected upholstery inventory.

The visual intention is similar to the existing task-flow timeline:

packages/tasks/src/components/TaskFlowTimeline.tsx

Claude should investigate whether the existing timeline can be cleanly generalized into a reusable timeline primitive or shared presentation component.

Reuse should only be selected if task history and upholstery inventory history can share a stable presentation contract without introducing task-specific concepts into the upholstery feature.

Otherwise, create a separate inventory-history component that follows the same visual language.

The backend history endpoint or final history contract may not yet exist. The implementation plan should identify this dependency and isolate any temporary data boundary without inventing irreversible domain assumptions.

⸻

7. Detail footer

The detail page should have an absolutely positioned footer that follows the same general layout and scroll-visibility behavior as the task detail footer.

The footer contains two actions:

- Close / Back
- Stored amount

The stored-amount action opens the same stored quantity editor used by the editable stored-amount element in the quantity overview.

The footer must remain compatible with:

- safe-area insets
- the slide-sheet container
- the page’s scroll-visibility behavior

⸻

8. Detail quick actions and deletion

Tapping the three-dot action in the detail header should open a bottom-sheet quick-action page.

For the initial implementation, the primary available action is deleting the upholstery inventory.

Use the existing confirm-action primitive:

packages/ui/src/components/primitives/confirm-action-button

Deletion should call the documented soft-delete endpoint.

After a successful deletion, the frontend should:

- remove or invalidate the inventory from the list
- invalidate the corresponding detail query
- close any active quick-action and detail surfaces that reference the deleted inventory
- avoid leaving stale navigation or surface state behind

Claude should research the current surface lifecycle and mutation conventions before specifying the exact sequence.

⸻

9. Navigation integration

Add the upholstery inventory page to the existing overflow navigation opened from the More tab.

The tab should:

- use the Lucide Spool icon, after verifying its availability in the installed Lucide version
- use the label Uph inv
- participate correctly in the existing dynamic More-tab behavior
- preserve active-state behavior
- preserve persisted overflow-tab selection
- use the existing route-transition behavior

The current More navigation implementation is documented in:

docs/architecture/under_construction/implementation/PLAN_more_tabs_nav_20260618.md

Claude should inspect the implemented routes and navigation components rather than relying only on the archived plan.

⸻

10. Backend contracts

The currently available backend endpoints and response contracts are documented in:

docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_inventories_list_get_20260618.md

The available contract currently includes:

- paginated inventory list
- full inventory detail
- soft deletion
- partial list serialization
- full detail serialization
- image URL
- active order count on list items

Important integration constraints:

- list items and detail objects use different schemas
- decimal quantities are serialized as strings to preserve precision
- image_url is nullable
- total_orders exists only in list items
- total_orders may be null when there are no active orders
- delete returns an empty object on success

The implementation plan should preserve the distinction between list and detail schemas instead of forcing both endpoints into one oversized frontend type.

Data availability concern

The intended inventory card and detail header require the upholstery name and upholstery code.

These fields are not present in the currently documented inventory list or detail response shapes.

Claude should verify whether they are available through an existing related upholstery query, whether the backend handoff is incomplete, or whether the backend contract needs to be extended.

The implementation should not introduce per-card requests or another N+1 data-loading pattern merely to retrieve these values.

⸻

11. Architectural expectations

Claude should research and align the plan with the application’s existing:

- feature-folder structure
- route-entry conventions
- API client and runtime schema-validation patterns
- query-key ownership
- pagination conventions
- mutation and invalidation rules
- slide-sheet and bottom-sheet surface lifecycle
- page-controller or provider boundaries
- shared UI primitive rules
- loading, empty, error, and retry states
- mobile keyboard behavior
- safe-area behavior
- accessibility conventions

The final implementation should avoid placing server-state logic directly in presentational components.

Shared behavior such as condition derivation, quantity formatting, query invalidation, and surface orchestration should have clear ownership and should not be duplicated between cards, detail pages, and sheets.

⸻

12. Initial delivery boundaries

The implementation plan should clearly distinguish between functionality that can be implemented now and functionality that depends on incomplete backend contracts.

Ready to implement now

- inventory list integration
- inventory detail integration
- deletion
- navigation entry
- search
- client-side or currently supported filtering
- pull to refresh
- offset pagination or load more
- quantity overview using currently available detail fields
- surface and page structure
- loading, empty, and error states

Dependent on incomplete backend contracts

- stored quantity update endpoint
- inventory history endpoint or history payload
- server-side search or filter parameters not currently documented
- final rule for order-in-progress condition precedence, if not already exposed by the backend
- upholstery name and code in list and detail data, unless an efficient existing source is identified

For incomplete contracts, define replaceable integration seams rather than embedding temporary assumptions throughout the feature.

⸻

Expected planning outcome

Claude should produce an implementation plan that:

- identifies the exact frontend files to create or modify
- maps each user interaction to the correct existing surface and navigation systems
- defines separate list and detail API schemas
- defines query keys, pagination behavior, mutations, and invalidation boundaries
- resolves shared versus feature-specific components
- identifies backend blockers explicitly
- accounts for loading, empty, error, refresh, pagination, deletion, and surface-close behavior
- includes a realistic validation strategy
- remains consistent with the managers-app architecture and contracts

The plan should remain implementation-focused and should not expand the feature beyond the intention described here.
