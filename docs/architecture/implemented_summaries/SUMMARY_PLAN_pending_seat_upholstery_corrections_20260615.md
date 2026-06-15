# SUMMARY_PLAN_pending_seat_upholstery_corrections_20260615

## Metadata

- Summary ID: `SUMMARY_PLAN_pending_seat_upholstery_corrections_20260615`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T16:31:00Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_pending_seat_upholstery_corrections_20260615.md`
- Parent plan: `docs/architecture/archives/implementation/PLAN_pending_seat_upholstery_management_20260615.md`
- Parent summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_pending_seat_upholstery_management_20260615.md`

## What was implemented

- Kept the home `Select upholstery` launcher tappable when counts fail by removing the disabled state from the button.
- Added optimistic pending-seat list removal and rollback to `useSetUpholsteryQuantity`, including a clamped `missing_quantity_total` decrement.
- Renamed the pending filter pill label from `Missing amount` to `Missing quantity`.
- Removed the dead `isMutationPending` field from the pending upholstery card view model, DTO mapper, controller mapping, and card pending expression.
- Fixed JSX casing in the existing inline SVG inside `HomeView.tsx` so the required typecheck gate passes.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-set-upholstery-quantity.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/components/PendingUpholsteryHeader.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/components/PendingUpholsteryCard.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/controllers/use-pending-upholstery.controller.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/lib/pending-seat-dto.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/pending-upholstery/types.ts`

## Validation evidence

- `npm run typecheck`: pass.
- `npm run test:unit -- src/features/pending-upholstery/`: pass, 8 tests.

## Known gaps or deferred items

- Manual validation remains recommended for the amount-sheet optimistic disappearance and rollback paths because those require backend interaction or request failure simulation.
- `SearchBar` in this workspace does not expose `showSortButton`/`showFilterButton`; it suppresses action icons by only rendering buttons when handler props are provided. The pending header passes no sort/filter handlers, so the acceptance criterion is already met without changing the primitive API.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_pending_seat_upholstery_corrections_20260615_1631.md`
