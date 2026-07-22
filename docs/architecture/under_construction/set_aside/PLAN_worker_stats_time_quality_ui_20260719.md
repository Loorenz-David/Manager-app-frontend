# PLAN_worker_stats_time_quality_ui_20260719

## Metadata

- Plan ID: `PLAN_worker_stats_time_quality_ui_20260719`
- Status: `implemented`
- Owner agent: `claude-fable-5`
- Created at (UTC): `2026-07-19T00:00:00Z`
- Last updated at (UTC): `2026-07-19T00:00:00Z`
- Related issue/ticket: inline request (time-quality presentation on worker stats)
- Intention plan: intention captured inline in the request; backend contract is the source of truth
- Backend handoff: `backend/docs/handoff/to_frontend/HANDOFF_TO_FRONTEND_worker_stats_inaccurate_time_estimation_20260718.md`
- Prerequisite (already merged): schema/mapping acceptance of the new shapes in `packages/stats/src/types.ts`, `api/fetch-worker-totals.ts`, `api/fetch-worker-daily-steps.ts` (2026-07-18)

## Goal and intent

- Goal: Surface the backend's inaccurate-time estimation in the worker-stats UI:
  1. **Roster (`WorkerStatsSlidePage` → `WorkerStatsCard`)** — the Worked/Paused stat per worker becomes the *usable* total: `trusted + time_quality.<state>.estimated_fill`, silently (no visual guidance on the card for now; the user keeps reading them as plain totals).
  2. **Drill-down (`WorkerStatsGranularitySlidePage`)** — totals now come from the `/daily-steps` response itself (the passed-from-parent totals are removed); flagged steps (`is_time_inaccurate: true`) get an "inaccurate timing" badge and their displayed time includes the estimated fill; a new three-column time-quality panel below `WorkerTotalsSelector` shows flagged-record count, wasted time, and estimated fill for a client-side-cycled strategy (median → mean → iqr).
- Business/user intent: Managers should read one believable number per worker even when some steps were flagged as inaccurately timed, and — in the drill-down — see exactly which steps were flagged, how much time was discarded (wasted), and how much was estimated back in, per strategy.
- Non-goals:
  - No strategy selector on the roster page — `/totals` is fetched without `time_strategy` (backend default `mean`).
  - No rendering of `wasted` into any usable total, anywhere (`wasted` is diagnostic only; it is never summed with trusted or fill — contract rule).
  - No `only_inaccurate` filter UI in this iteration (param support already exists in the fetcher).
  - No backend changes.

## Scope

- In scope (all inside `packages/stats/src`):
  - `lib/worker-stats-dto.ts` — fold `estimated_fill` into the roster totals view model.
  - `pages/WorkerStatsSlidePage.tsx` + `surface-ids.ts` — stop passing `workingDisplay` / `pausedDisplay` / `completedCount` into the granularity surface.
  - `pages/WorkerStatsGranularitySlidePage.tsx` — derive selector totals from the query, own the strategy state, render the new panel.
  - `lib/worker-daily-step-dto.ts` + `components/WorkerStatsGranularityCard.tsx` — flagged badge + fill-inclusive time per selected strategy.
  - New `components/WorkerTimeQualityPanel.tsx` (+ test).
  - `index.ts` exports; existing unit tests updated.
- Out of scope:
  - `WorkerStatsCard` visual changes (badges/segments) — explicitly deferred by the request ("for now we will not add any visual guidance").
  - Insights, last-interacted-step, calendar-range behavior.
  - The managers-app shell (`surface-registry.ts` needs no change — surface IDs unchanged).
- Assumptions (each is cheap to reverse if review says otherwise):
  1. The pasted display-rule table ("est." segment / "N flagged, no estimate" badge) applies to the **granularity page**, since the same message says the roster card gets *no* visual guidance. On the granularity card the two directives are combined as: time shown = `contribution + fill` and an amber "Estimated" badge marks the step.
  2. The time-quality panel renders **only when** `inaccurate_step_count > 0` for the range; with nothing flagged the page looks exactly like today.
  3. With parent-passed totals removed, `WorkerTotalsSelector` shows skeleton values while the first `/daily-steps` page is pending (it currently renders instantly from props).
  4. Strategy state is **local to the granularity page** (resets to `median` on open); it does not write back to the roster.

## Clarifications required

- [x] **Roster fill vs. drill-down default mismatch** — RESOLVED 2026-07-19 (owner): the backend `/totals` default strategy is now **median**, so the roster fill and the drill-down's `median` default reconcile. Both surfaces default to `median`; no `time_strategy` param is sent anywhere.
- [x] **"Completed" intention in the time-quality panel** — RESOLVED 2026-07-19 (owner): hide the wasted/fill values while `completed` is active (flagged count stays; the two time columns render an em dash and the strategy tap is disabled).
- [x] **"N flagged, no estimate" row of the table** (`wasted > 0`, `estimated_fill == 0`) — RESOLVED 2026-07-19 (owner): yes, the panel's fill column showing `0` plus the flagged-card badges is sufficient; no extra "no estimate" badge.

