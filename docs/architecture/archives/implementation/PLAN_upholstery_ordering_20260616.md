# PLAN_upholstery_ordering_20260616

## Metadata

- Plan ID: `PLAN_upholstery_ordering_20260616`
- Status: `archived`
- Owner agent: `Claude (Opus 4.8)`
- Created at (UTC): `2026-06-16T18:30:00Z`
- Last updated at (UTC): `2026-06-16T16:50:32Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/upholstery_ordering_2.txt`

## Goal and intent

- Goal: Build a manager/admin **upholstery-ordering** slide-page workspace that lets a user (a) discover upholstery shortages and place orders, and (b) review existing orders and register received quantities, with counts/lists/states reconciled against backend truth.
- Business/user intent: One operational loop — *see what is short → understand which work creates the shortage → select priority items → place an order with immediate feedback → see active orders → understand what an order fulfils → register full/partial delivery → return to lists that reflect backend truth.*
- Non-goals:
  - Re-deriving shortage, allocation, receivable, or state-transition logic on the client. The backend is authoritative; the frontend renders results and performs only safe, input-derived optimistic updates.
  - A rich create-order form. First implementation is intentionally narrow: quantity-only create, quantity-only receive.
  - Order-specific item linkage. Order detail intentionally lists items by `upholstery_id` + `requirement_states=ordered` until the backend links items to orders (noted in handoff §Interface 3 and intention line 218).
  - Supplier/price/currency capture, approval workflow, draft/pending/approved create states.

## Scope

- In scope:
  - New feature module `features/upholstery-ordering/` (types, api, actions, controllers, providers, components, forms, pages, surfaces, index).
  - Five slide surfaces: main ordering page, shortage detail, order detail, create-order, receive-order.
  - Home entry-point action wired to the needs count.
  - Shared selectable item card used by both detail pages.
  - Shared-contract update: add the `UpholsteryOrder` → `uor` client-ID prefix (see Clarification/Risk + step 1).
- Out of scope: backend changes (all endpoints exist per handoff `HANDOFF_TO_FRONTEND_upholstery_ordering_routers_contract_20260616.md`), realtime socket subscriptions (rely on invalidation), permissions UI (API enforces admin/manager).
- Assumptions:
  1. **Priority/selection identity** is `item_upholstery.client_id` (prefix `iup`), which is what every item row exposes (handoff routes 3 & 8 → `item_upholstery.client_id`) and what both mutations accept as `priority_item_upholstery_ids`. This is the single identity carried across shortage items, order items, create, and receive (resolves intention gap 7).
  2. `item_upholstery.amount_meters` may be `null`; treat null as 0 for sums and omit from displayed totals.
  3. Orders mode default state policy is `ordered,partially_received` (handoff §1/§2 + intention line 70/319). The order card still renders a `received` branch (`received_at`) for robustness/future state-filter expansion.
  4. Receive page receives the order's `order_amount_meters` and `received_amount_meters` via surface props (already present on the order row), so **remaining receivable = `order_amount_meters - (received_amount_meters ?? 0)`** is computed without an extra fetch.
  5. The task/item/image shapes returned by the order/needs item routes are **identical** to the pending-upholstery task-row shapes already schema'd; those schemas are reused, not recreated (per user instruction).

## Clarifications required

- [ ] **Cross-feature schema reuse mechanism.** The order/needs item rows reuse `PendingSeatRawTaskSchema`, `PendingSeatRawItemSchema`, `PendingSeatImageSchema`, and the `toTaskFromPendingRaw` / `toItemFromPendingRaw` converters already defined in `features/pending-upholstery/types.ts`. *Recommended:* export these four building blocks + two converters from `features/pending-upholstery/index.ts` and import them — this honors "reuse, do not recreate" without lifting a shared module. Alternative (heavier): lift them into a shared `features/tasks` task-row module. **Does not block** — recommended path will be taken unless rejected.
- [ ] **Create-order optimism level.** *Recommended:* invalidation-first (no fabricated allocation), with an optional light optimistic insert of a provisional order card synthesized from known inputs (`client_id`, `upholstery_id`, `order_amount_meters`, `state: "ordered"`) + upholstery display context already in hand. Confirm whether the light insert is wanted or invalidation-only. **Does not block.**

> Note: intention gaps 1–6 were resolved inline by the author (receive mutation + end-state documented, link-count removed, receivable amount added, default state policy set, `uor` prefix declared). The only true cross-cutting prerequisite is the missing `uor` prefix in the shared client-ID contract (see Risks + step 1).

## Acceptance criteria

