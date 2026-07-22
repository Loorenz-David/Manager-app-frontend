# PLAN_worker_timeline_calendar_20260719

## Metadata

- Plan ID: `PLAN_worker_timeline_calendar_20260719`
- Status: `under_construction`
- Owner agent: `claude-fable-5`
- Created at (UTC): `2026-07-19T00:00:00Z`
- Last updated at (UTC): `2026-07-19T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/refactor_stats.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_linear_timeline_20260719.md`

## Goal and intent

- Goal: a reusable worker timeline calendar slide page in `@beyo/stats` that renders the drill-down endpoint `GET /api/v1/worker-stats/{user_id}/linear-timeline` as a Google-Calendar-style day view: vertically scrollable 24-hour grid, single-day and three-day modes, horizontal date navigation with a five-day request window, state-colored events (working / paused / ended-shift / idle), completion markers, current-time line, and navigation into `TaskDetailSlidePage`.
- Business/user intent: ADMIN/MANAGER users inspect *when* a worker was working, paused (and why), ended their shift, or was idle — the wall-clock partition the roster's `WorkerStatsCard` already summarizes but cannot show over time. This is the "own page" the Idle column was intentionally left non-interactive for.
- Non-goals (Phase 1): creating/editing/scheduling events; changing worker state; multi-lane Gantt of every record; reconciling `pause_seconds` against `/totals` `total_pause_seconds`; images inside the timeline request; server-side segment pagination.

## Scope

- In scope:
  - New drill-down API layer (schemas, fetch, query hook, query key) in `packages/stats`.
  - Response adapter (`segment → CalendarTimelineEvent`), geometry model, pause-reason label map.
  - Reusable calendar components under `packages/stats/src/components/time-line-calendar/`.
  - New slide page `WorkerTimelineSlidePage` + sheet pages for the date picker and event-record chooser, all registered through the package's `surfaces.ts` (auto-picked-up by the managers-app registry which spreads `workerStatsSurfaces`).
  - Entry wiring: `WorkerStatsCard` totals row → single tap target opening the timeline slide from `WorkerStatsSlidePage` (replaces the per-column granularity opens — user decision, see Clarifications).
  - Vitest coverage for adapter, geometry, window math, labels, and key components; Playwright spec.
- Out of scope:
  - Removing/deleting the granularity slide page or its surface — it merely loses its card entry point; page, surface registration, and exports stay.
  - Workers-app exposure; roster endpoint changes (`fetch-worker-linear-timeline.ts` stays untouched).
  - Virtualization (bounded 24 h grid × ≤3 columns; not needed).
  - New gesture/dependency libraries — gestures are hand-rolled on pointer/touch events like `SwipeableRow`/`ZoomableImage` do.
- Assumptions:
  - `TASK_DETAIL_SURFACE_ID` open-by-store pattern (used by `WorkerStatsSlidePage` and `WorkerStatsGranularitySlidePage`) is the sanctioned task navigation path.
  - `workerStatsSurfaces` additions require **no** managers-app change (registry spreads the map).
  - The shop operates in one timezone; local-time rendering (see §Timezone) will visually match UTC for CET workers except across the DST/midnight edge, which the adapter handles.

## Clarifications required

