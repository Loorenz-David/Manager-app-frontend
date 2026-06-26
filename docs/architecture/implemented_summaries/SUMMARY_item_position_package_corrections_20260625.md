# SUMMARY_item_position_package_corrections_20260625

## Metadata

- Summary ID: `SUMMARY_item_position_package_corrections_20260625`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_position_package_corrections_20260625.md`
- Implemented at (UTC): `2026-06-25T18:28:05Z`

## Implementation summary

- Restored real lazy surface loading in both apps by replacing the eager `ItemPositionSheetPage` static imports with dynamic `import("@beyo/items")` factories inside `lazyWithPreload`.
- Moved the workers `useUpdateItem` mutation hook from `features/task_steps/actions/` to `features/items/actions/`, and updated the task-step detail controller to import it from the item feature.
- Removed the workers `surface-ids.ts` re-export indirection for the shared item-position surface ID/types, updated `surfaces.ts` to import the ID directly from `@beyo/items`, and dropped the now-unneeded public re-exports from `features/task_steps/index.ts`.

## Verification

- `npm run typecheck`: passed.

## Notes

- Runtime/manual validation and Playwright were not run in this lifecycle pass.
