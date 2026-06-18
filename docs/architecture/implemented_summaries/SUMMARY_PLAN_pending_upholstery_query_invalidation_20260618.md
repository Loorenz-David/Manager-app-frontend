# SUMMARY_PLAN_pending_upholstery_query_invalidation_20260618

## Metadata

- Summary ID: `SUMMARY_PLAN_pending_upholstery_query_invalidation_20260618`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-18T10:41:55Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_pending_upholstery_query_invalidation_20260618.md`
- Related debug plan (optional): `—`

## What was implemented

- Added pending-upholstery query invalidation to `useUpdateItemUpholstery` so changing an existing upholstery selection now marks the pending list and counts stale.
- Kept the change scoped to the item-upholstery update mutation, matching the existing invalidation pattern already used by create and quantity mutations.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item-upholstery.ts`: imported `pendingSeatUpholsteryKeys` and invalidated `pendingSeatUpholsteryKeys.all` in `onSettled`.

## Contract adherence

- Followed the existing query invalidation pattern already established in `use-create-item-upholstery.ts` and `use-set-upholstery-quantity.ts`.
- Kept the fix isolated to the planned hook without changing controller, component, or optimistic-update behavior.

## Validation evidence

- `npm run typecheck`: pass
- `npm run test:unit`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- Manual UI verification of the back-navigation refresh flow was not run in this pass.
- No additional tests were added because the plan scoped this as a targeted invalidation fix.

## Handoff notes (if needed)

- Related backend handoff in repo context: `docs/handoff/to_backend/HANDOFF_TO_BACKEND_refresh_token_cookie_scope_collision_20260618.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_pending_upholstery_query_invalidation_20260618_1041.md`