1. Home shows an **Ordering (n)** action whose count is `needs_ordering_count` (GET `/upholstery-order-needs/count`); tapping it opens the ordering slide page in **Needs ordering** mode.
2. The main page has two persistent modes (Needs ordering default / Orders) with server-backed pill counts (`upholstery_count` for needs; `total` of `ordered,partially_received` for orders); switching modes **preserves search text** and swaps list + actions.
3. The page reproduces the pending-upholstery composition: absolute custom header (back + search same row, pills below), pills collapse + footer hides via `useScrollVisibility({ mode: "relative" })`, pull-to-refresh paginated list with correct top offset, absolute Close & Back footer, host surface header hidden.
4. Needs cards render image, name, code, total-to-order meters, contributing item count, earliest due date, and a task-card-style bottom quick action that opens create-order directly; tapping the card body opens shortage detail.
5. Shortage detail lists contributing items (GET `/upholstery-order-needs/{upholstery_id}/items`) with owned header (back, title, aggregate item count + total required), server-backed search (filter/sort hidden), **Show more** pagination, selection that survives pagination + search by `item_upholstery.client_id`, and a two-button footer (Close & Back / Order) where Order's label shows the selected total meters and falls back to a general order when nothing is selected.
6. Create-order (quantity-only) generates a `uor_…` client_id up front, sends `priority_item_upholstery_ids` when launched from selection, and on success **closes create + shortage detail** and reconciles needs/orders counts + lists.
7. Orders cards render image, name, code, ordered meters, state (when useful), expected-receive/received date per state, and a quick action opening receive directly; tapping the body opens order detail.
8. Order detail mirrors shortage detail (items via `/upholstery-orders/items?upholstery_ids=<order.upholstery_id>&requirement_states=ordered`) with a Received footer action whose label shows selected count.
9. Receive (quantity-only) prefills sum-of-selected or remaining-receivable, validates positive and `≤ remaining receivable`, sends `priority_item_upholstery_ids`, and on success applies a light optimistic state update from the response `state`, closes, and reconciles all affected caches.
10. `npm run typecheck`, vitest, and Playwright mobile+desktop pass.

## Contracts and skills

### Domain schemas consulted (per contract guide §Domain grounding)

- `src/features/upholstery/types.ts`: `Upholstery`, `UpholsteryInventory`, `UpholsteryId`, `UpholsteryInventoryId`, `UPHOLSTERY_CURRENCY`, `formatMeters`. No order entity exists yet → new order/needs types are additive.
- `src/features/tasks/types.ts`: `Task`, `TaskViewModel`, `toTaskViewModel`, `TASK_*` enums — order/needs item rows carry the full task shape.
- `src/features/items/types.ts`: `Item`, `ItemSchema`, `ITEM_STATE`, `ITEM_CURRENCY` — primary-item shape.
- `src/features/pending-upholstery/types.ts`: `PendingSeatRawTaskSchema`, `PendingSeatRawItemSchema`, `PendingSeatImageSchema`, `toTaskFromPendingRaw`, `toItemFromPendingRaw` — **reused** for the ordering item rows (identical backend shape).
- `packages/lib/src/client-id.ts`: `CLIENT_ID_PREFIXES` — **missing `UpholsteryOrder`/`uor`**; must be added (step 1).
- `src/types/api.ts`: `ApiEnvelopeSchema` — response envelope wrapper.

### Contracts loaded

Read order — canonical first, then `_local` companion where present (precedence: local overrides for this app only).

Core (always):
- `architecture/01_architecture.md` (+ `01_architecture_local.md`): module boundaries; route-entry note (not used — feature is surface-only, no tab route).
- `architecture/02_types.md`: branded ids, Zod schema discipline.
- `architecture/04_api_client.md` (+ `04_api_client_local.md`): `apiClient.get/put/post` typed-schema calls, flat error shape, envelope under `data`.
- `architecture/05_server_state.md`: query keys, query hooks, `keepPreviousData`, invalidation.
- `architecture/06_client_state.md`: controller-owned search/mode/selection/pagination state.
- `architecture/08_hooks.md`: action hooks — optimistic snapshot/rollback/invalidate for create + receive.
- `architecture/13_errors.md`: error/empty/pagination-error states.
- `architecture/15_feature_structure.md` (+ `_local` if present): feature folder layout + build order.

