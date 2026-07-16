# PLAN_worker_stats_insights_20260715

## Metadata

- Plan ID: `PLAN_worker_stats_insights_20260715`
- Status: `under_construction`
- Owner agent: `claude`
- Created at (UTC): `2026-07-15T00:00:00Z`
- Last updated at (UTC): `2026-07-15T00:00:00Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_worker_stats_last_interacted_steps_20260715` (§`insights`) + backend "Worker Insights Engine" README
- Intention plan: `docs/architecture/under_construction/intention/new_worker_stats_page.md`
- Builds on: `docs/architecture/archives/implementation/PLAN_worker_stats_page_20260715.md` (implemented — `@beyo/stats`)

## Goal and intent

- Goal: Surface the backend's per-worker `insights` on the worker-stats card as a single **top-insight full-width band** (styled per the attached picture), and make it **tappable** to open a **bottom-sheet package page** listing all of the worker's insights (0–3) in priority order, each with a short "how to read it" explanation.
- Business/user intent: Give managers a plain-language read on each worker's day vs. that worker's own baseline (e.g. "Completion surge — 5 more than usual"), with a drill-in that teaches how to read each signal.
- Non-goals: no new fetch (insights ride the existing response); no server prose (copy authored client-side); no history/charts; no per-insight deep links.

## Scope

- In scope:
  1. `@beyo/stats` schema + DTO: parse row-level `insights[]`; expose `insights` (known-code-filtered, server order) + `topInsight` (resolved copy) on `WorkerStatsCardViewModel`.
  2. Copy layer `packages/stats/src/lib/insight-copy.ts`: `resolveInsightCopy(insight) → { code, title, rightValue, tone } | null` (null for unknown codes) + `INSIGHT_EXPLANATIONS[code]` for the sheet.
  3. `WorkerStatsCard`: full-width insight band (top insight) between header and footer; the band is a button calling `onOpenInsights(insights)`. No band when empty.
  4. Package `WorkerInsightsSheetContent` (presentational list) + `WorkerStatsInsightsSheetPage` (package page, reads surface props) — a **package-owned `sheet` surface** exposed via `loadWorkerStatsInsightsSheetPage()` (§14) and registered in `workerStatsSurfaces`.
  5. `WorkerStatsSlidePage` wires `onOpenInsights` → `useSurfaceStore.getState().open(WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID, { insights, workerName })` (self-contained package surface — the `@beyo/upholstery` model; no app changes).
  6. Tests: copy/DTO units, card band render + tap, sheet content render.
- Out of scope: everything under Non-goals.
- Assumptions:
  - `insights` is a **worker-row-level** array (sibling of `daily_stats`), 0–3 items, **already sorted strongest-first** by the server (severity, then magnitude). We preserve server order and never re-sort.
  - **Trust `polarity`** for valence — never infer from `delta`'s sign (per the engine README: rising pauses is negative though the number rose).
  - Card shows only `insights[0]`; the sheet shows all. Empty list → nothing renders (normal).
  - The sheet is a **package page on a package-owned surface** (decision 3), registered by `@beyo/stats` and rendered on the app's surface stack — the managers app already spreads `workerStatsSurfaces`, so **no app-side wiring is required** and no §13 opener injection is used.

## Clarifications — RESOLVED

