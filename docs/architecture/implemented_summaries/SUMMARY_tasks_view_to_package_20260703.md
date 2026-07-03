# SUMMARY_tasks_view_to_package_20260703

## Metadata

- Summary ID: `SUMMARY_tasks_view_to_package_20260703`
- Source plan: `docs/architecture/archives/implementation/PLAN_tasks_view_to_package_20260703.md`
- Implemented at (UTC): `2026-07-03T16:28:43Z`

## Implementation summary

- Moved the managers task list route-entry stack into `@beyo/tasks`, including the page loader, provider, controller, flow, header, and view components.
- Replaced the managers app task-list shadow stores with package-owned UI filter state plus direct derivation from TanStack Query cache data and in-memory lookup maps.
- Updated `@beyo/tasks` surface IDs, task list view-model exports, and optimistic `useCreateTask` handling so the managers app can consume the package boundary directly.
- Switched the managers app tasks page and task feature exports to load the package route entry, re-export package APIs, and keep only app-local surface registration.
- Removed the obsolete managers app task list files and the three deleted server-state Zustand stores.

## Verification

- `npm run typecheck`: passed.

## Notes

- `npx playwright test --project=mobile` was not run in this pass.
- The managers app still keeps its local task domain `types.ts`; that cleanup remains explicitly out of scope for this plan.