New-feature (CRUD) bundle:
- `architecture/16_feature_workflow.md`: Types → Keys → API+Query → Actions → Controllers → Providers → Components → Forms → Pages → Dynamic loading → Surfaces → index → tests.
- `architecture/07_components.md`: presentational components consume context only.
- `architecture/09_forms.md`: quantity create/receive forms, validation + server error surfacing.
- `architecture/10_pages.md`: slide-page composition, skeleton/empty/error.
- `architecture/11_routing.md`: (surface registration only; no router route).
- `architecture/14_styling.md`: tokens/`cn`, no ad-hoc values.
- `architecture/23_providers.md`: provider→controller context shell.
- `architecture/24_dto.md`: raw→view-model transformers, `client_id` generation.
- `architecture/17_testing.md`: vitest + MSW + data-testid strategy.
- `architecture/34_runtime_validation.md` (+ `_local`): Playwright fixtures, project names, element-naming, credentials.

UI / surfaces / interaction:
- `architecture/28_surfaces.md` (+ `28_surfaces_local.md`): `slide` surface type, `useSurface` open/close/closeMany, `useSurfaceProps`, `useSurfaceHeader().setHeaderHidden(true)`.
- `architecture/27_responsive.md`: mobile-first.
- `architecture/31_animations.md`: collapse/slide transitions for header/footer.
- `architecture/32_loading_skeletons.md`: list skeletons.
- `architecture/36_scroll_visibility.md`: `useScrollVisibility({ mode: "relative" })`, scroll container registration, `PullToRefresh`.
- `architecture/37_keyboard_aware_inputs.md`: numeric quantity inputs above the mobile keyboard on the create/receive slides.
- `architecture/30_dynamic_loading.md` (+ `30_dynamic_loading_local.md`): `lazyWithPreload` surface components.
- `architecture/18_performance.md`: `React.memo` cards, memoized params/selection.

### Local extensions loaded

- `04_api_client_local.md`: flat string error, envelope `data`.
- `28_surfaces_local.md`: active surface types (`slide`/`sheet`/`modal`); all five new surfaces are `slide`.
- `30_dynamic_loading_local.md`: `lazyWithPreload` from `@beyo/ui`.
- `34_runtime_validation_local.md`: fixture/script/credential conventions.

### File read intent — pattern vs. relational

Reads already performed are **relational** (what exists): pending-upholstery page/header/card/controller/provider/types/api/dto (the intention names them as the reference composition + return shapes), `TaskListCard`, `TaskDetailSlidePage`, `HomeView`, `surface-registry`, `client-id.ts`, `api-client` method signatures, `SearchBar` props, `use-surface` API, upholstery/items/tasks `types.ts`. Pattern questions (how to write action/query/controller/provider/dto) are answered by the contracts above — no further "how-to" implementation reads.

### Excluded contracts

- `12_auth.md` / `19_permissions.md`: API enforces roles; no UI gating.
- `21_realtime.md`: backend dispatches `upholstery:order-received` etc., but intention requires only invalidation-based reconciliation, not live subscription.
- `33_vaul_drawer.md`: surfaces are slides, not drawers.
- `22/25/26/03`: no uploads, profile, persistence, or env work.

### Skill selection

- Primary skill: none required (standard feature build under contracts).
- Trigger terms: `surface`, `scroll visibility`, `optimistic update`, `forms`, `keyboard`.

## Implementation plan

Build bottom-up logic, top-down UI (per `16_feature_workflow.md`).

1. **Shared-contract: add `UpholsteryOrder` → `uor` prefix.** Add `UpholsteryOrder: 'uor'` to `CLIENT_ID_PREFIXES` in `packages/lib/src/client-id.ts`, and mirror the row in the authoritative `backend/app/beyo_manager/models/tables/client_id_prefix_map.md` and its frontend mirror `frontend/docs/architecture/backend/tables/client_id_prefix_map.md`. This unblocks `generateClientId("UpholsteryOrder")`. (Backend already validates the `uor` prefix per handoff §4/§Validation notes; the maps simply lag.)

