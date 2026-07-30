# PLAN_clock_kiosk_phase6_clock_out_summary_20260729

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase6_clock_out_summary_20260729`
- Status: `archived`
- Owner agent: Codex (implementer) / Claude Fable (kit + author) / Opus (reviewer)
- Created at (UTC): `2026-07-29T13:30:00Z`
- Last updated at (UTC): `2026-07-30T07:46:02Z`
- Master plan: `../PLAN_clock_kiosk_master_20260729.md`
- Depends on: Phase 4 archived. (Phase 5 is shelved — master decision #10; this phase follows Phase 4 directly.)
- Backend contract: handoff §5.1 (`analytics`) — **`analytics` is `null` until backend phase 7, and `null` thereafter in degraded mode; the plain success screen must always remain the fallback.**
- Design ground truth: `../image_design/clock_out_result.png` + readme (clocked-out summary section). The items carousel, week chart, and rate tile are **design-ahead GAPs** fed by adapters — see `../BACKEND_REQUIREMENTS_clock_kiosk_20260729.md` #1–#5.
- Claude kit (before Codex; read-only): summary component kit — see contract below.

## Goal and intent

- Goal: replace the Phase 4 plain clock-out success with the full summary screen — hours-worked dark hero, items-completed carousel, this-week bar chart, rate tile, factual insight rows — rendering complete from mock `analytics` + placeholder adapters, and degrading to the plain screen when `analytics: null`.
- Intent: the worker's walk-away moment shows their day; backend phases later light up the GAP tiles with zero UI change.
- Non-goals: no payroll semantics (insights are indicative — handoff freshness caveat rendered as-is, not corrected client-side); no backend work; no manager stats surfaces.

## Scope

- In scope: `@beyo/clock-kiosk` — `KioskAdapters` interfaces (`ScheduledShiftAdapter`, `AnnouncementsAdapter`, `SummaryExtrasAdapter` with `items`/`week`/`rate`), analytics→view-model mapping module, summary screen assembly, clock-in result upgrades that share adapters (scheduled plate column, announcements section).
- Out of scope: real adapter implementations beyond defaults (defaults return null/empty); `@beyo/worker-shifts` (types already parse analytics since Phase 1).
- Assumptions: Phase 1's populated-analytics mock fixture is the render source in dev/tests.

## Kit contract (Claude-owned; Codex read-only)

| Component | Key props |
|---|---|
| `SummaryScreen` | slots/props below + `onDone()`, `countdownSeconds` (auto-return still applies; longer default acceptable via same device config) |
| `SummaryHeader` | `title` ("Shift complete, {first}"), `subtitle` (role · date), small avatar |
| `WorkedTodayPlate` | `worked: string` ("8h 12m"), `in: string`, `out: string` — dark plate, mono numerals |
| `ItemsCompletedCarousel` | `items: {name, imageUrl, units}[]`, `totalUnits`, `lineCount` — horizontal scroll, `BackendImage`-based; **omitted entirely when items is null/empty** |
| `WeekBarChart` | `days: {label, workedSeconds, isToday}[]`, `targetSeconds`, `loggedSeconds` — today accent-filled; omitted when null |
| `RateTile` | `unitsPerHour`, `baseline`, `baselineDays` — omitted when null |
| `InsightRow` | `text`, `delta: {value: string, polarity: "positive" \| "negative" \| "neutral"}` — signed mono delta, green/error/neutral color |
| Clock-in additions | `DarkTimePlate` right column (`SCHEDULED hh:mm – hh:mm`) when scheduled adapter resolves; `AnnouncementsList` (`items: {title, body, accent, date}[]`, max 3) with section label "TODAY ON THE FLOOR" |

Phone ordering rule (design readme): on phone the summary page scrolls; order hours → insights → items carousel → week chart.

## Clarifications required

- (none — mapping and degradation are fixed by handoff §5.1 + master mapping table)

## Acceptance criteria

1. `lib/analytics-view-model.ts` (pure, unit-tested) maps `ClockOutAnalytics` → the summary view model: IN = `started_shift` marker start, OUT = `ended_shift` marker, worked = wall-clock span formatted "Xh Ym"; insight rows from `insights[]` via a code→copy map (unknown codes render a generic factual line from `metric` + delta; `polarity` → color; `delta_pct`/absolute formatting rules documented in the module); `segments_truncated` tolerated; `transitioned_steps` notice retained.
2. `analytics: null` → **exactly** the Phase 4 plain success screen (regression-tested); partial data (e.g. `insights: []`, missing markers) degrades per-tile, never crashes; unknown extra keys ignored.
3. `KioskAdapters` defined in `@beyo/clock-kiosk` types, injected via `KioskProvider` props with defaults returning `null`/`[]`; the floor app passes nothing (defaults) in v1. Every GAP tile/section (`items`, `week`, `rate`, scheduled column, announcements) renders **only** when its adapter yields data — with defaults, the summary shows hero + insights (+ transitioned notice) and the clock-in screen shows no announcements section and no scheduled column, all layouts still balanced (kit guarantees).
4. Dev/showcase mode: with `VITE_FLOOR_MOCKS=1`, mock adapters (fixtures matching the design images' data) can be enabled via a single dev-only flag so the full design is visually verifiable — excluded from production defaults.
5. Auto-return + every-path-to-keypad invariants hold on the summary screen (session-id rule; scrolling pauses nothing).
6. Tests: vitest — mapping module (markers, formats, insight codes, null/partial degradation), adapter gating; Playwright (mocked, mobile then desktop): clock-out with full analytics renders all present sections in the right order per breakpoint; clock-out with `analytics: null` shows the plain screen.
7. Root typecheck green; public API audited (adapters + provider props exported; mapping internals not).

## Contracts and skills

### Contracts loaded

- Core set (guide) + `07_components.md`, `10_pages.md`, `24_dto.md` (the mapping module IS the view-model layer), `27_responsive.md`, `31_animations.md`, `32_loading_skeletons.md`, `35_shared_packages.md` §13 (adapter/opener injection is the same seam), `17_testing.md`, `34_runtime_validation.md` (+`_local`).

### File read intent — pattern vs. relational

Permitted relational reads: `packages/worker-shifts/src/types.ts` (exact analytics schema); Phase 1's populated fixture; kit component prop types; `packages/stats/src` **only** to confirm no existing insight-code→copy map exists to reuse (if one exists, import it rather than fork — record the finding in the Review log).
Prohibited: pattern reads.

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`. The week bar chart is kit-owned (Claude) — no charting library is introduced; it is CSS bars per the design.

