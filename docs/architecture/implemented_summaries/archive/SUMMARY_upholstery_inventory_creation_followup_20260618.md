# SUMMARY_upholstery_inventory_creation_followup_20260618

## Metadata

- Summary ID: `SUMMARY_upholstery_inventory_creation_followup_20260618`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_inventory_creation_followup_20260618.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_update_endpoints_20260618.md`
- Implemented at (UTC): `2026-06-18T16:40:54Z`

## Implementation summary

- Reworked the upholstery inventory creation slide to use `useSurfaceHeader`, `Controller`, and `useWatch`, while preserving create-mode validation and backend error display.
- Added available-meter derivation from stored minus in-need meters, wired through list/detail view models, list cards, and the detail quantity overview badges.
- Added support for `current_amount_in_need_meters` in the list response schema and exposed available quantity display flags from the transformers.
- Added update API functions for upholstery fields and inventory planning fields, plus a split mutation hook that only PATCHes changed fields and refreshes list/detail queries after mutation settlement.
- Reused the creation slide as an edit slide opened from the detail footer Edit action, with prefilled fields, hidden stored amount, no-op close on unchanged submit, and save error handling.

## Verification

- `npm run typecheck`: passed.

## Notes

- Edit mode intentionally does not update `current_stored_amount_meters`; the existing stored-amount editor remains the owner of that workflow.
- `PATCH /api/v1/upholsteries/{client_id}` receives changed upholstery fields, while `PATCH /api/v1/upholstery-inventories/{client_id}` receives changed planning fields.
