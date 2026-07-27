# SUMMARY_PLAN_pending_seat_upholstery_management_20260615

## Metadata

- Summary ID: `SUMMARY_PLAN_pending_seat_upholstery_management_20260615`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T15:54:05Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_pending_seat_upholstery_management_20260615.md`
- Intention plan: `docs/architecture/under_construction/intention/upholstery_management_2.txt`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_seat_tasks_pending_upholstery_20260615.md`

## What was implemented

- Added the managers-app `pending-upholstery` feature with endpoint DTO schemas, fetch functions, React Query hooks, count formatting, DTO/view-model mapping, controller/provider, slide page, header, card, empty/error/loading states, and a Coming soon task-actions sheet.
- Registered `pending-upholstery-slide` and `pending-upholstery-task-actions-sheet` in the managers surface registry.
- Updated the manager home screen with a counts-backed `Select upholstery (N)` launcher.
- Extended `TaskListCard` with an optional `bottomAction` slot used by the pending upholstery direct action row.
- Wired missing-selection rows to the existing upholstery picker and missing-quantity rows to the existing upholstery amount sheet using the backend `pending_upholstery_reason` and `item_upholstery_id`.
- Added pending-seat query invalidation to the base item upholstery create and quantity mutation hooks so existing generic surfaces keep the pending list and home count synchronized.
- Added a targeted unit test for the compact count formatter.
- Fixed the shared `ScrollVisibilityProvider` typecheck regression by passing the required `topOffset` option to `useScrollState`.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/**`: new feature implementation.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`: registered pending upholstery surfaces.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx`: added count-backed launcher.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskListCard.tsx`: added optional bottom action slot.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-create-item-upholstery.ts`: invalidates pending upholstery keys on settle.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-set-upholstery-quantity.ts`: invalidates pending upholstery keys on settle.
- `packages/ui/src/components/primitives/scroll-visibility/ScrollVisibilityProvider.tsx`: supplied default `topOffset`.

## Validation evidence

- `npm run typecheck`: pass.
- `npm run test:unit -- src/features/pending-upholstery/lib/format-compact-count.test.ts`: pass, 8 tests.

## Known gaps or deferred items

- Full interaction tests from the implementation plan were not all added in this turn; the implemented coverage is focused on the new formatter and the required typecheck gate.
- Manual browser validation of header/footer hide-on-scroll, network query combinations, and picker/amount-sheet interactions is still recommended.

## Handoff notes

- No backend follow-up is required. The frontend uses the delivered `item_upholstery_id: string | null` contract.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_pending_seat_upholstery_management_20260615_1554.md`
