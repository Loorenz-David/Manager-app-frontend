# SUMMARY_worker_stats_split_queries_and_range_20260718

## Metadata

- Summary ID: `SUMMARY_worker_stats_split_queries_and_range_20260718`
- Status: `summarized`
- Owner agent: `Codex`
- Implemented at (UTC): `2026-07-18T17:49:20Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_worker_stats_split_queries_and_range_20260718.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_endpoint_split_20260718.md`

## What was implemented

- Split worker stats into independent last-step, totals, and insights schemas, fetchers, query hooks, and query-key families.
- Added `useWorkerStatsRoster` to join independently arriving responses by `user.client_id`, preserve per-section loading/error state, and refetch all sections together.
- Reworked worker DTOs and cards so identity renders immediately, section skeletons fill independently, totals retain live ticking behavior, and totals tiles remain disabled until totals are available.
- Added local date-range state and a calendar range trigger to the worker stats slide; totals and daily-step drill-down requests send `date_from`/`date_to`, while point-in-time step/insight requests use their day semantics.
- Added range inheritance to the granularity slide and injected the calendar opener from the managers app through `surfaceOpeners`.
- Added the shared `skeleton-shimmer` style and updated the public stats package exports.

## Files changed

- `packages/stats/src/types.ts`, `packages/stats/src/api/`, `packages/stats/src/hooks/`: split contracts, requests, query hooks, and roster composition.
- `packages/stats/src/lib/worker-stats-dto.ts`, `packages/stats/src/components/WorkerStatsCard.tsx`: per-section view models and independent rendering states.
- `packages/stats/src/pages/WorkerStatsSlidePage.tsx`, `packages/stats/src/pages/WorkerStatsGranularitySlidePage.tsx`, `packages/stats/src/surface-ids.ts`: range selection, opener injection, and drill-down inheritance.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx`: calendar range picker wiring.
- `packages/styles/src/index.css`: global shimmer utility.
- `packages/stats/src/lib/worker-stats-dto.test.ts`, `packages/stats/src/components/WorkerStatsCard.test.tsx`: updated split-model and card coverage.

## Contract adherence

- `architecture/16_feature_workflow.md`: implemented bottom-up from typed schemas/API through hooks, components, pages, and app wiring.
- `architecture/05_server_state.md`: independent TanStack Query hooks with parameterized query keys and placeholder retention.
- `architecture/32_loading_skeletons.md`: centralized `skeleton-shimmer` utility reused by feature-shaped loading states.
- `architecture/35_shared_packages.md §13`: calendar surface opening is injected by the app through `WorkerStatsSurfaceOpeners`.

## Validation evidence

- `npm run typecheck`: passed.
- `npx vitest run --config packages/stats/vitest.config.ts`: passed, 7 files / 32 tests.
- Playwright worker-stats coverage: not run in this lifecycle pass.

## Known gaps or deferred items

- The plan’s requested Playwright scenarios and dedicated fetcher/roster MSW tests were not added in this pass; the existing stats unit suite and typecheck are green.
- `packages/stats/tsconfig.json` enables `skipLibCheck` to ignore existing third-party declaration conflicts from `@dnd-kit` and nested Vitest/Vite types.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_worker_stats_split_queries_and_range_20260718.md`
