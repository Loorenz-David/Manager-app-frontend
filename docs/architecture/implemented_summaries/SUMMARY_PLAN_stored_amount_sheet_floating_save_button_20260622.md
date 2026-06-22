# SUMMARY_PLAN_stored_amount_sheet_floating_save_button_20260622

## Metadata

- Summary ID: `SUMMARY_PLAN_stored_amount_sheet_floating_save_button_20260622`
- Source plan: `docs/architecture/archives/implementation/PLAN_stored_amount_sheet_floating_save_button_20260622.md`
- Implemented at (UTC): `2026-06-22T11:46:51Z`

## Implementation summary

- Moved the stored-amount sheet’s save button and inline error into `FloatingKeyboardBar.renderControls`, extracted the shared save logic into `handleSave`, and added `onMouseDown={preventFocusSteal}` so the save action stays clamped above the keyboard without focus flicker.
- Reworked the inventory list card’s stored-amount action into a single composite button at the bottom right, combining the stored display and the `+` extension into one larger tap target.
- Increased the inventory header height from `56px` to `80px`, pushed both animated header states down with a `top-6` inset, and updated the inventory body’s padding, min-height, and pull-to-refresh indicator offset to stay aligned with the taller header.

## Verification

- `npm run typecheck`: passed.

## Notes

- The underlying save mutation, decimal-addition behavior, success close, and error handling remain unchanged; only the control placement and trigger presentation changed.