## Implementation plan

1. `KioskAdapters` types + provider props + defaults (criterion 3).
2. Mapping module + tests (criteria 1–2).
3. Summary assembly on the Phase 4 result slot; clock-in additions (scheduled column, announcements) behind adapters (criterion 3).
4. Dev showcase adapters (criterion 4).
5. Tests (criterion 6); typecheck + API audit (criterion 7).

## Risks and mitigations

- Risk: summary blocks the walk-away moment on slow devices. Mitigation: the screen renders from the clock-out response already in hand — no extra fetch; images lazy via `BackendImage`.
- Risk: insight copy drifts from "factual, not motivational" (design rule). Mitigation: code→copy map reviewed at kit approval; unknown codes use the neutral generic line.

## Validation plan

- `npm run typecheck`: zero errors.
- `npm run test:clock-kiosk`: green.
- `npx playwright test --grep kiosk-summary --project=mobile` then `--project=desktop`: green (mocked).

## Review log

- 2026-07-30 Codex: Phase 6 implemented and validated. Added one pure
  marker-based analytics view-model, existing `@beyo/stats` insight-copy reuse
  through a narrow subpath, exported scheduled/announcements/summary adapters
  with null/empty defaults, `VITE_FLOOR_MOCKS=1` showcase data, rich-summary
  assembly, clock-in scheduled/announcement assembly, and null/partial
  regression coverage. Validation passed: root typecheck; kiosk 34/34;
  summary Playwright mobile 2/2 then desktop 2/2; full kiosk spec 7/7 on both;
  floor lint/build; production fixture exclusion; diff check. No kit component
  was edited. Kit contract finding: the committed `AnnouncementsList` does not
  render its planned date; the adapter preserves ISO `date` for a future
  Claude-owned additive visual update.

## Lifecycle transition

- Current state: `archived`
- Transition owner: Codex session
