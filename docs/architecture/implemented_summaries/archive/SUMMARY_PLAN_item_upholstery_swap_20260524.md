# SUMMARY_PLAN_item_upholstery_swap_20260524

## Metadata

- Summary ID: `SUMMARY_PLAN_item_upholstery_swap_20260524`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-24T20:30:30Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_upholstery_swap_20260524.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a dedicated `PATCH /api/v1/item-upholsteries/{client_id}` API client and `useUpdateItemUpholstery` mutation hook for swapping the linked upholstery from task detail.
- Wired the task-detail controller and upholstery section so the upholstery field is interactive, invalidates the task-detail query after mutation settle, and disables itself while a swap is pending or the active requirement is already `completed`.
- Added deterministic test coverage for the new swap path with a focused Vitest hook test and a Playwright task-detail flow that opens a task card, swaps upholstery, and asserts the PATCH payload.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/update-item-upholstery.ts`: new PATCH API client with runtime validation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item-upholstery.ts`: new mutation hook with task-detail invalidation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/index.ts`: exported the new action hook.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/controllers/use-task-detail.controller.ts`: exposed `updateItemUpholstery` through the task-detail controller.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskUpholsterySection.tsx`: enabled the field, added the `testId`, guarded completed/pending states, and wired `onChange` to the swap mutation.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item-upholstery.test.ts`: added the mutation invalidation unit test.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/upholstery-swap.spec.ts`: added desktop/mobile task-detail swap coverage with mocked detail and upholstery endpoints.

## Contract adherence

- `architecture/04_api_client.md`: the new network call stays in the feature API layer and uses the shared `apiClient.patch` envelope-validation pattern.
- `architecture/05_server_state.md` and `architecture/08_hooks.md`: mutation side effects stay in the action hook and invalidate server state on settle rather than attempting an optimistic swap.
- `architecture/15_feature_structure.md` and `architecture/17_testing.md`: file placement follows the existing feature API/action/controller/component split, with colocated hook tests and focused Playwright coverage for the user-facing flow.

## Validation evidence

- `npm run typecheck`: pass
- `npx vitest run src/features/items/actions/use-update-item-upholstery.test.ts`: pass
- `npx playwright test tests/playwright/features/tasks/upholstery-swap.spec.ts --project=desktop`: pass
- `npx playwright test tests/playwright/features/tasks/upholstery-swap.spec.ts --project=mobile`: pass

## Known gaps or deferred items

- The detail swap flow is covered through mocked task-detail and upholstery endpoints in Playwright; it does not assert a real backend swap against shared seeded data.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_item_upholstery_swap_20260524_2030.md`
