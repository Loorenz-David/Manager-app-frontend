# SUMMARY_upholstery_inventory_creation_20260618

## Metadata

- Summary ID: `SUMMARY_upholstery_inventory_creation_20260618`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_inventory_creation_20260618.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_route_create_upholstery_contract_20260618.md`
- Implemented at (UTC): `2026-06-18T15:56:45Z`

## Implementation summary

- Added the upholstery inventory creation data layer with `CreateInventoryFormSchema`, `createUpholsteryInventory`, and `useCreateInventory`.
- Added a new creation slide surface in the upholstery inventory feature and preloading support for it.
- Implemented a single-step creation slide with inline validation, image preview, favorite toggle, absolute footer actions, backend conflict/error surfacing, and success close behavior.
- Added an inventory creation FAB to the upholstery inventory page, matching the existing task-creation motion pattern with one upward sub-action.
- Kept list refresh behavior centralized through `invalidateAfterInventoryMutation(queryClient)` after create attempts.

## Verification

- `npm run typecheck`: passed.

## Notes

- The backend contract uses `PUT /api/v1/upholsteries`, which creates both the upholstery record and its linked inventory row atomically.
- The local implementation uses `SwitchCheckbox` for the favorite field because `BoxPicker` option icons are lowercase `icon` and the single-toggle interaction fits the existing primitive better.
