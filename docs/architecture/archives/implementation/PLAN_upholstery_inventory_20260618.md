# PLAN_upholstery_inventory_20260618

## Metadata

- Plan ID: `PLAN_upholstery_inventory_20260618`
- Status: `archived`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-06-18T00:00:00Z`
- Last updated at (UTC): `2026-06-18T14:27:48Z`
- Related issue/ticket: n/a
- Intention plan: `docs/architecture/under_construction/upholstery_inventory_2.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_inventories_list_get_20260618.md`

## Goal and intent

- Goal: Build a complete upholstery-inventory management experience in the managers app — a searchable/filterable browse page, a detail slide-sheet with a quantity overview + history, a stored-quantity editor sheet, deletion, and a More-tab navigation entry.
- Business/user intent: Let managers see what upholstery stock exists, inspect quantities/condition for a given inventory, correct the stored amount (which drives downstream requirement/order recalculation), and remove obsolete inventories — without leaving the managers app.
- Non-goals: No create/edit-of-metadata flow (minimums, currency, planning position), no order placement from this feature, no analytics. Card-level quick actions are a "Coming soon" placeholder only. History and stored-amount update are scaffolded behind seams (backend not final).

## Scope

- In scope (ready now — backend handoff updated 2026-06-18 now provides identity fields and the stored-amount endpoint):
  - Inventory list integration (offset pagination + load more), search (`q`), condition filter pills (`inventory_condition` incl. `ordered`), pull-to-refresh.
  - Inventory detail integration, quantity overview, deletion + surface-close orchestration.
  - **Stored-quantity update** via the now-live `PATCH /{client_id}/current-stored-amount` (absolute set; returns `{}` ⇒ refetch).
  - Navigation entry in the More overflow (route + tab + persistence + preload).
  - Loading / empty / error / retry states.
- Out of scope (blocked on backend — build replaceable seam, do not embed assumptions):
  - Inventory **history** endpoint (isolated data seam, "coming soon" / empty timeline).
  - Card-level quick-action contents beyond placeholder.
- Assumptions:
  - The query-key factory `upholsteryInventoryKeys` already in `features/upholstery/api/upholstery-keys.ts` is the canonical owner of inventory keys and will be extended (params now include `q` / `inventory_condition`).
  - `decimal.js` (already a managers-app dependency) is the decimal tool for all domain arithmetic/comparison; floating-point is allowed only for purely cosmetic number formatting.
  - The Lucide `Spool` icon is available (verified present in the installed `lucide-react`).
  - `upholstery_name` / `upholstery_code` are read directly from both shapes (nullable ⇒ neutral fallback when `null`); no identity-join seam is needed.

## Clarifications required

Resolved by the 2026-06-18 handoff update (kept for trace): (a) `upholstery_name`/`upholstery_code` now ship on **both** shapes and `upholstery_id` on the list partial ⇒ no identity seam; (b) `total_orders` is replaced by `current_amount_ordered_meters` on the list partial ⇒ both shapes derive "has active order" from `current_amount_ordered_meters > 0`, one shared rule; (c) the stored-amount endpoint is live ⇒ no decoy.

- [ ] **History contract is undefined** (endpoint, record shape, pagination). Plan ships an isolated empty/"coming soon" history section. — *blocks the timeline data layer; do not invent a record schema.*
- [ ] **Minor: PATCH path-param prefix inconsistency.** The stored-amount endpoint section documents the path param as `uin_...` while every other section uses `inv_...`. Treat as a doc typo and pass the same inventory `client_id` (`inv_...`) used elsewhere; verify against a live `200` before shipping. — *low risk; flag only.*

## Acceptance criteria

1. A `Uph inv` entry (Lucide `Spool`) appears in the More overflow, routes to `/upholstery-inventory`, preserves active-state + persisted overflow selection, and uses the existing route-transition direction logic.
2. The list page renders an absolute header (search bar + scroll-reactive condition pills in `relative` scroll-visibility mode) over a scrollable, correctly top-offset body with pull-to-refresh and load-more; first card and PTR indicator are not hidden behind the header.
3. Typing in the search bar drives the `q` query param (debounced); toggling pills drives the comma-joined `inventory_condition` param (incl. `ordered`); both reset pagination.
4. Each card shows image, name, code, current stored amount, a condition pill, and a three-dot button; tapping the card opens the detail slide-sheet; tapping three-dot opens a "Coming soon" sheet. Condition reflects the order-precedence rule (`current_amount_ordered_meters > 0` ⇒ ordered).
5. The detail slide-sheet renders its own header (name title / code subtitle / condition pill + three-dot), a no-global-horizontal-padding body with a `ContentCard` quantity overview (stored emphasized; plus ordered, in-need, in-use, total-used) and a history section, and an absolutely-positioned scroll-reactive footer (Close/Back + Stored amount).
6. Tapping the emphasized stored amount, its edit affordance, or the footer Stored-amount action opens one shared bottom-sheet editor (keyboard-safe per `ItemUpholsteryAmountSheetPage`); the field rejects negative values; saving sends a decimal-safe string to `PATCH /{client_id}/current-stored-amount`, and on the `{}` success refetches the detail and triggers the centralized invalidation set.
7. Detail header three-dot opens a quick-action sheet whose delete action uses `ConfirmActionButton`, calls `DELETE /{client_id}`, then removes/invalidates the list + detail, and closes the quick-action and detail surfaces with no stale surface state.
8. All decimal quantities are parsed/compared with `decimal.js`; no domain comparison uses `parseFloat`. Loading, empty, error+retry states exist for list and detail.
9. `npm run typecheck` passes; new unit tests for the condition-derivation + decimal-format helpers and the invalidation helper pass.

## Contracts and skills

### Contracts loaded

- `architecture/15_feature_structure.md`: new `upholstery-inventory` feature folder layout (api/actions/components/controllers/flows/pages/providers/store/lib/surfaces.ts/types.ts/route-entry.tsx/index.ts).
- `architecture/04_api_client.md` + `architecture/34_runtime_validation.md`: `apiClient.get/delete` usage and Zod envelope validation for list/detail/delete.
- `architecture/05_server_state.md`: TanStack Query infinite-query, query-key ownership, pagination, invalidation boundaries.
- `architecture/08_hooks.md`: controller/flow/action-hook aggregation shape; mutation hooks.
- `architecture/24_dto.md`: list/detail raw schema → view-model transformer ownership (separate list vs detail VMs).
- `architecture/10_pages.md` + `architecture/28_surfaces.md` (+ `28_surfaces_local.md`): route-entry page vs slide/sheet surface registration + lifecycle (`open`/`close`/`requestClose`, own-header via `useSurfaceHeader().setHeaderHidden(true)`).
- `architecture/11_routing.md`: `ROUTES`, `TAB_ORDER`, `MORE_TABS`, router registration, primary-tab preload.
- `architecture/36_scroll_visibility.md`: `useScrollVisibility({ mode: "relative" })` for header compaction + footer hide.
- `architecture/37_keyboard_aware_inputs.md`: `FloatingKeyboardBar` for the stored-quantity editor.
- `architecture/13_errors.md`, `architecture/32_loading_skeletons.md`: loading/empty/error/retry conventions.
- `architecture/02_types.md`, `architecture/14_styling.md`, `architecture/07_components.md`, `architecture/27_responsive.md`: branded ids, styling, primitive reuse, safe-area.

### Local extensions loaded

- `architecture/04_api_client_local.md`, `architecture/01_architecture_local.md`, `architecture/28_surfaces_local.md`, `architecture/34_runtime_validation_local.md`: managers-app deltas where present.

### File read intent — pattern vs. relational

Applied the `task_system/frontend_contract_goal_mapping_guide.md` test. Relational reads already performed (what exists): `features/upholstery/types.ts` + `api/upholstery-keys.ts` (existing inventory schema/keys to extend), `features/tasks/{components/TasksView,TaskListCard, api/use-list-tasks-query, list-tasks, task-keys, delete-task, controllers, flows, providers}`, `pages/tasks/{TaskDetailSlidePage,ItemUpholsteryAmountSheetPage}`, `features/tasks/components/detail/TaskDetailBottomActions`, `components/shell/{BottomTabBar,MoreTabsPopup,use-more-tab-last-selected}`, `app/router.tsx`, `lib/{routes,primary-tab-preload}`, `state-pill/StatePill`, `app/surface-registry.ts`. No prohibited pattern reads required — the contracts above cover hook/query/provider/dto shapes.

### Skill selection

- Primary skill: `skills/cross_cutting/intention_planning/SKILL.md` (producing an implementation plan from an intention doc).
- Supporting: `skills/cross_cutting/planning_contract_selection/SKILL.md` (contract set above).
- Trigger terms: `inventory, upholstery, list+detail, surfaces, navigation, invalidation`.
- Excluded alternatives: `skills/cross_cutting/debugging_nested_plan_loop` — not a debugging task; `code_review_frontend` — authoring, not reviewing.

## Implementation plan

### A. New feature folder — `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/`

1. **`types.ts`** — Define **separate** raw schemas matching the handoff (`client_id`-keyed, distinct from the legacy `id`-keyed `UpholsteryInventory` in `features/upholstery/types.ts`, which must remain untouched):
   - `UpholsteryInventoryPartialSchema` (list item): `client_id`, `workspace_id`, `upholstery_id`, `upholstery_name` (string|null), `upholstery_code` (string|null), `image_url` (string|null), `inventory_condition` enum, `current_stored_amount_meters` (string|null), `current_amount_ordered_meters` (string|null), `updated_at` (string|null). *(Note: `total_orders` was removed by the handoff update — do not include it.)*
   - `UpholsteryInventoryDetailSchema` (full detail): all detail fields from the handoff table including `upholstery_name`/`upholstery_code` (keep every decimal as `string|null`).
   - Branded `UpholsteryInventoryId` reuse from `@/types/common`.
   - View models: `InventoryListCardViewModel` (image, name, code, storedDisplay, condition presentation) and `InventoryDetailViewModel` (formatted quantity displays + condition presentation). `name`/`code` are read directly from the response with a neutral fallback when `null` (e.g. the inventory `client_id` tail) — no identity seam.
   - Params: `ListUpholsteryInventoriesParams` extended here (or in the keys-owning file) with `q?` and `inventory_condition?` (comma-joined string).
2. **`lib/condition.ts`** — `deriveInventoryCondition({ inventory_condition, hasActiveOrder })` → `{ key: "available"|"low_stock"|"out_of_stock"|"ordered"; label; variant }` mapping to `StatePillVariant` (available→`success`, low_stock→`warning`, out_of_stock→`danger`, ordered→`active`). `hasActiveOrder` is computed identically for both shapes via `isPositive(current_amount_ordered_meters)` (decimal compare). Unit-tested.
3. **`lib/decimal.ts`** — `formatMeters(value: string | null): string | null` and `isPositive(value: string|null): boolean` built on `decimal.js` (no `parseFloat` for comparisons). Unit-tested.
4. **`lib/invalidate-inventory.ts`** — `invalidateAfterInventoryMutation(queryClient, { inventoryId? })`: centralizes invalidation — `upholsteryInventoryKeys.lists()`, `upholsteryInventoryKeys.detail(id)`, `upholsteryKeys.pickerLists()` (picker shows stored amount + condition), `upholsteryOrderingKeys.all` (ordering values recalculated), and `taskKeys.lists()` + `taskKeys.details()` plus the `@beyo/tasks` item-upholstery query namespace (requirement states recalculated). Used by both update and delete actions so UI components never scatter invalidations.
5. **`api/`**:
   - `list-upholstery-inventories.ts` — `apiClient.get('/api/v1/upholstery-inventories', Schema, queryParams)`; Zod envelope wrapping `upholstery_inventories_pagination { items, limit, offset, has_more }`; passes `limit, offset, q, inventory_condition`.
   - `get-upholstery-inventory.ts` — `apiClient.get('/api/v1/upholstery-inventories/{client_id}', Schema)`; envelope `{ inventory }`.
   - `delete-upholstery-inventory.ts` — `apiClient.delete('/api/v1/upholstery-inventories/{client_id}', Schema)`; tolerate empty `{}` body.
   - `set-stored-amount.ts` — **live endpoint**: `apiClient.patch('/api/v1/upholstery-inventories/{client_id}/current-stored-amount', Schema, { current_stored_amount_meters })`. Absolute set; send a **decimal-safe string** (not a float); response is empty `{}` ⇒ no payload to consume. Use the `inv_...` client_id (see clarification: PATCH section's `uin_...` is a doc typo).
   - `use-list-upholstery-inventories-query.ts` — `useInfiniteQuery` keyed by `upholsteryInventoryKeys.list({...params, limit})`, `getNextPageParam` = offset + items.length when `has_more`, `keepPreviousData`. Mirrors `useListTasksQuery` (page normalization optional; a Zustand store is **not** required — flatten pages directly unless a store is needed for image viewer).
   - `use-get-upholstery-inventory-query.ts` — `useQuery` keyed by `upholsteryInventoryKeys.detail(id)`.
   - Extend `features/upholstery/api/upholstery-keys.ts` `upholsteryInventoryKeys.list` params type only (keep the existing factory as the owner).
6. **`actions/`**:
   - `use-delete-upholstery-inventory.ts` — `useMutation(deleteUpholsteryInventory)`; `onSettled` → `invalidateAfterInventoryMutation` + `queryClient.removeQueries(detail)`.
   - `use-set-stored-amount.ts` — `useMutation(setStoredAmount)`; client-side guard rejecting negative input before the call; `onSettled` → `invalidateAfterInventoryMutation` (covers the detail refetch the handoff requires plus the downstream requirement/order recalculation side effects).
7. **`flows/use-inventory-list-page.flow.ts`** — owns debounced `q`, condition-pill selection, builds params, calls the list query, exposes `cards`, `isLoading` (delayed-true), `isFetchingMore`, `hasMore`, `loadMore`, `refetch`. (Mirrors `use-tasks-page.flow.ts`.)
8. **`controllers/use-inventory-list.controller.ts`** — aggregates the flow + surface-open handlers (`openDetail(id)`, `openCardActions(id)`); `controllers/use-inventory-detail.controller.ts` — detail query + `openStoredAmountEditor`, `openDetailActions`, `refetch`, `requestClose` wiring.
9. **`providers/`** — `InventoryListViewProvider` and `InventoryDetailProvider` (context shells mirroring `TasksViewProvider`/`TaskDetailProvider`).
10. **`store/`** — only if a client-state slice (e.g., pill selection persistence) is needed; otherwise omit (keep filter state in the flow).
11. **`components/`** — `InventoryListView` (absolute header + PTR + load-more, copying `TasksView` offsets), `InventoryListHeader` (search-bar + scroll-reactive `BoxPicker`/pill row in relative mode), `InventoryListCard` (image/name/code/stored/condition pill/three-dot, modeled on `TaskListCard`), `InventoryDetailHeader`, `InventoryQuantityOverview` (`ContentCard`; stored emphasized + edit affordance), `InventoryHistorySection` (seam — empty/"coming soon"), `InventoryDetailFooter` (absolute, scroll-reactive, Close/Back + Stored amount; modeled on `TaskDetailBottomActions`).
12. **`pages/`** — `UpholsteryInventoryDetailSlidePage.tsx` (own header via `useSurfaceHeader().setHeaderHidden(true)`, `useScrollVisibility` relative, PTR + footer; modeled on `TaskDetailSlidePage`), `StoredAmountSheetPage.tsx` (`FloatingKeyboardBar` + `NumberInput` + save; modeled on `ItemUpholsteryAmountSheetPage`), `InventoryCardActionsSheetPage.tsx` ("Coming soon"), `InventoryDetailActionsSheetPage.tsx` (`ConfirmActionButton` delete).
13. **`surfaces.ts`** — `INVENTORY_DETAIL_SLIDE_ID` (slide), `STORED_AMOUNT_SHEET_ID` (sheet), `INVENTORY_CARD_ACTIONS_SHEET_ID` (sheet), `INVENTORY_DETAIL_ACTIONS_SHEET_ID` (sheet) via `lazyWithPreload`; export `upholsteryInventorySurfaces` + typed `*SurfaceProps` (`{ inventoryId }`, editor adds `prefill?`).
14. **`route-entry.tsx`** — `UpholsteryInventoryRouteEntry` wrapping `InventoryListViewProvider` + `InventoryListView`.
15. **`index.ts`** — public exports (surfaces, route-entry, keys re-export if needed).

### B. Wiring

16. **`app/surface-registry.ts`** — spread `...upholsteryInventorySurfaces`.
17. **`lib/routes.ts`** — add `upholsteryInventory: '/upholstery-inventory'`; append to `TAB_ORDER` and `MORE_TABS`.
18. **`lib/primary-tab-preload.ts`** — add a `upholsteryInventoryPageRoute` lazy + entry in `PRIMARY_TAB_PRELOADERS` (the `Record<TabPath,…>` type forces this).
19. **`app/router.tsx`** — register `{ path: ROUTES.upholsteryInventory, element: tabRoute(upholsteryInventoryPageRoute.Component) }` inside the `AppShell` children.
20. **`pages/upholstery-inventory/UpholsteryInventoryPage.tsx`** — thin lazy wrapper around `UpholsteryInventoryRouteEntry` (mirrors `TasksPage`).
21. **`components/shell/BottomTabBar.tsx`** + **`MoreTabsPopup.tsx`** — add the `Spool`/`Uph inv` entry to `TABS` and both `MORE_TAB_META` maps; `use-more-tab-last-selected.ts` needs no change (it reads `MORE_TABS` dynamically). Verify the 5-column underline math is unaffected (more-tabs share the single dynamic slot).

## Risks and mitigations

- Risk: `upholstery_name`/`upholstery_code` are `null` (missing parent relation) ⇒ blank card/header text.
  Mitigation: neutral fallback (inventory `client_id` tail) in the view-model mapping; both fields now arrive on both shapes so no fetch is needed.
- Risk: Stored-amount PATCH returns `{}` ⇒ UI shows stale numbers if not refreshed; downstream task/order requirement states silently change server-side.
  Mitigation: `onSettled` runs `invalidateAfterInventoryMutation` (detail + list + picker + ordering + tasks), satisfying the handoff's "refresh after success" requirement.
- Risk: Decimal precision lost via `parseFloat` (existing `features/upholstery` code does this).
  Mitigation: new feature uses `decimal.js` helpers exclusively for comparisons; do not reuse the legacy `formatMeters`.
- Risk: Over-broad invalidation causes refetch storms, or under-invalidation leaves stale task/order data.
  Mitigation: single `invalidateAfterInventoryMutation` helper with an explicit, reviewed key set; no scattered invalidations.
- Risk: Deleting an inventory while its detail/quick-action surfaces are open leaves stale surface state.
  Mitigation: delete handler closes both surfaces (`useSurfaceStore.close`/`requestClose`) before/after settle, then invalidates + `removeQueries(detail)`.
- Risk: Adding a `MoreTabPath` breaks typed maps/preloaders at compile time.
  Mitigation: update all four sites (routes, preload record, both `MORE_TAB_META`); rely on `npm run typecheck` to catch omissions.
- Risk: The history seam leaks temporary assumptions into UI before its contract lands.
  Mitigation: confine it to `InventoryHistorySection` (empty/"coming soon"); no record schema invented; UI has no data dependency until the endpoint exists.
- Risk: Sending a float for `current_stored_amount_meters` causes drift; sending a negative is rejected with `422`.
  Mitigation: serialize from a `decimal.js` value to string; client-side `>= 0` guard before submit.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (verifies the four nav-wiring sites and new schemas).
- `npm run test -- upholstery-inventory`: unit tests for `lib/condition.ts`, `lib/decimal.ts`, and `lib/invalidate-inventory.ts` pass.
- `npx playwright test --grep "upholstery inventory" --project=mobile`: list loads, search/filter update results, card → detail, stored-amount editor opens keyboard-safe, delete closes surfaces and removes the row.
- `npx playwright test --grep "upholstery inventory" --project=desktop`: same flows; header/footer scroll-visibility and safe-area behavior intact.
- Manual: confirm `Uph inv` appears in More overflow, persists as last-selected, and the route-transition direction matches `TAB_ORDER` position.

## Review log

- `2026-06-18` `claude-opus-4-8`: Initial plan authored from `upholstery_inventory_2.md` + backend handoff after researching tasks/upholstery features, routing, surfaces, and shared primitives.
- `2026-06-18` `claude-opus-4-8`: Folded in the updated handoff — added the live `PATCH …/current-stored-amount` integration (moved from blocked to in-scope, no decoy), adopted `upholstery_name`/`upholstery_code`/`upholstery_id` on both shapes (dropped the identity seam), switched the order-precedence rule to `current_amount_ordered_meters > 0`, and reduced open clarifications to history only (+ a minor `uin_`/`inv_` path-prefix note). Verified `apiClient.patch(path, schema, body)` exists.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` — the remaining clarification (history endpoint) does not block any in-scope deliverable; the in-scope feature is fully specified and ready for Codex. → `debugging` only if Codex hits integration gaps.
- Transition owner: `David` / `claude-opus-4-8`
