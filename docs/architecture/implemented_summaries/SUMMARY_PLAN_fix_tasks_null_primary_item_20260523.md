# SUMMARY_PLAN_fix_tasks_null_primary_item_20260523

## Metadata

- Summary ID: `SUMMARY_PLAN_fix_tasks_null_primary_item_20260523`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-23T10:33:06Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_fix_tasks_null_primary_item_20260523.md`
- Related debug plan (optional): `—`

## What was implemented

- Fixed the task list parsing path so tasks with `"primary_item": null` no longer break the paginated query or prevent cards from rendering.
- Hardened task normalization and the items store so item relations and list-image hydration are only applied when a primary item exists.
- Extended `BoxPicker` with a reusable `size` prop and applied the compact `xs` pill styling to the tasks state filters.
- Added a reusable `HorizontalScrollArea` primitive with a custom 1 px scrollbar indicator and replaced the native horizontal scrollbar in the tasks header.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`: made `primary_item` nullable in the raw list schema.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/store/items.store.ts`: narrowed stored item records to non-null items only.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/api/use-list-tasks-query.ts`: skipped item/image normalization for tasks without a primary item.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/box-picker/`: added `BoxPickerSize` and compact `xs` pill rendering.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/horizontal-scroll-area/`: added the new reusable horizontal scroll primitive.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TasksHeader.tsx`: switched the pill row to `HorizontalScrollArea` and `size="xs"`.

## Contract adherence

- `architecture/05_server_state.md`: the infinite query remains the source of server pagination while normalization is made tolerant to nullable relations.
- `architecture/06_client_state.md`: entity stores still hold normalized data by ID, with null relations filtered before insert.
- `architecture/07_components.md`: the scrollbar behavior was added as a standalone primitive rather than embedding bespoke DOM logic inside the tasks feature.
- `architecture/15_feature_structure.md`: task-specific fixes stayed inside the tasks feature, while shared UI behavior moved into `components/primitives`.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- Manual tasks-page verification: not run
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- The custom scrollbar thumb is display-only; dragging the thumb itself is still out of scope.
- No automated UI tests were added for the nullable `primary_item` case or the new scroll indicator.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_fix_tasks_null_primary_item_20260523.md`
