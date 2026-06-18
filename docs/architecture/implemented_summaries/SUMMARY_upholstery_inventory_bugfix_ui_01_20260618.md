# SUMMARY_upholstery_inventory_bugfix_ui_01_20260618

## Metadata

- Summary ID: `SUMMARY_upholstery_inventory_bugfix_ui_01_20260618`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_inventory_bugfix_ui_01_20260618.md`
- Source review: `docs/architecture/implemented_summaries/SUMMARY_upholstery_inventory_20260618.md`
- Implemented at (UTC): `2026-06-18T15:27:14Z`

## Implementation summary

- Reworked the upholstery inventory list from infinite pagination plus multi-condition filtering to three preloaded quick-filter queries: Favorites, In Stock, and Out of Stock.
- Added single-select quick-filter pills, disabled filter pills during search entry, and animated list transitions on filter changes using the same x-axis pattern as the upholstery picker.
- Removed the obsolete list page flow and moved debounce, filter state, active query selection, and refetch routing into the inventory list controller.
- Updated list API params from `inventory_condition` to `in_stock` / `favorite`.
- Fixed delete cache handling so detail cache removal happens only on successful delete; failed deletes leave the detail cache intact.
- Added inline stored-amount save failure feedback.
- Made the decimal formatting float boundary explicit.
- Added ordered amount display to inventory cards when ordered meters are positive.
- Updated the detail header with a circular image/avatar fallback, wrapped quantity overview and history in one shared card, and changed the footer CTA to inert `Edit`.
- Added the missing `itemUpholsteryKeys.all` invalidation test assertion.

## Verification

- `npm run typecheck`: passed.
- `npm run test:unit --workspace managerbeyo-app-managers -- upholstery-inventory`: passed, 3 files / 6 tests.

## Notes

- Manual browser validation was not run in this implementation pass.
- History remains a placeholder by design.
