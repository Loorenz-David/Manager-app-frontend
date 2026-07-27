# SUMMARY_shopify_inventory_location_box_picker_field_20260715

## Plan

- Plan ID: `PLAN_shopify_inventory_location_box_picker_field_20260715`
- Archived plan: `docs/architecture/archives/implementation/PLAN_shopify_inventory_location_box_picker_field_20260715.md`
- Intention plan: `docs/architecture/under_construction/intention/inventory_track_shopify.md`

## Outcome

Implemented per-shop Shopify inventory location selection in the product sync form. Each selected shop now renders a BoxPicker in the target step; selected locations create quantity-one inventory adjustments, inactive locations show activation guidance, and shop-specific error states remain non-blocking.

Remembered location selections are validated and stored independently per shop in localStorage, with stale location IDs filtered when restored. Existing submit and draft round-trip behavior remains intact.

## Main changes

- Rewrote `ShopifyProductSyncInventoryField` as a self-sustaining per-shop BoxPicker field.
- Added `shopify-product-sync-inventory-storage.ts` with per-shop Zod-validated persistence.
- Removed the standalone inventory staged step and rendered one inventory field per selected shop in the target step.
- Added storage and component tests covering selection toggles, per-shop isolation, restoration, inactive locations, domains, and error statuses.

## Validation

- `npm run typecheck` — passed with zero TypeScript errors.
- `npm run test:shopify` — passed, 35 files / 101 tests.

## Lifecycle

- Implementation status: `archived`
- Summary status: `implemented`
- Archived at (UTC): `2026-07-15T07:11:24Z`
