# SUMMARY_item_position_pill_and_sheet_package_20260625

## Metadata

- Summary ID: `SUMMARY_item_position_pill_and_sheet_package_20260625`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_position_pill_and_sheet_package_20260625.md`
- Implemented at (UTC): `2026-06-25T18:03:08Z`

## Implementation summary

- Moved the shared item-position surface contract into `@beyo/items`, including the surface ID, surface prop types, raw `updateItem` API function, clickable `ItemPositionPill`, and reusable `ItemPositionSheetPage`.
- Updated the managers app to consume the package-owned sheet page and mutation API, moved `openPositionSheet` into the task-detail controller, and removed the old local page and local raw API file.
- Added workers-app support for editing seat positions by registering the shared sheet surface, adding a task-step `useUpdateItem` mutation hook, wiring `openPositionSheet` into the task-step detail controller, and rendering the shared position pill with a fallback `−` label for seat items without a stored position.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
