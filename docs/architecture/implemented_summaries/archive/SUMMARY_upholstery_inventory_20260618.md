# SUMMARY_upholstery_inventory_20260618

## Metadata

- Summary ID: `SUMMARY_upholstery_inventory_20260618`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_inventory_20260618.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_inventories_list_get_20260618.md`
- Implemented at (UTC): `2026-06-18T14:27:48Z`

## Implementation summary

- Added the managers-app upholstery inventory feature at `src/features/upholstery-inventory/`.
- Implemented list pagination, debounced search, condition filters including `ordered`, pull-to-refresh, load more, loading/empty states, cards, and card action placeholder sheet.
- Implemented detail slide with own header, condition display, quantity overview, history placeholder seam, scroll-reactive footer, stored amount editor sheet, and delete action sheet.
- Integrated backend endpoints:
  - `GET /api/v1/upholstery-inventories`
  - `GET /api/v1/upholstery-inventories/{client_id}`
  - `PATCH /api/v1/upholstery-inventories/{client_id}/current-stored-amount`
  - `DELETE /api/v1/upholstery-inventories/{client_id}`
- Added decimal-safe helpers based on `decimal.js`, shared condition derivation, and centralized invalidation after update/delete.
- Wired the More-tab navigation entry (`Uph inv`, Lucide `Spool`), route preload, router registration, and surface registry.

## Verification

- `npm run typecheck`: passed.
- `npm run test:unit --workspace managerbeyo-app-managers -- upholstery-inventory`: passed, 3 files / 6 tests.

## Notes

- Inventory history remains an intentionally isolated placeholder until the backend history contract exists.
- The stored-amount endpoint is called with the same `inv_...` inventory `client_id` used by list/detail/delete, treating the handoff's `uin_...` path-param note as a typo.