- [x] **Placement** → **full-width band** between header and footer (per the picture; user confirmed the "column-2 row" wording was a mistake).
- [x] **Sheet ownership** → **package page on a package-owned surface** (contract 35 §14 loader + `workerStatsSurfaces` registration; opened via `useSurfaceStore`, mirroring `@beyo/upholstery`'s self-contained sheets). No app changes, no §13 injection.
- [x] **Schema** → provided (Worker Insights Engine README); matches the handoff fields. `Insight` = `{ code, polarity, metric, target_value, baseline_value, delta, delta_pct (null when baseline 0), sample_size, severity }`, row-level. `on_a_roll`: `target_value` = streak length (days), `baseline_value` = bar cleared.
- [x] **Copy families** → grounded in the engine catalog (below); `rising_pauses` (`avg_pause_seconds`) is the picture's "Idle longer than usual". Copy strings remain yours to fine-tune, but the mapping/format is locked.
- [ ] **Trend icon** (minor, build-time): filled triangle up=positive / down=negative in a tinted circle. Proposed lucide `Triangle` (down = `rotate-180`) or `TrendingUp`/`TrendingDown`. Pick during build.

### Copy + right-value spec (grounded in the engine catalog)

Right-value families by metric:
- **count** (`completed_count`, `shift_end_count`): `"{target} vs {baseline}"` (rounded integers) — e.g. `8 vs 3`.
- **ratio** (`focus_ratio`, `throughput`, `avg_pause_seconds`, `fragmentation`, `resolve_rate`): `"{ratio}× baseline"`, `ratio = round(target/baseline, 1)` — e.g. `2.2× baseline`. Guard `baseline === 0` → omit right value (or use `delta_pct`).
- **streak** (`on_a_roll`): title carries the streak; right value `"prev best {baseline}"`.

| `code` | polarity | metric | band title | right value |
|---|---|---|---|---|
| `completion_surge` | positive | `completed_count` | "Completion surge — {delta} more than usual" | `{target} vs {baseline}` |
| `completion_dip` | negative | `completed_count` | "Completion dip — {abs(delta)} fewer than usual" | `{target} vs {baseline}` |
| `on_a_roll` | positive | `completed_count` | "On a roll — {target}-day streak" | `prev best {baseline}` |
| `deep_focus` | positive | `focus_ratio` | "Deep focus" | `{ratio}× baseline` |
| `faster_pace` | positive | `throughput` | "Faster pace" | `{ratio}× baseline` |
| `slower_pace` | negative | `throughput` | "Slower pace" | `{ratio}× baseline` |
| `rising_pauses` | negative | `avg_pause_seconds` | "Idle longer than usual" | `{ratio}× baseline` |
| `leaving_steps_mid_shift` | negative | `shift_end_count` | "Leaving steps mid-shift" | `{target} vs {baseline}` |
| `choppy_work` | negative | `fragmentation` | "Choppy work" | `{ratio}× baseline` |
| `quality_watch` | negative | `resolve_rate` | "Quality watch" | `{ratio}× baseline` |

`INSIGHT_EXPLANATIONS[code]` (sheet only) — one plain sentence each, e.g. `rising_pauses`: "Average pause length ran longer than this worker's usual for this weekday — possible blockers." Include a `sample_size` note ("vs their last {sample_size} same-weekdays"). Full explanation strings authored in `insight-copy.ts`, easy to tweak.

## Acceptance criteria

1. A worker with a known-code insight renders a **full-width band** between header and footer: trend icon + title left, metric right; **green for `positive`, amber for `negative`** (tone from `polarity`, matching the picture).
2. `insights: []` or only unknown codes → **no band**, card otherwise unchanged.
3. The band is a button (accessible label); tapping opens the insights bottom sheet listing all of the worker's insights in server order, each with title + right value + explanation + sample-size note.
4. Copy is 100% client-derived from `code` + numbers; unknown codes are filtered everywhere; valence follows `polarity`, not `delta` sign.
5. The sheet is a package `sheet` surface, code-split via `loadWorkerStatsInsightsSheetPage()` and registered in `workerStatsSurfaces`; opened through `useSurfaceStore`. No managers-app source changes.
6. `@beyo/stats` + managers app type-check; new tests pass; existing card tests stay green.

## Contracts and skills

### Domain schemas consulted (relational)

- Backend "Worker Insights Engine" README + handoff §`insights`: exact `Insight` fields, polarity/severity semantics, metric catalog, `on_a_roll` streak semantics, "copy is client-side," empty-normal, in-progress-day suppression.
- `packages/stats/src/{types.ts, lib/worker-stats-dto.ts, components/WorkerStatsCard.tsx, pages/WorkerStatsSlidePage.tsx, surface-ids.ts, surfaces.ts, index.ts}`: current package to extend.
- `packages/upholstery/src/{surfaces.ts, pages/UpholsteryProviderFilterSheetPage.tsx, components/ItemUpholsteryField.tsx}`: the self-contained package-owned `sheet` surface + `useSurfaceStore.getState().open(...)` precedent to mirror.

### Contracts loaded (how to write)

- `architecture/35_shared_packages.md` **§14** (page via `loadXxxPage()` loader; register with `lazyWithPreload`) + §6/§8 (package surfaces spread into the app; barrel). §13 is **not** used (surface is package-owned, not app-injected).
- `architecture/24_dto.md` (insights → resolved view models), `07_components.md` (band + sheet content), `28_surfaces.md`/`28_surfaces_local.md` (`sheet` type), `30_dynamic_loading.md`/`_local.md` (`lazyWithPreload`, preload), `02_types.md`, `15/16` workflow, `17_testing.md`/`34_runtime_validation_local.md`.

### Skill selection

- `run`/`verify` for the drive-through (open slide → tap band → sheet). No `dataviz`.

## Implementation plan (bottom-up)

### A. Types — `packages/stats/src/types.ts`
1. Add `InsightPolaritySchema` (`positive|negative`), `InsightSeveritySchema` (`low|medium|high`), and `WorkerInsightSchema` = `{ code: z.string(), polarity, metric: z.string(), target_value: z.number(), baseline_value: z.number(), delta: z.number(), delta_pct: z.number().nullable(), sample_size: z.number().int(), severity }`. Export `WorkerInsight` type.
2. `WorkerStatsRowSchema`: add `insights: z.array(WorkerInsightSchema).default([])` (row-level; default guards envs not yet emitting it).

### B. Copy layer — `packages/stats/src/lib/insight-copy.ts` (+ `.test.ts`)
3. `KNOWN_INSIGHT_CODES`, `resolveInsightCopy(insight) → { code, title, rightValue, tone: "positive"|"negative" } | null` (null on unknown code), using the family rules + table above; `formatRatio`, `baseline===0` guard.
4. `INSIGHT_EXPLANATIONS: Record<string,string>` + `sampleSizeNote(n)`.

### C. DTO — `packages/stats/src/lib/worker-stats-dto.ts`
5. `WorkerStatsCardViewModel`: add `insights: WorkerInsight[]` (filtered to known codes, order preserved) and `topInsight: ReturnType<typeof resolveInsightCopy>` (from `insights[0]`).
6. Populate in `toWorkerStatsCardViewModel` from `row.insights`.

### D. Card band — `packages/stats/src/components/WorkerStatsCard.tsx`
7. Add prop `onOpenInsights?: (insights: WorkerInsight[]) => void`.
8. Between the header `div` and the footer grid, when `worker.topInsight`: a full-width `<button>` tinted by `tone` (`INSIGHT_BAND_CLASS` positive=green / negative=amber, matching the picture), left = circular trend icon + `title` (truncate), right = `rightValue` (`shrink-0 tabular-nums`), `data-testid={`worker-stats-insight-${userId}`}`, `aria-label={title}`, `onClick={() => onOpenInsights?.(worker.insights)}`. Keep `overflow-hidden` so the tint respects rounded corners.

### E. Sheet content — `packages/stats/src/components/WorkerInsightsSheetContent.tsx`
9. Props `{ workerName?: string; insights: WorkerInsight[] }`. Title ("Insights — {workerName}"), then each insight (server order): tinted icon + title + rightValue + `INSIGHT_EXPLANATIONS[code]` + sample-size note. Empty guard. Presentational.

### F. Package-owned sheet surface
10. `surface-ids.ts`: `export const WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID = "worker-stats-insights-sheet";` + `preloadWorkerStatsInsightsSheetSurface()` (dynamic import of the page). Add `WorkerStatsInsightsSheetProps = { insights: WorkerInsight[]; workerName?: string }`.
11. `pages/WorkerStatsInsightsSheetPage.tsx`: `useSurfaceProps<WorkerStatsInsightsSheetProps>()` → `<WorkerInsightsSheetContent insights={insights} workerName={workerName} />`. `data-testid="worker-stats-insights-sheet"`.
12. `surfaces.ts`: `loadWorkerStatsInsightsSheetPage()` + `lazyWithPreload`; add to `workerStatsSurfaces`: `[WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID]: { surface: "sheet", component: … }`. Export `preloadWorkerStatsInsightsSheetSurface`.

### G. Wire the card open — `pages/WorkerStatsSlidePage.tsx`
13. Import `useSurfaceStore` (`@beyo/ui`) + the sheet id. Pass to each card: `onOpenInsights={(insights) => useSurfaceStore.getState().open(WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID, { insights, workerName: worker.username })}`. (Package-owned surface → direct open is the established `@beyo/upholstery` pattern.) Optionally `usePreloadSurface(preloadWorkerStatsInsightsSheetSurface)`.

### H. Public API — `index.ts`
14. Statically export: `WorkerInsightsSheetContent`, copy helpers (`resolveInsightCopy`, `INSIGHT_EXPLANATIONS`), types (`WorkerInsight`, `WorkerStatsInsightsSheetProps`), `WORKER_STATS_INSIGHTS_SHEET_SURFACE_ID`, `preloadWorkerStatsInsightsSheetSurface`, `loadWorkerStatsInsightsSheetPage`. The sheet **page** is only via the loader (§14 — never statically re-exported).

### I. Tests
15. Units: `resolveInsightCopy` per family (count/ratio/streak, `baseline 0` guard, unknown → null); DTO (`topInsight`/`insights` filter + order, empty → null).
16. Component: `WorkerStatsCard` renders band for positive & negative, none when empty, fires `onOpenInsights` on tap; `WorkerInsightsSheetContent` renders N rows + explanations.

## Risks and mitigations

- Risk: valence rendered from `delta` sign instead of `polarity` (rising pauses shows green).
  Mitigation: tone derives strictly from `insight.polarity`; unit test the `rising_pauses` case.
- Risk: authored copy drifts / unknown code rendered raw.
  Mitigation: copy centralized + approval-gated; unknown codes filtered in the DTO, never reach the UI.
- Risk: sheet shows a stale snapshot after the realtime invalidation refetches the list.
  Mitigation: v1 passes a snapshot into sheet props (read-only explainer) — acceptable; note as known limitation.
- Risk: backend not yet emitting `insights` in an env.
  Mitigation: schema defaulted to `[]` → renders nothing.

## Validation plan

- `npm run typecheck` (stats + managers app): zero errors.
- `npm run test:stats`: new copy/DTO/card/sheet tests pass; existing card tests green.
- `npm run build --workspace managerbeyo-app-managers`: sheet page emits its own lazy chunk (no `[INEFFECTIVE_DYNAMIC_IMPORT]`).
- `npx playwright --grep worker-stats` (mobile then desktop): band visible for a worker with insights → tap → sheet lists insights + explanations → dismiss.
- Manual (`run`): green/amber tones + right-values match the picture.

## Review log

- `2026-07-15` `claude`: drafted from handoff §insights + `surfaceOpeners` precedent; 5 clarifications raised.
- `2026-07-15` `owner`: resolved — (1) full-width band, (2) copy grounded in engine catalog (rising_pauses = "Idle longer than usual"), (3) package-owned sheet surface (no §13/app changes), schema provided. Only the trend-icon choice remains (build-time). Ready for Codex.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` — no blocking clarifications; ready to hand to Codex.
- Transition owner: `claude`