2. **Types** — `features/upholstery-ordering/types.ts`:
   - Enums: `UPHOLSTERY_ORDER_STATE`, `ITEM_UPHOLSTERY_REQUIREMENT_STATE` (from handoff enum reference).
   - `OrderNeedRowSchema` (route 7 item): `upholstery_id, upholstery_name, upholstery_code, upholstery_image_url, item_count, total_amount_meters, earliest_due_date`.
   - `OrderRowSchema` (route 2 item): `client_id, upholstery_id, upholstery_name, upholstery_code, upholstery_image_url, order_amount_meters, received_amount_meters, expected_receive_at, received_at, state, supplier_id`.
   - `OrderingItemRowSchema` (routes 3 & 8): compose reused `PendingSeatRawTaskSchema`/`RawItemSchema`/`ImageSchema` (as `task` / `primary_item` / `item_images`) + `item_upholstery: { client_id, amount_meters: number|null }`.
   - Count payloads: `OrderNeedsCountSchema` (`needs_ordering_count`, `upholstery_count`), `OrdersCountSchema` (`total`, `by_state`).
   - Inputs: `CreateUpholsteryOrderInput` (`client_id, upholstery_id, order_amount_meters, priority_item_upholstery_ids`), `ReceiveUpholsteryOrderInput` (`client_id, received_amount_meters, priority_item_upholstery_ids`); responses `{ client_id }` and `{ client_id, state }`.
   - View models: `ShortageCardVM`, `OrderCardVM`, `OrderingItemCardVM` (`itemUpholsteryId`, `task: TaskViewModel`, `primaryItem`, image VMs, `amountMeters`, `dueDate`).

3. **Query keys** — `api/upholstery-ordering-keys.ts`: `needs.{count, list(params), items(upholsteryId, params)}`, `orders.{count(states), list(params), items(params)}`.

4. **API fetchers + query hooks** (one pair each, envelope-validated like `fetch-pending-seat-tasks.ts`):
   - Needs: count (route 6), list (route 7), items-by-upholstery (route 8).
   - Orders: count (route 1, `states=ordered,partially_received`), list (route 2), items (route 3, `upholstery_ids`+`requirement_states`).
   - CSV-encode multi-value params (`states`, `upholstery_ids`, `requirement_states`). Query hooks use `keepPreviousData`.

5. **DTO** — `lib/upholstery-ordering-dto.ts`: raw→VM transformers; reuse `toTaskFromPendingRaw`/`toItemFromPendingRaw`/`toTaskViewModel` and image VM mapping (mirroring `pending-seat-dto.ts`); compute earliest-due / total-meters display via `formatMeters`.

6. **Actions** (`08_hooks.md` optimistic discipline):
   - `use-create-upholstery-order.ts`: `apiClient.put("/api/v1/upholstery-orders", …)`. On success invalidate needs count/list + orders count/list. (Optional light insert per clarification 2.) Roll back on error; surface flat error.
   - `use-receive-upholstery-order.ts`: `apiClient.post("/api/v1/upholstery-orders/receive", …)`. Optimistic: patch the target order's `state` in orders-list + order-detail caches using the response `state`; invalidate orders count/list, order items, needs count/list. Validate `≤ remaining receivable` before mutate.

7. **Controllers** (own search/mode/selection/pagination; UI stays presentational):
   - `use-upholstery-ordering.controller.ts`: `mode` (`needs`|`orders`), shared `searchInput`+debounced `q` preserved across modes, per-mode offset/accumulation (dedupe by identity like `appendDeduped`), pill counts from the two count queries, openers for shortage detail / order detail / create / receive.
   - `use-ordering-item-selection.controller.ts`: shared base for both detail pages — paginated **Show more** accumulation, server `q`, `Set<itemUpholsteryClientId>` selection surviving pages/search, reconciliation of stale selections (drop ids no longer present after refetch *only* on explicit refresh/refetch, never mid-navigation), selected-total-meters derivation. Thin wrappers `use-shortage-detail.controller.ts` (route 8 + Order footer) and `use-order-detail.controller.ts` (route 3 + Received footer).

8. **Providers**: `UpholsteryOrderingProvider`, `ShortageDetailProvider`, `OrderDetailProvider` — context shells (per `23_providers.md`).