## Acceptance criteria

1. Roster card Worked/Paused values equal `trusted + round(estimated_fill)` (+ live running seconds when ticking) whenever `daily_stats.time_quality` is present with `estimated_fill > 0`; payloads without `time_quality` render exactly as today. No new visual elements on the card.
2. Granularity page renders selector totals from the `/daily-steps` response: `usable(strategy) = totals.<state> + estimated[strategy].<state>` for working/paused, `totals.completed_count` for completed — computed client-side; **no refetch happens when the strategy changes** (all three strategies ship in every response).
3. `openGranularitySlide` no longer passes `workingDisplay` / `pausedDisplay` / `completedCount`; the granularity surface props type drops those fields and the page compiles with no fallback references to them.
4. A `WorkerTimeQualityPanel` renders below `WorkerTotalsSelector` iff `inaccurate_step_count > 0`, with three columns: flagged count, wasted time (for the active intention's state), estimated fill + strategy label; tapping the third column cycles `median → mean → iqr → median` and updates the panel, the selector totals, and every card's displayed time.
5. Cards with `is_time_inaccurate: true` show an "inaccurate timing" badge in every intention, and (for working/paused intentions) their time pill shows `contribution + estimated_fill_by_strategy[state][strategy]` rounded, marked as estimated; unflagged cards are pixel-identical to today.
6. `wasted` values never contribute to any displayed total (only to the panel's wasted column and, later, diagnostics).
7. `npm run typecheck` and `npm run test:stats` pass; updated/added unit tests cover criteria 1, 2, 4, 5.

## Contracts and skills

### Contracts loaded

- `architecture/24_dto.md`: view-model transformer changes in `worker-stats-dto.ts` / `worker-daily-step-dto.ts` and the new panel's view model derivation.
- `architecture/07_components.md`: `WorkerTimeQualityPanel` component conventions (memo, props type, testids).
- `architecture/28_surfaces.md` (+ `28_surfaces_local.md`): shrinking `WorkerStatsGranularitySurfaceProps` safely (props flow via `useSurfaceProps`).
- `architecture/05_server_state.md`: confirming no query-key change is needed when strategy is client-side-only.
- `architecture/17_testing.md`: vitest patterns for the dto/component tests.
- `architecture/32_loading_skeletons.md`: selector skeleton while the first page is pending.

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: zod-at-the-boundary rule — already satisfied by the 2026-07-18 schema work; no new parsing added outside `types.ts`.

### File read intent — pattern vs. relational

Relational reads already performed for this plan (what exists): `types.ts` (new schemas/fields), `api/fetch-worker-daily-steps.ts` + `api/fetch-worker-totals.ts` (return shapes), `api/worker-stats-keys.ts` (key structure), `lib/worker-stats-dto.ts` / `lib/worker-daily-step-dto.ts` (current transformers), both pages, `WorkerStatsCard`, `WorkerTotalsSelector`, `WorkerStatsGranularityCard`, `surface-ids.ts`, `index.ts`, and the backend handoff + `get_worker_daily_step_breakdown.py` / `list_workers_totals.py` (authoritative response shapes). No pattern reads are needed during implementation — the contracts above cover the how-to-write questions.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md` (plan authoring); `skills/cross_cutting/code_review_frontend/SKILL.md` post-implementation.
- Trigger terms: `view model`, `surface props`, `derived server state`, `strategy toggle`.
- Excluded alternatives: `skills/cross_cutting/debugging_nested_plan_loop/SKILL.md` — not a debugging cycle; `skills/cross_cutting/intention_planning/SKILL.md` — intention was provided inline by the owner.

## Implementation plan

1. **Roster usable totals — `lib/worker-stats-dto.ts`**
   - In `toWorkerTotalsSectionViewModel`, read `row.daily_stats.time_quality` (optional). Compute per state: `fill = Math.round(time_quality.<working|paused>.estimated_fill ?? 0)`.
   - Pass `settledSeconds + fill` into `resolveLiveTotal` (fill therefore also rides inside ticking offsets). `wasted` is deliberately ignored.
   - No view-model shape change → `WorkerStatsCard` untouched.
2. **Strategy model — `lib/` helper**
   - Add a tiny `cycleTimeStrategy(current: TimeStrategy): TimeStrategy` (median → mean → iqr → median) and `TIME_STRATEGY_LABEL: Record<TimeStrategy, string>` (`"Median" | "Mean" | "IQR"`) in a new `lib/time-quality.ts` (also the natural home for `usableTotals(totals, estimated, strategy)`).
3. **Surface props slim-down — `surface-ids.ts` + `pages/WorkerStatsSlidePage.tsx`**
   - Remove `workingDisplay`, `pausedDisplay`, `completedCount` from `WorkerStatsGranularitySurfaceProps`.
   - Simplify `openGranularitySlide` accordingly (drop the `liveTotalToText` calls; keep identity/state/ticker props).
4. **Granularity page — `pages/WorkerStatsGranularitySlidePage.tsx`**
   - New local state `strategy: TimeStrategy` (default per clarification #1; provisionally `median`). Strategy is *not* sent to the backend and *not* in the query key — all three strategies arrive in every response.
   - Read range aggregates from the first page: `totals`, `wasted`, `estimated`, `inaccurateStepCount` (fetcher already maps them).
   - Selector values: `working/paused = secondsToHM(totals.<state> + estimated[strategy].<state>)`, `completed = totals.completed_count`; skeleton text while `query.isPending`.
   - Render `WorkerTimeQualityPanel` below the selector when `inaccurateStepCount > 0`, feeding it the active intention's state values and the cycle callback.
   - Pass `strategy` into the card mapping (step 5's transformer signature).
5. **Flagged cards — `lib/worker-daily-step-dto.ts` + `components/WorkerStatsGranularityCard.tsx`**
   - `toWorkerDailyStepCardViewModel(step, intention, activeStepCount, strategy)`: add `isTimeInaccurate: boolean`; for working/paused intentions add `Math.round(estimated_fill_by_strategy[state][strategy])` into the settled seconds used for the static/ticking time (state key mapping: `working → working`, `paused → paused`).
   - Card: when `isTimeInaccurate`, render an amber warning badge (reuse the `warning` chip tone from `STATE_CHIP_CLASS`) labeled "Estimated time" next to/under the time pill; `data-testid="worker-granularity-card-inaccurate-<stepId>"`. Unflagged cards unchanged.
6. **New `components/WorkerTimeQualityPanel.tsx`**
   - Presentational, `memo`, mirroring `WorkerTotalsSelector`'s three-column grid styling; columns: **Flagged** (`inaccurateStepCount`), **Wasted** (`secondsToHM(wasted.<state>)`), **Est. fill** (`secondsToHM(estimated[strategy].<state>)` + small strategy label). Third column is a button that fires `onCycleStrategy`; testids `worker-time-quality-*`.
7. **Exports + tests**
   - Export the panel, `cycleTimeStrategy`, `TIME_STRATEGY_LABEL` from `index.ts`.
   - Update `worker-stats-dto.test.ts` (fill folded in / absent `time_quality` unchanged), `worker-daily-step-dto.test.ts` (flag + per-strategy fill), add `WorkerTimeQualityPanel.test.tsx` (renders values, cycle callback), extend the granularity page expectations only if an existing page-level test exists (none today).

## Risks and mitigations

- Risk: double-counting — someone later adds `wasted` or the backend's `usable` on top of the client-computed usable.
  Mitigation: the client computes usable in exactly one helper (`usableTotals`); the fetcher's `usable` field keeps its backend value but the page never reads it (comment in the helper explains why).
- Risk: roster card total vs. drill-down initial total visibly disagree (mean vs median, worker vs section grain).
  Mitigation: resolved — backend `/totals` default changed to `median`; both surfaces default to `median`.
- Risk: ticking steps that are also flagged — fill applies to settled seconds while the open interval ticks on top; a flagged-and-still-running step could read oddly.
  Mitigation: fill is a constant offset; ticking behavior is unchanged. Noted for the review log rather than special-cased.
- Risk: removing surface props breaks any other opener of the granularity surface.
  Mitigation: `grep` shows `openGranularitySlide` in `WorkerStatsSlidePage` is the only opener; typecheck enforces the rest.
- Risk: float fills (`estimated_fill` is a float) causing `NaN`/negative display on odd payloads.
  Mitigation: schemas already default the objects; helpers clamp with `Math.max(0, Math.round(x))`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (workspace-wide, includes `packages/stats`).
- `npm run test:stats`: all existing + new vitest suites pass (dto tests, panel test, selector/card tests).
- Playwright: no stats specs exist in `tests/playwright` — not applicable; manual smoke in the managers app: roster totals with/without `time_quality`, drill-down strategy cycling, flagged-card badge.

## Review log

- `2026-07-19` `owner (David)`: resolved all three clarifications — (1) backend `/totals` default is now median; (2) hide the panel's time values under the completed intention; (3) no extra "no estimate" badge.
- `2026-07-19` `claude-fable-5`: plan updated with resolutions; proceeding to implementation.
- `2026-07-19` `claude-fable-5`: implemented. `npm run typecheck` clean workspace-wide; `npm run test:stats` 39/39 passing (8 files, incl. new `WorkerTimeQualityPanel.test.tsx`).

## Lifecycle transition

- Current state: `implemented`
- Next state: `archived` (owner verification in the running app, then move to `archives/implementation/` + summary)
- Transition owner: `claude-fable-5`
