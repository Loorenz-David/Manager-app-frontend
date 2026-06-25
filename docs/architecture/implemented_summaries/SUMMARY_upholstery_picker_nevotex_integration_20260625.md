# SUMMARY_upholstery_picker_nevotex_integration_20260625

## Metadata

- Summary ID: `SUMMARY_upholstery_picker_nevotex_integration_20260625`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_picker_nevotex_integration_20260625.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_nevotex_and_inline_category_20260625.md`
- Implemented at (UTC): `2026-06-25T10:35:45Z`

## Implementation summary

- Extended the upholstery picker search flow to query Nevotex in parallel with the existing database search, merge results with database-first name deduplication, and assign stable frontend `client_id` values to Nevotex candidates.
- Added Nevotex-aware selection and favorite flows: selecting a Nevotex item now creates it in the background after close, and favoriting a Nevotex item runs create-then-favorite sequentially with optimistic UI state.
- Updated the upholstery API boundary to accept the backend's new nullable/raw fields (`client_id`, `favorite`, `origin`) and normalized Nevotex meter values so the shared schema can parse both external and database responses.
- Kept existing database-only reorder and favorite flows typed against non-null controller records so the nullable API changes stay at the edge of the package.

## Verification

- `npm run typecheck`: passed.

## Notes

- Playwright and manual runtime validation were not run in this lifecycle pass.
- `current_stored_amount_meters` is normalized from `number | string | null` to `string | null` at parse time because Nevotex currently returns `0` as a number while stored upholstery responses use decimal strings.
