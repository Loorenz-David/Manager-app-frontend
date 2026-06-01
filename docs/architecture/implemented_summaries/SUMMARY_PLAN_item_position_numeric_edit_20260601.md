# SUMMARY_PLAN_item_position_numeric_edit_20260601

## Metadata

- Summary ID: `SUMMARY_PLAN_item_position_numeric_edit_20260601`
- Status: `summarized`
- Owner agent: `codex`
- Created at (UTC): `2026-06-01T07:39:33Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_position_numeric_edit_20260601.md`

## What was implemented

- Converted task-creation item position form typing from optional string to optional non-negative integer in composed item field schema, including empty-value preprocessing.
- Updated `ItemPositionField` to use numeric keyboard hints and React Hook Form number coercion (`valueAsNumber`) so form state stores a number.
- Updated all three task-creation form defaults so `item.item_position` initializes as `undefined` (not empty string).
- Updated task payload normalization to stringify numeric `item_position` values before calling task APIs.
- Added a new task surface (`item-position-sheet`) with typed props and lazy registration.
- Added `openPositionSheet()` in task-detail flow and wired task-detail category row position display into a tappable button surface opener.
- Added `ItemPositionSheetPage` with current-position prefill, numeric-only editing, optimistic close on save, and reopen-on-error behavior matching existing quantity sheet patterns.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/types.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemPositionField.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/InternalFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/PreOrderFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/ReturnFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/lib/normalize-task-form-payload.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-task-detail.flow.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskBodyCategoryRow.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemPositionSheetPage.tsx`

## Contract adherence

- `architecture/09_forms.md`: kept validation and conversion at the schema/form boundary and preserved DTO conversion at payload normalization.
- `architecture/24_dto.md`: retained API contract as `string` for `item_position` while using numeric form-state typing.
- `architecture/28_surfaces.md`: added and registered a new sheet surface through existing surface system APIs.
- `architecture/30_dynamic_loading.md`: used `lazyWithPreload` surface page loading pattern in task surfaces.
- `architecture/16_feature_workflow.md`: applied changes in type/form/payload flow first, then controller-flow-to-UI surface wiring.

## Validation evidence

- `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- No Playwright coverage was added for the new position sheet path in this implementation pass.
- Manual runtime smoke validation (mobile keyboard behavior and network-error reopen path) was not executed in this pass.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_item_position_numeric_edit_20260601_0739.md`