- [x] **Entry point:** *Resolved 2026-07-19 (user, superseding the earlier "no interaction" answer):* the **whole 4-column `WorkerStat` totals row** on `WorkerStatsCard` becomes a single tap target that opens the timeline slide (worker identity + the roster's selected range as initial anchor). The per-column granularity opens (`onOpenSection` on Worked/Paused/Completed) are **removed** — the user explicitly chose this over keeping them. Consequence (accepted): `WorkerStatsGranularitySlidePage` loses its only entry point and becomes programmatic-only; its surface/page/exports remain untouched.
- [x] **Display timezone:** resolved by recommendation (no objection raised): local-time day columns + local now-line + UTC-derived request dates, adapter-owned conversion.
- [x] **Date picker surface:** *Resolved 2026-07-19 (user):* package-owned sheet using the `DayCalendar` primitive from `@beyo/ui` directly (single-date, future disabled) + package-local 1-day/3-day view toggle. No app-side `surfaceOpeners` injection.
- [x] **Live refresh cadence:** resolved by recommendation (no objection raised): 60 s `refetchInterval` when the window includes today, plus local minute-tick extrapolation of open blocks.
- [x] **Ended-shift treatment:** *Resolved 2026-07-19 (user):* follow the mockup — line marker (`Shift ended HH:mm`, dot + rule) at the segment's start; the span stays visually empty and distinct from striped idle; records (if any) reachable via marker tap.

## Acceptance criteria

1. Opening the timeline for a worker + date shows a 24-hour scrollable grid with hour gutter, date header row (today = circular `bg-primary` pill), and events whose top/height derive from segment `start`/`end` at minute precision.
2. Single-day and three-day modes share the same geometry; switching modes preserves the focused date and approximate scroll time; no more than three columns ever render.
3. Horizontal swipe (with threshold) and prev/next buttons navigate dates; navigation is clamped at today; already-loaded dates render instantly; approaching an unloaded edge triggers the next five-day request without blanking the visible timeline.
4. Working (light blue, live treatment when `is_open`), paused (amber, reason label), idle (gray striped, `steps: []`, not task-actionable), and ended-shift (distinct neutral) events render with the documented content priority; unknown pause reasons render humanized, never crash.
5. Records with `ended_by === "completed"` render as compact completion markers at `exited_at`, clipped to the segment, grouped with a count when overlapping; segment duration unchanged.
6. Tapping an event with exactly one actionable record opens `TASK_DETAIL_SURFACE_ID`; multiple records open the record-chooser sheet listing each record (article/SKU/section/state/reason/times/live/completed) with per-record task navigation; idle events never navigate.
7. Current-time line (line + HH:mm label, minute-accurate, local timezone) shows in single-day mode on today only and advances over time.
8. Initial loading shows grid + header skeletons; background window loads keep rendered data with a subtle indicator; `segments: []` renders a deliberate empty state over the visible grid; 404 → worker-not-found; network error → retry preserving context; `segments_truncated` → warning state that narrows the window without an infinite retry loop.
9. Floating close/back controls hide during scroll and reveal near the bottom edge (TaskDetailSlidePage behavior: `useScrollHide({ revealAtEdge: "bottom", edgeOffset })`).
10. All controls have non-gesture equivalents; event blocks are keyboard-focusable buttons with meaningful accessible names; state is never conveyed by color alone (icon/label/pattern).
11. `npm run typecheck` clean; new vitest suites green; Playwright spec green on mobile then desktop.

## Contracts and skills

### File read intent — pattern vs. relational

Relational reads performed (what exists — legitimate):
- `packages/stats/src/**` — types/schemas, `worker-stats-keys.ts`, roster timeline fetch/query, `surface-ids.ts`, `surfaces.ts`, `index.ts`, `WorkerStatsCard` (idle column comment), `WorkerStatsSlidePage` (range state, `surfaceOpeners`, granularity open), `WorkerStatsGranularitySlidePage` (slide-page shell: `useSurfaceHeader`/`useSurfaceProps`/`useScrollHide`/`PullToRefresh`/footer Pattern A/task-detail open), `worker-stats-date-range.ts`, `format-duration.ts`.
- `packages/tasks/src/pages/TaskDetailSlidePage.tsx` — bottom-actions edge-reveal wiring (`revealAtEdge: "bottom"`, `edgeOffset` px constant kept in sync with bottom padding, `isFooterHidden = isHidden && !isAtEdge`).
- `packages/ui/src/components/primitives/avatar/Avatar.tsx` — props (`name`, `imageSrc`, `className`).
- `packages/ui/src/components/primitives/scroll-visibility/use-scroll-hide.ts` — options surface.
- `packages/ui/src/components/primitives/date/*` — `DayCalendar` (`mode: 'single' | 'range'`, `disabled` matchers), `parseISOToDate`/`serializeDateToISO`/`formatDateDisplay` (UTC-calendar-date semantics).
- `apps/managers-app/.../surface-registry.ts`, `HomeView.tsx` — surface registration spread + opener injection precedent.
- Backend handoff doc — endpoint contract, semantics, surprising behaviors (stale-pause capping → idle; overlapping-pause reason attribution).

Pattern reads deliberately avoided (contract defines these): TanStack query-hook shape (`05`), DTO/view-model transformer shape (`24`), scroll-hide wiring details (`36`), surface registration/lazy loaders (`28`, `30_local`, `35 §14`).

### Contracts loaded

- `architecture/01_architecture.md` — layer boundaries; geometry/adapters live in `lib/`, not render functions.
- `architecture/02_types.md` — Zod-first response schemas; API types separate from view models.
- `architecture/04_api_client.md` — `apiClient.get(path, schema, params)`.
- `architecture/05_server_state.md` — query hooks, `placeholderData`, `prefetchQuery`, stale-response protection via keys.
- `architecture/08_hooks.md` — controller-hook aggregation (visible-date controller, window controller).
- `architecture/13_errors.md` — error/retry rendering; 404 vs network distinction.
- `architecture/15_feature_structure.md` — package folder layout (`api/`, `lib/`, `hooks/`, `components/`, `pages/`).
- `architecture/18_performance.md` — memoized derived layouts, one shared clock, coalesced gesture state.
- `architecture/24_dto.md` — `WorkerLinearTimelineSegment` (contract) vs `CalendarTimelineEvent` (view model) split.
- `architecture/28_surfaces.md` — slide/sheet registration and `useSurfaceStore.getState().open`.
- `architecture/31_animations.md` — mode-switch/live-block transitions.
- `architecture/32_loading_skeletons.md` — skeleton-first initial load, no misleading empty state.
- `architecture/35_shared_packages.md §13, §14` — package surface boundary; static page export + `lazyWithPreload` loader per page.
- `architecture/36_scroll_visibility.md` — Pattern A footer, `hideProgressContainerRef`, edge reveal.
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md` — vitest + Playwright expectations.

### Local extensions loaded

- `architecture/04_api_client_local.md` — envelope (`ApiEnvelopeSchema`, already used in stats types).
- `architecture/28_surfaces_local.md` — active surface types: `slide` for the page, `sheet` for picker/chooser; no `drawer`.
- `architecture/30_dynamic_loading_local.md` — `lazyWithPreload` from `@beyo/ui`, loader-function convention (matches `surfaces.ts`).
- `architecture/34_runtime_validation_local.md` — fixture paths, mobile-first project order.

### Skill selection

- Primary skill: none beyond the standard feature build; run `verify` after implementation.
- Trigger terms: `slide surface`, `sheet`, `scroll visibility`, `query`, `dto`, `gesture`.
- Excluded: `dataviz` (calendar layout, not a chart); form skills (no forms).

## Design reference (user-supplied mockups, 20260719)

Two mockups (single-day and three-day, worker "Andrii") define the visual language:

- **Header row:** avatar + username left; tappable date pill right (`Sun 19 Jul` / `19–21 Jul`) in a soft rounded container.
- **Totals strip** under the header, above the grid: `4h 47m worked · 19m paused · 59m idle · 2 done` — the drill-down response's `timeline` totals for the *visible* range, formatted with `secondsToHM`. (New component — added to the file table.)
- **Three-day date header row:** abbreviated weekday over day number per column; the focused/current date is a filled circular pill (mockup shows dark; implement with `bg-primary` per intention §12).
- **Working event:** light blue fill, solid blue left accent bar, blue "Working" title; single-day shows `07:32 – 09:15 · 1h 43m` plus muted task line (`#0000642 structural repair` — article/task identity); three-day compacts to duration + article number.
- **Completion:** green pill `✓ #0000642 done` (three-day: `✓ Done`) anchored bottom-right inside the working event, with a green accent along the event's bottom edge. Marker sits at the completing record's `exited_at` boundary.
- **Paused event:** amber fill, orange left bar, `Paused · <reason>` title with right-aligned duration; three-day: `Paused 19m` + small reason line.
- **Idle event:** gray diagonal-striped fill, dashed border, `Idle · no activity detected` + right-aligned duration; three-day: `Idle 42m`.
- **Ended shift:** rendered as a **boundary line marker** — colored dot + horizontal rule labeled `Shift ended 13:35` at the segment start — not a filled duration block (see Clarification 5; deviates from intention §22's "block with duration").
- **Hour gutter:** left column, `07:00`-style labels, hairline hour rules; initial visible scroll starts around 07:00 (matches the planned default).
- **Footer:** full-width dark rounded `Close & Back` pill (darker emphasis than the existing stats-page footer button; same Pattern A hide-on-scroll placement).

## Design decisions (codebase-grounded)

### D1 — Timezone policy (single conversion layer)

**Day columns, hour axis, now-line, and header labels are all LOCAL wall-clock. API request dates are UTC calendar dates.** One conversion layer owns the mapping:

- `segment-adapter` parses `start`/`end` as absolute instants (`new Date(iso)`), assigns each event to local day column(s) by local date, splits an event crossing local midnight into per-day slices (original backend segment retained on the view model), and computes `minuteOfDayStart/End` from local hours/minutes — so DST days (23/25 h) position correctly without assuming 24 h arithmetic beyond the drawn 24 h axis (the rare DST-transition hour renders clock-time-faithful; documented known simplification).
- `window.ts` converts a local-day span to the UTC date params: `dateFromUtc = utcDateOf(startOfLocalDay(first))`, `dateToUtc = utcDateOf(endOfLocalDay(last))` — widening by one UTC day where local ≠ UTC date. Backend UTC-midnight splits are invisible after adaptation (adjacent same-state slices visually join per the handoff note).
- Parent-provided `initialDate`/range strings (UTC dates from the roster) are treated as calendar-day labels and anchored to the same-labeled local day.
- "Today"/future-clamp = **local** today.

### D2 — Five-day window and cache

- Query key: `workerStatsKeys.linearTimelineBreakdown(userId, { dateFrom, dateTo })` — one cache entry per exact window; distinct windows never overwrite each other (stale-response protection for free).
- **Deterministic window rule with hysteresis:** the window controller holds `loadedWindow` state. It recomputes only when a *visible* date is not covered with ≥1 day of margin toward the past (future side is clamped at today). New window per intention: single-day `D−2…D+2`; three-day `D−1…D+3`; clamp upper at today and shift the lower bound to keep five dates. Day-by-day swiping inside a loaded window therefore triggers **no** request; crossing the margin snaps a new window.
- Old window's data stays rendered while the new window fetches (`placeholderData: previous` + per-window cache entries mean visible dates covered by the previous window keep painting from it until the new entry resolves); a subtle header indicator shows background loading.
- Prefetch: when the visible date reaches the loaded window's penultimate day (either edge), `queryClient.prefetchQuery` the next window.
- Worker change ⇒ different key branch; no invalidation needed.
- Live refresh: `refetchInterval: 60_000` only when the window includes local today; open blocks additionally extend client-side via the shared minute clock between refetches.

### D3 — Geometry model

- `PX_PER_HOUR = 64` (`px/min = 64/60`); day column height `24 × 64 = 1536 px`.
- Event: `top = minuteOfDayStart × pxPerMin`, `height = max((end − start) × pxPerMin, 2px visual floor)`; interaction target: absolutely-positioned overlay with `min-height: 32px` centered on the visual block (visual height never falsified).
- Geometry computed in `lib/` (`computeEventLayout`) and memoized per (events, mode) — event components receive final `top/height` and a `density: "day" | "threeDay"` prop only.
- Initial scroll: first event of the focused date minus 1 h, else 07:00; scroll position (as time-of-day) preserved across mode switches and date navigation.
- Layout supports a future overlap pass (each event carries `laneIndex`/`laneCount`, hardcoded `0/1` in Phase 1) so scheduled events can later share a column without reworking components.

### D4 — Event content and labels

- Primary label priority: `article_number` → `sku` → `working_section_name` → localized generic state label. Primary record = earliest **clipped** start, tie-broken by `record_id` (deterministic).
- `steps.length > 1` ⇒ `+N` count chip (wording: `N records`, matching backend vocabulary already surfaced in stats).
- `pause-reason-labels.ts`: central map of the eight known reasons (`pause_lunch_break → Lunch break`, … `unspecified → Pause`) + `humanizeReason()` fallback (strip `pause_` prefix, underscores → spaces, sentence-case) for unknown keys. Also exported for the record-chooser rows.
- `ended_by` handled as open set; only `"completed"` and `"still_open"` get special treatment.

### D5 — Interaction routing

- One actionable record (valid `task_id`) ⇒ `useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, { taskId })` (exact `WorkerStatsGranularitySlidePage` pattern).
- Multiple records ⇒ open `WORKER_TIMELINE_EVENT_SHEET` (package-owned sheet) listing records individually, **visually grouped by `task_id`** (group header = task identity; rows keep own state/reason/true `entered_at`/`exited_at`/live/completed) — the user sees why several records exist and picks the task. Clipped spans are used on the calendar; the sheet shows true timestamps.
- Idle: not focusable-as-navigation; renders as a non-actionable block (Phase 1 skips the optional explanatory sheet).
- Ended-shift: actionable only when it has records with `task_id`.

### D6 — Gestures

- `use-timeline-gestures.ts` (calendar-local hook, no new dependency): pointer-based horizontal pan with threshold (≥ 48 px and |dx| > 2·|dy| to not fight vertical scroll) ⇒ prev/next date; two-touch pinch tracked via `touchmove` distance ratio (out ⇒ three-day, in ⇒ single-day; physical direction verified against Google Calendar during implementation as the intention requires), focus date + time position preserved.
- Non-gesture equivalents: header prev/next buttons, date-pill picker with explicit 1-day/3-day mode toggle.
- Future-date clamp lives only in the visible-date controller (one place to delete for Phase 2 scheduling).

## Files

### New files (all in `packages/stats` unless noted)

| File | Responsibility |
|---|---|
| `src/api/fetch-worker-linear-timeline-breakdown.ts` | `GET /api/v1/worker-stats/{userId}/linear-timeline` via `apiClient.get` + schema |
| `src/api/use-worker-linear-timeline-breakdown-query.ts` | Query hook: per-window key, `placeholderData`, conditional `refetchInterval` |
| `src/lib/time-line-calendar/window.ts` (+ `.test.ts`) | Five-day window math, hysteresis rule, UTC request-date derivation, today clamp |
| `src/lib/time-line-calendar/segment-adapter.ts` (+ `.test.ts`) | `toCalendarTimelineEvents`: parse, local-day split/clip, open-end handling, completion-marker extraction, primary label, stable keys |
| `src/lib/time-line-calendar/geometry.ts` (+ `.test.ts`) | px scale, `computeEventLayout`, marker positions, min-hit-target math, lane fields |
| `src/lib/time-line-calendar/pause-reason-labels.ts` (+ `.test.ts`) | Known-reason map + `humanizeReason` fallback |
| `src/hooks/use-timeline-visible-dates.ts` (+ `.test.ts`) | View mode + focused date state, prev/next, three-day `D−2…D` picker rule, today clamp |
| `src/hooks/use-timeline-window.ts` | Composes visible dates → window → query + prefetch + background/initial-loading flags + truncation narrowing (one retry step, then error state) |
| `src/hooks/use-current-minute.ts` | One shared minute clock (single interval; today-only subscription) |
| `src/hooks/use-timeline-gestures.ts` | Horizontal pan + pinch handlers (D6) |
| `src/components/time-line-calendar/TimelineCalendarHeader.tsx` | Avatar + username + date/range pill + prev/next + loading dot |
| `src/components/time-line-calendar/TimelineTotalsStrip.tsx` | Visible-range `timeline` totals band (`Xh Ym worked · … paused · … idle · N done`) per mockup |
| `src/components/time-line-calendar/TimelineDateHeaderRow.tsx` | Weekday/day cells aligned to columns; today = circular `bg-primary` pill |
| `src/components/time-line-calendar/TimelineHourGutter.tsx` | 00:00–23:00 labels at the shared scale |
| `src/components/time-line-calendar/TimelineGrid.tsx` | Scrollable 24 h body: gutter + 1–3 `TimelineDayColumn`s + now indicator; owns scroll ref handoff |
| `src/components/time-line-calendar/TimelineDayColumn.tsx` | Hour lines + positioned event blocks for one local day |
| `src/components/time-line-calendar/TimelineEventBlock.tsx` (+ `.test.tsx`) | State variants per mockup (working: blue fill + left bar; paused: amber + orange bar; idle: gray striped + dashed border), density, live treatment, count chip, a11y name, hit-target overlay |
| `src/components/time-line-calendar/TimelineCompletionMarkers.tsx` | Green `✓ … done` pills at `exited_at` + green bottom-edge accent, clipped/grouped inside working events |
| `src/components/time-line-calendar/TimelineShiftEndMarker.tsx` | Dot + rule + `Shift ended HH:mm` label at an ended-shift segment start (pending Clarification 5) |
| `src/components/time-line-calendar/TimelineNowIndicator.tsx` | Line + HH:mm label, single-day/today only |
| `src/components/time-line-calendar/TimelineEmptyState.tsx` | Deliberate "no recorded activity" overlay (grid stays visible) |
| `src/pages/WorkerTimelineSlidePage.tsx` | Page controller: surface props, visible-date + window hooks, mode switching, event tap routing, floating controls (`useScrollHide({ revealAtEdge: "bottom", edgeOffset })`), loading/error/empty/truncated states |
| `src/pages/WorkerTimelineDateSheetPage.tsx` | `DayCalendar` single-date (future disabled) + 1-day/3-day mode toggle |
| `src/pages/WorkerTimelineEventSheetPage.tsx` | Record chooser (D5), task-grouped rows, opens task detail |

### Modified files

| File | Change |
|---|---|
| `src/types.ts` | Add `WorkerLinearTimelineStepRecordSchema`, `WorkerLinearTimelineSegmentSchema` (tolerant `state`/`reason`/`ended_by` strings per open-set rule), `WorkerLinearTimelineBreakdownResponseSchema` (`user` + `timeline` + `segments` + `segments_truncated`), `GetWorkerLinearTimelineBreakdownParams` |
| `src/api/worker-stats-keys.ts` | Add `linearTimelineBreakdowns()` / `linearTimelineBreakdown(userId, { dateFrom, dateTo })` |
| `src/surface-ids.ts` | `WORKER_TIMELINE_SLIDE_SURFACE_ID` + `WorkerTimelineSurfaceProps` (`userId`, `username?`, `profilePicture?` for instant header, `initialDate?`, `initialDateFrom?`, `initialDateTo?`); sheet ids + props for date sheet and event sheet; preload fns |
| `src/surfaces.ts` | Three loaders + `lazyWithPreload` registrations appended to `workerStatsSurfaces` |
| `src/index.ts` | Export new ids/props/loaders/preloads, breakdown fetch/hook/schemas, reason-label helpers |
| `src/components/WorkerStatsCard.tsx` | The 4-column strip becomes one row-level button (`onOpenTimeline` prop) — `WorkerStat` cells turn into non-interactive display cells; `onOpenSection` prop and per-column taps removed; a11y name summarizes the row ("Open <name>'s timeline"); test ids preserved |
| `src/pages/WorkerStatsSlidePage.tsx` | Provide `onOpenTimeline` (open timeline slide with worker identity + current roster range); `usePreloadSurface` for the timeline surface; remove the now-unused `openGranularitySlide` helper + granularity preload |

State ownership: `WorkerTimelineSlidePage` owns view mode + focused date (via `use-timeline-visible-dates`) and delegates window/query state to `use-timeline-window`; calendar components are presentation-only (props in, callbacks out); sheets own nothing beyond their selection callbacks. Parent props are an initial anchor only — after mount the page owns navigation (per intention §4: both-dates case anchors on the range's newest date, then normal 1-/3-day rules apply).

## Implementation plan

Bottom-up logic, top-down UI (`16_feature_workflow.md`):

1. **Types** — segment/step-record/breakdown schemas in `src/types.ts` (authored from the handoff `jsonc`; enums tolerant: `state` as literal union, `reason`/`ended_by` as `z.string()` open sets).
2. **Query key** — `worker-stats-keys.ts` addition.
3. **API** — breakdown fetch + query hook.
4. **Libs** — `pause-reason-labels` → `window` → `geometry` → `segment-adapter`, each with its vitest file as it lands (tests below).
5. **Hooks** — `use-current-minute` → `use-timeline-visible-dates` → `use-timeline-window` → `use-timeline-gestures`.
6. **Components** — gutter → date header row → day column → event block (+ markers, now indicator, empty state) → grid.
7. **Sheets** — date sheet, event sheet.
8. **Page** — `WorkerTimelineSlidePage` composing everything; floating controls per TaskDetailSlidePage (`edgeOffset` constant kept in sync with bottom padding; extra bottom padding so late-evening events are never covered).
9. **Surfaces + exports** — `surface-ids.ts`, `surfaces.ts`, `index.ts`.
10. **Entry wiring** — `WorkerStatsCard` row-level tap (`onOpenTimeline`, granularity taps removed, existing card tests updated) + `WorkerStatsSlidePage` opener/preload.
11. **Tests** — remaining component tests (incl. updated `WorkerStatsCard.test.tsx`: row tap opens timeline, columns no longer individually interactive); Playwright spec `tests/playwright/features/worker-stats/worker-timeline.spec.ts` (fixtures per `34_runtime_validation_local.md`), mobile project first, then desktop — full UI path: home → worker stats → tap totals row → timeline.
12. **`verify` pass** — drive the real flow (roster → totals-row tap → timeline → event → task detail; date navigation; picker; mode switch; error/empty states).

### Test matrix (from intention §36)

- **Adapter:** working/paused/ended-shift/idle mapping; unknown reason; unknown `ended_by`; missing item; SKU fallback; section fallback; open record (`exited_at: null`); truncated flag; UTC-midnight-split neighbors visually joinable; local-midnight split; record clipped to segment; open segment end = effective now; completion marker at `exited_at` (clipped when outside).
- **Geometry:** whole-hour, partial-hour, multi-hour, very-short (visual floor + 32 px hit target), marker grouping threshold.
- **Window/navigation:** initial parent date & range anchoring; single/three-day windows; today clamp with lower-bound shift; hysteresis (no request inside margin); window transition; rapid navigation → per-key isolation (no stale overwrite); picker three-day `D−2…D`; mode switch preserves focus date.
- **Totals validation (dev/test only):** per-state `sum(segment.seconds) === timeline.*_seconds` and `sum(pause_by_reason) === pause_seconds`; deviations logged via existing notify/console conventions, never blocking render.
- **Interaction (component/Playwright):** one-record → task detail; multi-record → chooser; idle inert; duplicate task grouping; completion visible in chooser; floating controls hide/reveal.

## Risks and mitigations

- Risk: pinch/pan conflicts with vertical scroll on iOS.
  Mitigation: direction-locked thresholds (D6); pinch only intercepts with two active touches; `touch-action: pan-y` on the grid; date-picker toggle is the guaranteed fallback.
- Risk: DST days break minute math.
  Mitigation: minutes computed from local clock components, not `(t − dayStart)/60000`; dedicated adapter tests around a DST boundary.
- Risk: cache-entry churn if the window rule recomputes per swipe.
  Mitigation: hysteresis rule (D2) — windows snap only past the margin; prefetch hides the seam.
- Risk: `segments_truncated` on an already-minimal five-day window loops retries.
  Mitigation: single automatic narrowing step (to the visible dates); if still truncated, terminal warning state prompting a narrower manual range.
- Risk: open-block extrapolation drifts from backend truth.
  Mitigation: extrapolate display-only from the minute clock; 60 s refetch reconciles; stable keys (`state|start|record ids`) minimize visual jumps.
- Risk: replacing per-column granularity taps with the row-level timeline tap removes the granularity drill-down's only UI entry (user-accepted). If it later needs re-exposing, its surface and page are intact.
  Mitigation: change confined to `WorkerStatsCard` + `WorkerStatsSlidePage`; granularity page/surface/exports untouched; card tests updated to lock in the new behavior explicitly.

## Validation plan

- `npm run typecheck`: zero errors.
- `npm run test -- --grep "time-line-calendar|timeline"` (stats package vitest): all new suites green; existing 40+ stats tests untouched.
- `npx playwright test --grep worker-timeline --project=mobile`: flow green (open, navigate, pick date, switch mode, open event → task detail, error/empty states).
- `npx playwright test --grep worker-timeline --project=desktop`: green (button navigation instead of gestures).
- Manual/`verify`: real worker with lunch + resume — idle tail renders as idle (not pause); batch working block lists all records; concurrent-pause records keep own reasons in the chooser; completed marker at the right minute.

## Review log

- `2026-07-19` `David`: supplied single-day + three-day design mockups (folded into §Design reference).
- `2026-07-19` `David`: clarifications resolved — (1) no entry-point interaction this phase, deferred; (2) ended-shift follows mockup line-marker styling; (3) date picker is a package-owned sheet on the `DayCalendar` primitive.
- `2026-07-19` `claude-fable-5`: plan updated — entry wiring removed from scope/files/steps; Playwright/verify open the surface programmatically.
- `2026-07-19` `David`: entry-point decision revised — the whole `WorkerStatsCard` totals row (one tap target) opens the timeline page, replacing the per-column granularity opens.
- `2026-07-19` `claude-fable-5`: plan updated — entry wiring reinstated as row-level tap; `WorkerStatsCard`/`WorkerStatsSlidePage` back in modified files; granularity page kept but entry-less; e2e uses the real UI path.
- `2026-07-19` `claude-fable-5`: IMPLEMENTED — 22 new files + 6 modified in `@beyo/stats`; typecheck clean; 95 stats vitest pass (56 new across adapter/window/geometry/labels/visible-dates/event-block/card).
- `2026-07-19` `claude-fable-5`: E2E GREEN — `tests/playwright/features/worker_stats/worker-timeline.spec.ts` (managers-app), 4 flows × mobile + desktop = 8 passed (mocked worker-stats endpoints, real auth): render (events/totals/completion/shift-end marker), multi-record chooser + inert idle, date navigation + 3-day picker, empty state. Finding: use-gesture `filterTaps` in `PullToRefresh` stops Playwright's synthetic mouse clicks under mobile emulation (misclassified as drags — affects ALL mobile specs clicking inside PullToRefresh, incl. pre-existing baseline failures); real devices unaffected. Workaround in spec: `tap()` on touch projects via a `press()` helper.
- `2026-07-20` `David`: raised `PX_PER_HOUR` 64→96 (1.6 px/min) so short sub-hour events render fully.
- `2026-07-20` `claude-opus-4-8`: backend tightened `completed_count` to shift-scoped (handoff addendum) — SHAPE UNCHANGED (still `int`), no FE change needed; schema comment updated to document it. Roster card reads `timeline.completed_count` directly; timeline strip derives "done" from shift-scoped segment completions — both already reflect the new semantics.
- `2026-07-21` `claude-opus-4-8` (user): sequential-steps bug fixed — a working/paused segment with multiple step records used to render as ONE block. Now `segment-adapter` clusters a segment's steps by time-overlap (`clusterSteps`): overlapping steps → one batch block (record count + chooser, unchanged); sequential/non-overlapping steps → separate consecutive blocks, each at its own clipped span, labelled + tappable per step; only the last cluster carries the segment's live/open treatment; completions attach to their owning cluster; outer edges clamp to the segment so blocks tile it. Applies to working AND paused. Verified against the user's exact data (1 block → 2 consecutive blocks). 129 vitest (+5 clustering), typecheck, 10/10 e2e.
- `2026-07-20` `claude-opus-4-8` (user): header no longer renders prev/next arrow buttons (the pager drag + date pill cover navigation) — `TimelineCalendarHeader` drops `canGoNext`/`onPrev`/`onNext`; totals strip text shrunk `text-sm`→`text-xs`. e2e date-nav switched from arrow clicks to a dispatched pointer swipe on the pager viewport (works on touch + desktop projects). typecheck + 124 vitest + 10/10 e2e.
- `2026-07-20` `claude-opus-4-8` (user): fixed the Close&Back footer not hiding on scroll — TWO root causes. (1) `use-scroll-visibility` binds its scroll listener to `scrollRef.current` ONCE on mount and never re-runs; the grid (scroll container) mounted only AFTER the loading skeleton, so the listener missed it. Fix: keep `TimelineGrid` (scroll container) ALWAYS mounted and render loading/error/empty as overlays (grid `children` moved to the wrapper, viewport-anchored; skeleton/error `absolute inset-0`; footer raised to z-50). (2) With `revealAtEdge: "bottom"` the edge-aware progress is written to `--scroll-hide-progress-footer`/`--scroll-snap-duration-footer`, but `FOOTER_STYLE` read the core `--scroll-hide-progress` — switched to the footer vars (matches `TaskDetailBottomActions`). Verified via simulated touch scroll: footerVar 0→1 (translateY→100%) on scroll-down, →0 on scroll-up. typecheck + 124 vitest + 10/10 e2e.
- `2026-07-20` `claude-opus-4-8` (user): vertical time-axis ZOOM added (chosen over min-height, which this dense sub-minute data would turn list-like). `geometry.ts` scale is now runtime `pxPerHour` (DEFAULT 96, MIN 40, MAX 600, step ×1.4); all geometry fns take `pxPerMinute`; consumers (gutter/column/block/marker/now) receive `pxPerHour`/`pxPerMinute` props. New `use-timeline-vertical-zoom` hook: pxPerHour state (so line-budgets recompute), two-finger pinch (rAF-throttled) + `zoomIn`/`zoomOut`, focal-point-stable via `scrollTop` adjust in a layout effect, non-passive native touchmove to block native pinch. New `TimelineZoomControl` (+/- buttons, non-gesture) — self-hides on coarse-pointer (touch) devices where pinch already covers it (via `(pointer: coarse)` media query; not width-based, so a narrow desktop window keeps the buttons). Pinch-for-mode-switch removed (`use-timeline-gestures` deleted; mode still on the date-sheet toggle). Verified: a 2-min pause goes 4px→20px (readable) at max zoom, day column 2304→14400px, focal scroll tracked; 124 vitest + typecheck + 10/10 e2e (added zoom test).
- `2026-07-20` `claude-opus-4-8` (user): three-day shift-marker labels no longer spill into the next column — `TimelineShiftMarker` gains a `density` prop; in compact/three-day it drops the connecting rule and renders the label as `flex-1 min-w-0 break-words text-right text-[10px]` so it is bounded to its column and wraps instead of overflowing (wide/single-day keeps the full rule + `shrink-0 text-xs`). Verified: label right/left measured within column bounds (`withinColumn: true`), 120 vitest (marker compact test added), typecheck, 8/8 e2e.
- `2026-07-20` `claude-fable-5` (user corrections): commit threshold lowered 35%→20% of viewport width; step granularity added — a CONTROLLED slide always steps ONE day (any mode), only a momentum fling (≥0.4px/ms) pages the full span (3 days in three-day mode), capped by `maxNextDays` near the today clamp (partial-page fling). `resolvePanSettleTarget` → `resolvePanSettle` returning `{direction, days}`; pager repositions by `days × columnWidth` (pages are a contiguous date strip, so 1-day settles land on column boundaries — the next page is now UNclamped `visibleDatesFor(f+span)`, future dates render as empty preview columns, never focusable); `useTimelineVisibleDates` gains `navigateBy(deltaDays)` + `maxNextDays` (header buttons still page by span). Verified: 120 vitest, typecheck, scripted 7-case drag matrix (clamp stay, 1-day controlled, 3-day fling both directions, clamp-capped partial fling, snap-back, 20% threshold), 8/8 e2e.
- `2026-07-20` `claude-fable-5`: Google-Calendar-style horizontal pager replaces the threshold-swipe navigation. New `lib/time-line-calendar/pager.ts` (pure: axis lock 8px, commit ≥35% width or same-direction fling ≥0.4px/ms with ≥24px, today-clamp rubber-band dx/3, trailing-100ms release velocity) + `components/time-line-calendar/use-timeline-pager.ts` (imperative track transforms, pointer capture on lock, non-passive touchmove preventDefault while locked-x, commit-then-reposition for seamless settle, trailing-click suppression, settle-interrupt jump, reduced-motion support). Grid restructured: fixed hour gutter + overflow-hidden viewport + 3-page track (prev|current|next; next absent at clamp) resting at translateX(-100%); pages from `useTimelineVisibleDates().pagerPages` (mirrors goPrev/goNext incl. clamped partial moves); grid now receives window-wide events so neighbor pages render content while sliding; initial vertical scroll now happens ONCE (position preserved across swipes, Google parity); now-line renders in any visible today column. `use-timeline-gestures` reduced to pinch-only. Verified: 118 vitest (12 new pager), typecheck, scripted mouse-drag checks (resistance transform exact, commit/snap-back/fling/clamp, no accidental event clicks), 8/8 e2e.
- `2026-07-20` `claude-opus-4-8`: now-line vs ended-shift-marker clash fixed — the current-time indicator is suppressed once "now" is past the day's last recorded activity edge (`dayLastActivityMinute` helper). During an active shift the open segment reaches now, so the line still shows; after clock-out it's dropped, removing the two-red-lines collision. 106 vitest (+ helper tests) + typecheck + 8/8 e2e.
- `2026-07-20` `claude-opus-4-8`: content-crop fix (Option A) — `eventLineBudget(height)` in geometry (1 line ≥20px, 2 ≥40px, 3 ≥58px); `TimelineEventBlock` builds content lines in source order and renders only `maxLines`, dropping from the bottom so the last visible line is never half-cut (replaces the old `showText`/overflow-clip). Pill occlusion (Option C) intentionally left. 103 vitest + typecheck + 8/8 e2e.
- `2026-07-20` `claude-opus-4-8`: backend addendum (recorded shift state) — schema updated additively. `WorkerLinearTimelineSegmentSchema` gains `manually_recorded: boolean`; segment-state enum gains `started_shift`. Zero-duration `started_shift`/`ended_shift` markers (`start==end`, `seconds:0`, `steps:[]`) handled in the adapter before the duration guard and rendered by a generalized `TimelineShiftMarker` (replaces `TimelineShiftEndMarker`; "Shift started" green / "Shift ended" orange line ticks). `manuallyRecorded` threaded to the view model. Free-text pause reasons already covered by `humanizeReason`. 100 vitest + typecheck clean + 8/8 e2e (fixtures now emit both markers + a manual pause).

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
