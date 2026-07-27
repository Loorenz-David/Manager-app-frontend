# SUMMARY_PLAN_inventory_card_stored_amount_add_20260622

## Metadata

- Summary ID: `SUMMARY_PLAN_inventory_card_stored_amount_add_20260622`
- Source plan: `docs/architecture/archives/implementation/PLAN_inventory_card_stored_amount_add_20260622.md`
- Implemented at (UTC): `2026-06-22T11:25:28Z`

## Implementation summary

- Extended `InventoryListCardViewModel` with the raw `currentStoredAmountMeters` field and populated it from the inventory partial response transformer.
- Simplified the inventory list card to emphasize only the stored amount and added a direct `+` action button that opens the add-amount sheet from the card itself.
- Added `openAddAmount(card)` to the inventory list controller so the card can open `STORED_AMOUNT_SHEET_ID` with the correct `inventoryId`, `currentStoredAmountMeters`, `imageUrl`, `upholsteryName`, and `storedDisplay` prefill.
- Wired the new `onTapAdd` callback through `InventoryListView` into each inventory card.

## Verification

- `npm run typecheck`: passed.

## Notes

- The list-card view model still retains `availableDisplay`, `availableIsNegative`, and `orderedDisplay`; this change only removes them from the card UI.
