# SUMMARY_upholstery_ordering_20260616

## Metadata

- Summary ID: `SUMMARY_upholstery_ordering_20260616`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-16T16:50:32Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_ordering_20260616.md`
- Source intention: `docs/architecture/under_construction/intention/upholstery_ordering_2.txt`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_ordering_routers_contract_20260616.md`

## What was implemented

- Added the `features/upholstery-ordering` module with backend-backed needs/orders lists, counts, item-detail pagination, create-order mutation, receive-order mutation, DTO transforms, controllers, slide pages, and surface registrations.
- Added the manager Home `Ordering (n)` entry point using `/api/v1/upholstery-order-needs/count`.
- Added `UpholsteryOrder: uor` to the frontend client-id contract and frontend backend-prefix mirror.
- Reused pending-upholstery task/item/image schemas and converters through the pending-upholstery public API.
- Follow-up corrections from `PLAN_upholstery_ordering_corrections_20260616`:
  - detail-item refresh now refetches every loaded page and only drops selections whose `item_upholstery.client_id` truly disappears from refreshed data
  - create/receive amount forms use `FloatingKeyboardBar`, keeping the submit action above the mobile keyboard
  - receive mutations now patch both `state` and `received_amount_meters` optimistically in active order-list caches
  - order detail now derives live order aggregates from the orders-list cache so remaining/received context stays current after partial receipts
  - pending-upholstery cards now branch correctly between create (`PUT`) and update (`PATCH`) when an `itemUpholsteryId` already exists
  - added unit coverage for DTO transforms, detail-page refresh reconciliation helpers, and amount validation guards

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-ordering/`: new feature module.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`: registered upholstery-ordering slide surfaces.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx`: added the Ordering home action and count query.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/index.ts`: exported reused schemas/converters.
- `packages/lib/src/client-id.ts`: added `UpholsteryOrder` prefix.
- `docs/architecture/backend/tables/client_id_prefix_map.md`: mirrored the `uor` prefix.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/actions/use-pending-upholstery-update.ts`: added the optimistic PATCH action for existing `ItemUpholstery` rows.

## Contract adherence

- Backend handoff routes are consumed as documented: needs count/list/items, orders count/list/items, create order, and receive order.
- CSV query params are used for order states, upholstery IDs, and requirement states.
- Create/receive use invalidation-first reconciliation; receive also applies a light optimistic list patch for `state` and `received_amount_meters`.
- Selection identity is `item_upholstery.client_id`, preserved across pagination and refreshed against the union of all loaded pages instead of only the first page.
- Keyboard handling follows `37_keyboard_aware_inputs.md` via `FloatingKeyboardBar`, not page-local viewport listeners.

## Validation evidence

- `npm run typecheck`: pass.
- `npm run test:unit --workspace managerbeyo-app-managers -- --maxWorkers=1 src/features/upholstery-ordering/lib/upholstery-ordering-dto.test.ts src/features/upholstery-ordering/controllers/use-detail-items.controller.test.ts src/features/upholstery-ordering/pages/OrderFormSlidePages.test.ts`: pass.
- `npm run test`: not run.
- `npm run test:e2e:mobile`: not run; user requested typecheck gate only.
- `npm run test:e2e:desktop`: not run; user requested typecheck gate only.

## Known gaps or deferred items

- Order detail still queries by `upholstery_id` + `requirement_states=ordered`, matching the documented interim backend limitation.
- Create-order optimism does not fabricate shortage/order allocation results; server refetch remains authoritative.
- Playwright coverage for the needs/create loop, orders/receive loop, keyboard visibility, and mode-switch search preservation was not added in this pass.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_upholstery_ordering_20260616_1650.md`