9. **Components** (`data-testid` on all feature-critical elements):
   - `UpholsteryOrderingHeader` (back + `SearchBar` with `showSortButton={false} showFilterButton={false}`, mode pills via `BoxPicker` collapsing on `isCompact`).
   - `ShortageCard` (wraps `TaskListCard`-style layout or a dedicated card; bottom quick action mirrors `PendingUpholsteryCard`'s `bottomAction`).
   - `OrderCard` (image/name/code/ordered meters/state pill/date/receive quick action).
   - `OrderingItemCard` (shared, selectable): based on `TaskListCard` visual language but **replaces the three-dot menu with a thumb-comfortable selection pill**; image tap → image viewer; body tap → `TASK_DETAIL_SURFACE_ID`; shows due date + `amount_meters` lower-right; accessible selected state (`aria-pressed`).
   - Detail headers/footers (owned, scroll-aware via `isCompact`/`isHidden`), empty/error/skeleton states.

10. **Forms** (`09_forms.md`, `37_keyboard_aware_inputs.md`): `CreateOrderForm` (positive-decimal quantity; prefill from shortage total or selected sum), `ReceiveOrderForm` (positive, `≤ remaining receivable`; prefill selected sum or remaining receivable). Numeric inputs float above keyboard.

11. **Pages** (slide composition mirroring `PendingUpholsterySlidePage`): `UpholsteryOrderingSlidePage`, `ShortageDetailSlidePage`, `OrderDetailSlidePage`, `CreateOrderSlidePage`, `ReceiveOrderSlidePage`. Each calls `useSurfaceHeader().setHeaderHidden(true)`, registers its scroll container, uses `PullToRefresh` + correct top offset, absolute footer hiding with `isCompact`.

12. **Surfaces + dynamic loading** — `surfaces.ts`: five `slide` registrations via `lazyWithPreload`; ids `UPHOLSTERY_ORDERING_SLIDE_ID`, `UPHOLSTERY_SHORTAGE_DETAIL_SLIDE_ID`, `UPHOLSTERY_ORDER_DETAIL_SLIDE_ID`, `UPHOLSTERY_CREATE_ORDER_SLIDE_ID`, `UPHOLSTERY_RECEIVE_ORDER_SLIDE_ID`. Surface-props typed via `useSurfaceProps`. Create success → `closeMany([CREATE, SHORTAGE_DETAIL])`; receive success → `closeTop` (+ reconcile). Register `upholsteryOrderingSurfaces` in `app/surface-registry.ts`.

13. **Public API** — `index.ts`: export the surface ids + `upholsteryOrderingSurfaces` (+ the few schema reuses). Export the four reused schemas/converters from `features/pending-upholstery/index.ts` (clarification 1).

14. **Home wiring** — `HomeView.tsx`: add the Ordering action using `useOrderNeedsCountQuery` → `needs_ordering_count`, opening `UPHOLSTERY_ORDERING_SLIDE_ID`.

15. **Tests**: vitest for DTO transforms, selection-survival/reconciliation, receive validation (`≤ remaining receivable`), CSV param builder; component tests for `OrderingItemCard` selection + quick actions. Playwright mobile-first then desktop: needs→create loop, orders→receive loop, mode-switch search preservation, selection across pages.

## Risks and mitigations

- Risk: `UpholsteryOrder`/`uor` prefix absent from the TS map **and** both prefix-map docs → `generateClientId` impossible without invented prefix.
  Mitigation: Step 1 adds it to all three sources before any mutation code (intention's explicit "plan the correct shared-contract update" directive).
- Risk: Optimistically imitating allocation produces wrong shortage/order numbers.
  Mitigation: Invalidation-first; only patch fields directly returned (`state`) or directly supplied (inputs). Server + refetch are authoritative.
- Risk: Selection lost across pagination/search/refetch before navigation.
  Mitigation: Keep selection by `item_upholstery.client_id` in a `Set`; never prune on background refetch — only reconcile stale ids on explicit user refresh, and never between footer tap and navigation.
- Risk: Order detail items keyed by `upholstery_id` (not order id) may show items beyond the specific order.
  Mitigation: Accept per intention line 218 (documented interim); isolate the query so swapping to an order-id filter later is a one-line change.
- Risk: Cross-feature schema reuse couples `upholstery-ordering` to `pending-upholstery`.
  Mitigation: Reuse via `pending-upholstery` public API only (clarification 1); both consume the identical backend task-row contract, so the coupling is the contract, not internals.
- Risk: `amount_meters` / `received_amount_meters` null after partial receipts breaks sums/validation.
  Mitigation: Null-coalesce to 0 in sums; compute remaining receivable defensively.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test -- --grep upholstery-ordering`: DTO, selection-survival, receive-validation, CSV-param unit tests pass.
- `npm run test:e2e:mobile` (Playwright mobile project): needs→create and orders→receive loops, mode-switch search preservation, cross-page selection pass.
- `npm run test:e2e:desktop`: same flows pass on desktop project.

## Review log

- `2026-06-16` `Claude (Opus 4.8)`: Initial plan authored from `upholstery_ordering_2.txt`; verified all eight endpoints, reused pending-upholstery + task/item/image schemas, identified missing `uor` client-ID prefix as the sole shared-contract prerequisite.

## Lifecycle transition

- Current state: `archived`
- Next state: `n/a`
- Transition owner: `Codex`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_upholstery_ordering_20260616.md`
- Archive record: `docs/architecture/archives/ARCHIVE_upholstery_ordering_20260616_1650.md`
