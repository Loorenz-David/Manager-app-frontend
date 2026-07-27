# SUMMARY_upholstery_picker_nevotex_corrections_20260625

## Metadata

- Summary ID: `SUMMARY_upholstery_picker_nevotex_corrections_20260625`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_picker_nevotex_corrections_20260625.md`
- Implemented at (UTC): `2026-06-25T10:47:44Z`
- Parent plan: `docs/architecture/archives/implementation/PLAN_upholstery_picker_nevotex_integration_20260625.md`

## Implementation summary

- Moved the picker merge path behind a stable `useMemo`, made Nevotex client-id assignment callback-stable, and aligned the Nevotex identity key with the merge dedup key (`name.trim().toLowerCase()`).
- Fixed the Nevotex favorite optimistic-state race by seeding picker list caches on create success and keeping the optimistic overlay alive until the Nevotex item disappears from the merged Nevotex set.
- Tightened the API boundary with `UpholsteryDbRecordSchema` for single-record database responses and extracted the shared upholstery list envelope schema into `types.ts`.
- Removed the dead `client_id === null` success guard in the favorite action, since null database records now fail at parse time instead of being tolerated downstream.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
