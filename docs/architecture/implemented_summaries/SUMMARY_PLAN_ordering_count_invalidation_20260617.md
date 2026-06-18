# SUMMARY_PLAN_ordering_count_invalidation_20260617

## Metadata

- Summary ID: `SUMMARY_PLAN_ordering_count_invalidation_20260617`
- Status: `summarized`
- Owner agent: `Codex (GPT-5)`
- Created at (UTC): `2026-06-17T13:21:00Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_ordering_count_invalidation_20260617.md`

## What was implemented

- Added `pendingSeatUpholsteryKeys.counts()` invalidation to the managers-app create-order mutation so pending-seat home counts refetch after an upholstery order is created.
- Added the same `pendingSeatUpholsteryKeys.counts()` invalidation to the receive-order mutation so the home counts refetch after ordered upholstery is received.
- Kept the existing `upholsteryOrderingKeys.all`, `itemUpholsteryKeys.all`, and `upholsteryKeys.pickerLists()` invalidations unchanged.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-ordering/actions/use-create-upholstery-order.ts`: imported `pendingSeatUpholsteryKeys` and invalidated `counts()` in `onSettled`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-ordering/actions/use-receive-upholstery-order.ts`: imported `pendingSeatUpholsteryKeys` and invalidated `counts()` in `onSettled`.

## Contract adherence

- `architecture/16_feature_workflow.md`: kept the change at the action-hook layer without moving cache invalidation into controllers or components.
- `architecture/05_server_state.md`: used targeted TanStack Query invalidation on the affected related count key.
- `architecture/08_hooks.md`: preserved the existing action-hook mutation structure and extended only `onSettled` invalidation behavior.
- `task_system/frontend_contract_goal_mapping_guide.md`: limited implementation reads to the scoped action, query-key, and domain-type files needed to confirm existing behavior.

## Validation evidence

- `npm run typecheck`: pass.
- Manual runtime validation: not run in this pass.
- `npx playwright test --project=mobile`: not run.

## Known gaps or deferred items

- The home-count refresh behavior was not manually exercised against a live backend in this pass; the change is validated by query-key wiring and TypeScript only.

## Handoff notes

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_ordering_count_invalidation_20260617.md`
