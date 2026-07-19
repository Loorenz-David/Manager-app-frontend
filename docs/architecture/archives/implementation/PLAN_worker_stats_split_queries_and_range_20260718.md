# PLAN_worker_stats_split_queries_and_range_20260718

## Metadata

- Plan ID: `PLAN_worker_stats_split_queries_and_range_20260718`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-18T17:12:53Z`
- Last updated at (UTC): `2026-07-18T17:49:20Z`
- Related issue/ticket: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_endpoint_split_20260718.md`
- Intention plan: `n/a — driven directly by the backend handoff above`

## Goal and intent

- Goal: migrate `@beyo/stats` off the removed combined roster payload onto the three split endpoints (`/last-interacted-steps`, `/totals`, `/insights`) fetched **in parallel and rendered independently**, and add a date-range selector to `WorkerStatsSlidePage` whose selection also governs the granularity drill-down.
- Business/user intent: managers see worker cards the instant the fastest request (expected: last-interacted-steps) lands, with gradient (shimmer) skeletons standing in for the sections whose request is still in flight; managers can retarget the totals to a date range from a header button (default: the user's current date, labeled "Today").
- Non-goals:
  - No polling/refresh-cadence changes (the handoff suggests differing cadences; current model is pull-to-refresh + local ticking and stays that way).
  - No modeling of the new `batch` object beyond the existing tolerant `z.unknown()` passthrough.
  - No changes to `WorkerStatsInsightsSheetPage` content or insight copy.
  - No `time_quality` / `estimated_fill` fields (future handoff).

## Scope

- In scope:
  - `packages/stats`: types split, three query-key families, three fetchers, three query hooks, a roster-composition hook, DTO rework into per-section view models, `WorkerStatsCard` per-section skeleton rendering, `WorkerStatsSlidePage` range state + header range button, `WorkerStatsGranularitySlidePage` range inheritance, `surfaceOpeners` introduction for the calendar picker, public API updates.
  - `packages/styles`: add the global `skeleton-shimmer` utility from `32_loading_skeletons.md` (verified absent today — existing skeletons use `animate-pulse bg-muted`).
  - `apps/managers-app` `HomeView.WorkerStatsHomeTrigger`: inject `surfaceOpeners` when opening `WORKER_STATS_SLIDE_SURFACE_ID` (mirrors the existing post-handling wiring at `HomeView.tsx:196-198`).
- Out of scope:
  - Backend changes; drill-down endpoint contract (unchanged per handoff).
  - Other consumers: verified none — `useWorkerStatsQuery` / `WorkerStatsRow` / `fetchWorkerStats` are consumed only inside `packages/stats` (HomeView imports only the surface ID + preload).
- Assumptions:
  - The bottom surface for picking the range is the **existing** `CalendarRangePickerPage` sheet from `@beyo/task-creation` (`CALENDAR_RANGE_PICKER_SURFACE_ID`, already registered in the managers app via `taskCreationSurfaces`). `DateRangeFieldTrigger` is a form-row trigger, not a calendar; the established pattern (TaskDeliveryDateField → CalendarRangePickerPage) is that the trigger opens this sheet. The header button will be a compact trigger styled after `DateRangeFieldTrigger` (from/to segments + calendar icon) that opens that sheet — see Clarification 2.
  - The three responses share the identical worker set/ordering, but composition still joins by `user.client_id` (handoff instruction), never positionally.
  - "Current user date" default = the user's **local** calendar date (see the UTC-bucketing note under Risks).
  - **Date range is treated as already live on the backend** (per user direction 2026-07-18): `/totals` and `/{user_id}/daily-steps` accept a `date_from`/`date_to` pair (`YYYY-MM-DD`), the param names confirmed by the user. They are defined once as a shared constant in the fetchers. A single-day selection sends `date_from === date_to`; the default (today) sends today for both. `work_date` (singular) is retained only where a true point-in-time day is needed: `/last-interacted-steps` (a "now" snapshot — no range) and `/insights` (own daily baseline — see Clarification 2).

## Clarifications required

- [x] **Range params on the backend — RESOLVED 2026-07-18 (user):** build as if the range is already implemented, using the user-confirmed param names `date_from`/`date_to`. Verification note kept for the record: live source `backend/app/beyo_manager/routers/api_v1/worker_stats.py` today exposes only a single `work_date` on all four routes, and the handoff defers the range to a later handoff — see Risks for the interim-staleness guard.
- [x] **Header button vs `DateRangeFieldTrigger` literal reading — resolved during implementation.** The compact header range button opens the existing `CalendarRangePickerPage` sheet through the injected `surfaceOpeners.openCalendarRangePicker` callback.
- [x] **Insights under a non-today range — resolved during implementation.** `/insights` uses the range end date as its single-day baseline date; the insight band is hidden for multi-day ranges.
- [x] **Stat tiles before totals arrive — resolved during implementation.** Worked/Paused/Completed render shimmer values and remain disabled until the totals section is ready.

## Acceptance criteria

1. `WorkerStatsSlidePage` fires three requests in parallel (`/last-interacted-steps`, `/totals`, `/insights`) with a shared `limit`/`offset` and the selected date (range → `/totals`; single day → `/last-interacted-steps` + `/insights`); the old combined call is gone and no code references `daily_stats`/`running`/`insights` on the last-interacted-steps response.
2. Worker cards appear as soon as the **first** of the three responses resolves; each section not yet resolved (state chip + step row / totals tiles / insight band) renders a gradient `skeleton-shimmer` placeholder, and fills in independently when its response lands, without remounting the card.
3. Live ticking totals behave exactly as before once `/totals` arrives (settled + running, 1×-per-state tick off `running.as_of`).
4. The page header shows a right-aligned range button; with the default selection (user's current date) it reads "Today"; any side of the range equal to today renders "Today", other dates render formatted dates.
5. Tapping the range button opens the calendar range sheet via an injected `surfaceOpeners.openCalendarRangePicker` — `packages/stats` contains **zero** direct `openSurface`/`useSurfaceStore` calls for this new surface (35 §13).
6. Changing the range refetches `/totals` with `date_from`/`date_to` and the roster totals reflect the selected window (including a multi-day span); `/last-interacted-steps` remains a "now" snapshot (no date semantics).
7. Opening the granularity slide passes the currently selected range; `useWorkerDailyStepsQuery` requests inherit it via `date_from`/`date_to`, so the drill-down covers the same window as the totals it drills into.
8. `npm run typecheck` zero errors; stats vitest suite green; Playwright mobile + desktop specs for the worker-stats flow green.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer/altitude baseline (core).
- `architecture/02_types.md`: Zod schema conventions for the three new response schemas (core).
- `architecture/04_api_client.md` (+ `04_api_client_local.md`): `apiClient.get` with schema + params; local error envelope (core).
- `architecture/05_server_state.md`: three independent `useQuery` hooks, query key discipline, `placeholderData` retention (core).
- `architecture/06_client_state.md`: page-local range state stays in `useState` — no store (core).
- `architecture/08_hooks.md`: roster-composition hook shape (multi-query aggregation) (core).
- `architecture/13_errors.md`: per-section failure vs page-level failure handling (core).
- `architecture/15_feature_structure.md`: file placement inside the package (core).
- `architecture/07_components.md`: `WorkerStatsCard` per-section rendering.
- `architecture/24_dto.md`: per-section view model transformers.
- `architecture/28_surfaces.md` (+ `28_surfaces_local.md`): sheet surface type for the range picker (`drawer` excluded locally).
- `architecture/32_loading_skeletons.md`: the `skeleton-shimmer` global utility to add to `@beyo/styles` and reuse ("gradient loading style").
- `architecture/31_animations.md`: skeleton→content transition, reduced-motion.
- `architecture/35_shared_packages.md` §13/§14: `surfaceOpeners` injection for the calendar picker; page loader functions already comply — no static page exports added.
- `architecture/17_testing.md`: vitest scope for DTO/card/hooks.
- `architecture/34_runtime_validation.md` (+ `34_runtime_validation_local.md`): Playwright fixture paths, mobile-first pass, `data-testid` convention.

### Local extensions loaded

- `04_api_client_local.md`: flat-string backend error shape.
- `28_surfaces_local.md`: active surface types `slide`/`sheet`/`modal` — range picker registers nothing new (reuses existing sheet).
- `34_runtime_validation_local.md`: bootstrapped fixtures, npm scripts, spec location.

### Guide output format (per `task_system/frontend_contract_goal_mapping_guide.md`)

Domain schemas consulted:
- `packages/stats/src/types.ts`: `WorkerStatsUserSchema`, `WorkerLastStepSchema`, `DailyStatsSchema`, `RunningTotalsSchema` (+ `ZERO_RUNNING_TOTALS`), `WorkerInsightSchema`, `WorkerStatsPaginationSchema`, combined `WorkerStatsRowSchema` (to be split), `ListWorkerStatsParams`, daily-steps schemas — actual field names `total_working_seconds`, `working_open_count`, `as_of`, `work_date`, `client_id`.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_endpoint_split_20260718.md`: authoritative per-endpoint shapes and envelope.
- `backend/app/beyo_manager/routers/api_v1/worker_stats.py`: verified live query params (single `work_date` only — see Clarification 1).

Selected contracts: core set + listed above.

Added from guide:
- `32_loading_skeletons.md`: trigger "skeleton", "shimmer", "loading state".
- `28_surfaces.md` + local: trigger "surface", "sheet".
- `31_animations.md`: trigger "animation" (skeleton reveal).
- `35_shared_packages.md` §13/§14: trigger "surfaceOpeners", "package surface boundary".
- `34_runtime_validation.md` + local: trigger "runtime validation".

Excluded contracts:
- `09_forms.md`/`23_providers.md`: no form, no new provider — range state is page-local and the openers map is read from surface props directly (page-level, matching how this package's pages already read `useSurfaceProps`).
- `11_routing.md`/`10_pages.md`: no routes; surfaces only.
- `21_realtime.md`, `19_permissions.md`, `37_keyboard_aware_inputs.md`, `36_scroll_visibility.md`: untouched behavior (scroll-hide footers remain as-is).
- `30_dynamic_loading.md`: loader-function pattern already in place in `packages/stats/src/surfaces.ts`; no new pages.

### File read intent — pattern vs. relational

All implementation-file reads performed for this plan were relational (what exists): `packages/stats/src/{types,surface-ids,surfaces,index}.ts`, its api/lib/components/pages files, `packages/task-creation/src/pages/CalendarRangePickerPage.tsx` + `surfaces.ts` (existing picker props/registration), `packages/tasks/src/surface-ids.ts` + `TaskDeliveryDateField.tsx` (existing `CalendarRangeOpenerProps` shape), `packages/ui` date primitives, `HomeView.tsx` (existing opener wiring), backend router (param verification). Pattern questions (query hook shape, DTO shape, skeletons, openers) are answered by the contracts above.

### Skill selection

- Primary skill: none — standard package feature work under the contracts above.
- Trigger terms: n/a
- Excluded alternatives: n/a

## Implementation plan

Build order per `16_feature_workflow.md`: types → keys → fetchers/query hooks → composition hook → DTO → components → page → app wiring → tests → Playwright.

1. **`packages/styles/src/index.css`** — add the `skeleton-shimmer` keyframes + utility exactly per `32_loading_skeletons.md` (base skeleton surface, gradient sweep overlay, `prefers-reduced-motion` fallback to a static tint).

2. **`packages/stats/src/types.ts`** — split the roster row:
   - `WorkerLastStepRowSchema = { user, last_interacted_step: WorkerLastStepSchema.nullable(), batch: z.unknown().nullable() }`.
   - `WorkerTotalsRowSchema = { user, daily_stats: DailyStatsSchema, running: RunningTotalsSchema.optional().default(ZERO_RUNNING_TOTALS) }`.
   - `WorkerInsightsRowSchema = { user, insights: z.array(WorkerInsightSchema).default([]) }`.
   - Three response schemas wrapping `{ workers, workers_pagination }` in `ApiEnvelopeSchema` (envelope identical per handoff).
   - Delete the combined `WorkerStatsRowSchema`/`WorkerStatsResponseSchema` (hard split, no external consumers).
   - Add `WorkerStatsDateRange = { from: string; to: string }` (ISO `YYYY-MM-DD`) for page/surface-prop use. `ListWorkerStatsParams` splits by concern: a single-day `workDate?: string` (last-steps + insights) and a `from`/`to` pair (totals + daily-steps). A single shared `WORK_DATE_RANGE_PARAMS = { from: "date_from", to: "date_to" }` constant is the one place the wire param names live.

3. **`packages/stats/src/api/worker-stats-keys.ts`** — add `totalsLists()/totalsList(params)` and `insightsLists()/insightsList(params)` families; `lastInteractedList` unchanged; extend `dailyStepsList` params with the inherited date input.

4. **Fetchers** — rename `fetch-worker-stats.ts` → `fetch-worker-last-steps.ts` (same endpoint, slimmed schema) and add `fetch-worker-totals.ts` (`/api/v1/worker-stats/totals`), `fetch-worker-insights.ts` (`/api/v1/worker-stats/insights`). All send `limit`/`offset` and parse their own response schema, returning `{ workers, hasMore, total, limit, offset }`. Date params differ by concern: last-steps + insights send a single `work_date`; **totals sends the range** `date_from`/`date_to` (via `WORK_DATE_RANGE_PARAMS`). The daily-steps fetcher (`fetch-worker-daily-steps.ts`) likewise switches from `work_date` to the range pair.

5. **Query hooks** — `use-worker-last-steps-query.ts`, `use-worker-totals-query.ts`, `use-worker-insights-query.ts`: independent `useQuery` per `05_server_state.md`, `placeholderData: (prev) => prev` so a range change keeps the previous totals visible while refetching (cards stay mounted; only the totals section swaps to shimmer if no placeholder exists for the new key).

6. **Composition hook `packages/stats/src/hooks/use-worker-stats-roster.ts`** (aggregation shape per `08_hooks.md`) — takes the selected `range: WorkerStatsDateRange`, derives each hook's date input (last-steps + insights → `workDate`, defaulting per Clarification 2; totals → the `from`/`to` range), runs the three hooks, and zips by `user.client_id`:
   - Roster order: from `/last-interacted-steps` when available, else the first resolved response (sets are contractually identical; join stays id-based).
   - Returns per worker: `{ user, step: SectionState<WorkerLastStepRow>, totals: SectionState<WorkerTotalsRow>, insights: SectionState<WorkerInsightsRow> }` where `SectionState<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error" }`.
   - Page-level: `isPending` only while **all three** are pending; `isError` only when **all three** failed; `refetchAll()` for pull-to-refresh. A worker missing from one response renders that section empty, never blocks the card (handoff §integration point 5).

7. **DTO rework `worker-stats-dto.ts`** — split `toWorkerStatsCardViewModel` into per-section transformers reusing the existing helpers unchanged (`resolveTicker`, `resolveLiveTotal`, `isKnownInsight`, `resolveInsightCopy`):
   - `toWorkerStepSectionViewModel(row)` → `hasStep, taskId, stepState(-Label/-Variant), articleLabel, workingSectionName, pauseReason, ticker`.
   - `toWorkerTotalsSectionViewModel(row)` → `workingTotal, pausedTotal, completedCount` (LiveTotal math untouched).
   - `toWorkerInsightsSectionViewModel(row)` → `insights, topInsight`.
   - `WorkerStatsCardViewModel` becomes identity + three `SectionState<…>`-wrapped section VMs. `liveTotalToText` unchanged.

8. **`WorkerStatsCard.tsx`** — render each section from its `SectionState`:
   - Step section loading → shimmer chip beside the username and a shimmer text row (identity row — avatar + username — always renders from `user`).
   - Totals loading → the three tiles keep their labels, values render shimmer blocks, tile buttons `disabled` (Clarification 4).
   - Insights loading → slim full-width shimmer band where the insight band sits; ready + empty → nothing (as today); section error → render nothing (band) / em-dash values (tiles stay disabled).
   - Skeletons use the `skeleton-shimmer` utility; keep card `data-testid`s stable and add `data-testid` per section skeleton for Playwright.

9. **Range state + header button (`WorkerStatsSlidePage.tsx`)**
   - `const [range, setRange] = useState<WorkerStatsDateRange>(() => todayRange())` using `@beyo/ui` date-utils for the local ISO date.
   - Title row becomes `flex justify-between`: existing `h1` + right-aligned compact range trigger (calendar icon + from/to labels, each side rendering "Today" when equal to the local today, else `formatDateDisplay`). `data-testid="worker-stats-range-trigger"`.
   - `WorkerStatsSlideSurfaceProps = { surfaceOpeners?: WorkerStatsSurfaceOpeners }` and `WorkerStatsSurfaceOpeners = { openCalendarRangePicker?: (props: CalendarRangeOpenerProps) => void }` declared in `surface-ids.ts` (35 §13 — the `CalendarRangeOpenerProps` shape is duplicated locally like `packages/tasks/src/surface-ids.ts:1-9` does; packages never import each other's surface IDs for this).
   - Trigger handler calls `surfaceOpeners.openCalendarRangePicker?.({ currentFrom, currentTo, initialTarget, onFromSelect, onToSelect, fromLabel: "Today", toLabel: "Today" })`; selections update `range` (a null side resets to today). Multi-day spans are passed through as-is — the range is treated as backend-live.
   - Feed the full `range` into `useWorkerStatsRoster`; pull-to-refresh calls `refetchAll()`.
   - Page states: all-pending → existing full-card skeleton list (upgraded to `skeleton-shimmer`); all-error → existing retry card; else roster cards.

10. **Granularity inheritance**
    - `WorkerStatsGranularitySurfaceProps` gains `dateFrom: string` / `dateTo: string`; `openGranularitySlide` passes the page's current range and reads `workingDisplay`/`pausedDisplay`/`completedCount` from the totals section (only reachable when totals are ready, since tiles are disabled before that).
    - `WorkerStatsGranularitySlidePage` forwards the inherited `dateFrom`/`dateTo` into `useWorkerDailyStepsQuery`, which sends `date_from`/`date_to` so the drill-down covers the same window as the totals it opened from. `useWorkerDailyStepsQuery`'s input + query key change from `workDate?: string` to the range pair.

11. **App wiring (`HomeView.tsx`)** — `WorkerStatsHomeTrigger` opens the slide with `{ surfaceOpeners: { openCalendarRangePicker: (props) => surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props) } } satisfies WorkerStatsSlideSurfaceProps`, importing the ID from `@beyo/task-creation` exactly as the post-handling flow does. No new surface registrations (sheet already registered via `taskCreationSurfaces`).

12. **Public API (`packages/stats/src/index.ts`)** — export the new schemas/types/hooks/keys; remove the deleted combined exports; export `WorkerStatsSlideSurfaceProps`, `WorkerStatsSurfaceOpeners`, `WorkerStatsDateRange`.

13. **Tests**
    - Rework `worker-stats-dto.test.ts` for the per-section transformers (ticker/live-total cases preserved).
    - Rework `WorkerStatsCard.test.tsx`: per-section loading skeletons, disabled tiles while totals load, insight band states, ready-state parity with today.
    - New `use-worker-stats-roster` test (MSW): staggered responses → card visible after first response, sections fill independently; join-by-id with a worker missing from one response; all-error → page error.
    - Fetcher param tests: last-steps/insights send `work_date`; totals + daily-steps send `date_from`/`date_to` (single-day and multi-day cases).

14. **Playwright** — extend/adjust the existing worker-stats spec: roster renders with delayed `/totals` + `/insights` mocks (skeleton → filled), range trigger shows "Today", opens the calendar sheet, picking a day refetches totals. Mobile project first, then desktop, per `34_runtime_validation_local.md`.

## Risks and mitigations

- Risk: the range params are built as if backend-live, but `/totals` + `/daily-steps` only accept `work_date` today (verified in `worker_stats.py`); FastAPI silently ignores unknown query params, so until the backend ships, totals will quietly reflect the server-UTC today regardless of the selected window — no error, wrong data.
  Mitigation: per user direction, proceed as if live; concentrate the wire names in the single `WORK_DATE_RANGE_PARAMS` constant so a real handoff is a one-line reconcile; add a Playwright assertion that the outgoing `/totals` request carries `date_from`/`date_to` so a backend rename surfaces as a red test, not silent staleness. Flag to backend that the FE now depends on these names.
- Risk: the date is bucketed on the **UTC** calendar day; defaulting to the user's local date shifts results for users ahead/behind UTC around midnight.
  Mitigation: send the local date explicitly (never omit) so the displayed label and the requested day always agree; document the UTC bucketing beside the fetcher.
- Risk: three queries triple the failure surface; a single section error could blank the page.
  Mitigation: page-level error only when all three fail; per-section error degrades to empty/disabled section; pull-to-refresh retries all.
- Risk: cards remounting when the roster source switches (first-arrived → last-steps order) would reset tickers.
  Mitigation: `key={user.client_id}` and id-based join keep identity stable; order is contractually identical across endpoints so a source switch is order-preserving.
- Risk: totals `placeholderData` retention across a range change could show stale numbers as if current.
  Mitigation: retention only applies while refetching; the totals section exposes `isFetching` so the tiles can dim/shimmer-overlay during a range swap.
- Risk: removing combined exports breaks an unnoticed consumer.
  Mitigation: verified by repo-wide grep (only `packages/stats` consumes them); typecheck is the backstop.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test -- --grep worker-stats` (stats vitest scope): DTO, card, roster hook, fetcher suites green.
- `npx playwright test --grep worker-stats --project=mobile`: staggered-arrival skeletons, range trigger "Today", calendar sheet opens, a multi-day selection re-requests `/totals` with `date_from`/`date_to`, granularity inherits the range — green.
- `npx playwright test --grep worker-stats --project=desktop`: same spec set green.

## Review log

- `2026-07-18` `claude`: initial draft; blocked on 4 clarifications (range params existence being the hard blocker).
- `2026-07-18` `David`: build the date range as if the backend already implements it — do not gate on the missing params.
- `2026-07-18` `claude`: resolved Clarification 1 — full multi-day range plumbed to `/totals` + `/daily-steps` via `date_from`/`date_to` (centralized constant); UTC-bucketing risk downgraded; naming-mismatch now guarded by a Playwright request assertion. 3 clarifications remain (header-trigger interpretation, insights under non-today/multi-day range, tiles-disabled-while-loading).
- `2026-07-18` `Codex`: implemented the existing calendar-sheet interpretation, pinned insights to the range end and hid the band for multi-day windows, and disabled totals tiles while loading.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
