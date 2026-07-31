# CHANGELOG — clock kiosk capability

Every modification to the kiosk (any zone in `INDEX.md`'s coverage) appends
one entry here **in the same session as the change**, newest first. This file
is what makes the documentation trustworthy over time — an undocumented
change is an incomplete change.

## Entry format

```
## YYYY-MM-DD — <one-line what> (<agent/author>)
- Change: <what changed, file-level>
- Why: <intent / finding / user request>
- Impact: <seams touched per IMPACT_MAP; "none beyond zone" if contained>
- Docs updated: <zone docs + IMPACT_MAP rows touched, or "stamps only">
- Validation: <commands run + results>
```

---

## 2026-07-31 — Analytics contract sync: completed_items/week/rate replace segments/insights (Claude Fable)

- Change: the backend handoff was updated — every v1 endpoint flipped ✅ live,
  and `clock-out.analytics` (§5.1) was completely reshaped: the old
  `segments[]` drill-down and `insights[]` trend cards are gone, replaced by
  `completed_items[]`/`completed_items_truncated`/`week`/`rate`; `timeline`
  dropped to 3 buckets (`working/pause/idle_seconds` + `pause_by_reason`,
  which now includes a literal `"unspecified"` key with `pause_type: null`).
  Synced the full pipeline to match: (1) `@beyo/worker-shifts/types.ts` —
  rewrote `ClockOutAnalyticsSchema` + sub-schemas (new `AnalyticsCompletedItem/
  Week/Rate`, removed `AnalyticsSegment/Insight`), fixed
  `AnalyticsPauseReasonSchema.pause_type` to nullable (was throwing on the
  "unspecified" bucket — a live parse-crash risk once real data arrived),
  made `analytics.rate` required (always present in a populated response).
  (2) MSW fixtures/mocks rewritten to the new shape. (3)
  `lib/analytics-view-model.ts` rewritten: IN/OUT/worked no longer derive
  from `analytics` (segments are gone) — the controller now threads two
  client-captured moments through `KioskResult` (`clockedInAt` = pre-action
  `current.shift_started_at`, `clockedOutAt` = the moment the clock-out
  action resolves) and the view-model just formats their span; `insights` is
  gone from its output. (4) New `lib/summary-extras-adapters.ts`: a real
  default `summaryExtras` adapter mapping `analytics.completed_items/week/
  rate` straight to the kit's presentation types — replaces the old
  always-null `DEFAULT_ADAPTERS.summaryExtras` stub, since this data now
  arrives embedded in the clock-out response with no host query needed
  (closes gap-mapping §3/§4/§5). Weekly target is client hard-coded
  (`DEFAULT_WEEKLY_TARGET_HOURS`, 40h — the backend has no scheduling
  concept, ever). (5) Presentation types + components updated: `SummaryItems`
  item shape gained `id`/`reference` (was `name`, no stable key); `SummaryRate.
  baseline` is now `number | null` (`RateTile` renders "Not enough history
  yet" when null, matching the backend's "0 baseline days" case); `insights`
  prop is always `[]` (`InsightRow`/its `order-*` slot kept as dormant UI,
  not deleted). (6) `@beyo/stats` dependency dropped entirely from
  `clock-kiosk` (no more `insight-codes` import).
- Why: user confirmed the live handoff (`docs/handoff/from_backend/
  HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`) now reflects the
  real backend, and asked for the schemas to be verified correct against it.
  An audit found the analytics layer was still entirely on the OLD contract
  end-to-end (types → mocks → view-model → adapters) — not just the schema,
  which alone would have kept rendering an empty summary screen even once
  corrected.
- Impact: `@beyo/worker-shifts` parse boundary (zone 01), `analytics-view-
  model.ts` + `summary-extras-adapters.ts` + `kiosk-adapters.ts` DEFAULT_
  ADAPTERS (zone 04), `SummaryItems/Week/Rate` types + `ItemsCompletedCarousel`/
  `RateTile`/`SummaryScreen` (zone 05), gap-mapping table §3/§4/§5 now closed
  (zone 06). The app itself has NOT been flipped onto the live backend —
  `VITE_API_URL` unset, `VITE_FLOOR_MOCKS=1` still the default; that's a
  separate deliberate step (README "Mock And Live-Flip Runbook", updated).
  Also fixed an unrelated pre-existing inconsistency found while validating:
  `playwright.config.ts`'s `baseURL` fallback still pointed at port 5175
  after `vite.config.ts`/`webServer.url` had already been moved to 5177 —
  every e2e test was failing with "could not connect" until this was synced.
  Bundled a pre-existing uncommitted edit to `--color-kiosk-timer-out`
  (`#e0a526` → `#8cc2fe`) that was sitting in the working tree — not part of
  this change's intent, kept it and updated the zone 05 "where to change"
  table's color reference to match.
- Docs updated: `00` (dropped `@beyo/stats` from the dependency diagram),
  `01` (schema description, removed the now-moot insight-ratio-fraction
  rule, added the nullable-baseline rule), `04` (`analytics-view-model.ts`
  and `kiosk-adapters.ts` rows rewritten, new `summary-extras-adapters.ts`
  row, verification pointers), `05` (Summary component-inventory row), `06`
  (gap table with a Status column, mock/live boundary section rewritten —
  endpoints live but app not yet flipped, wiring recipe split by
  host-query vs embedded-data gaps), `IMPACT_MAP.md` (`analytics-view-
  model.ts` row rewritten, new `summary-extras-adapters.ts` row, mock-
  fixture/barrel rows), `INDEX.md` (insights fixed-decision retired, new
  weekly-target fixed-decision), package README (component contract table,
  Mock And Live-Flip Runbook), this entry.
- Validation: `tsc --noEmit` clean on `worker-shifts`, `clock-kiosk`, and
  floor-app (`tsconfig.app.json` + `tsconfig.json`); `test:worker-shifts`
  41/41 (1 fixture assertion updated for the new field name); `test:clock-
  kiosk` 43/43 (analytics-view-model.test.ts rewritten around the new
  clock-timestamp signature — dropped ~19 cases that tested the now-gone
  segment/insight permutations, added a new `summary-extras-adapters.test.ts`
  with 4 cases); floor `test:unit` 9/9 (unaffected); Playwright 30/30 across
  mobile/tablet/desktop (2 `kiosk-summary` specs rewritten for the new
  contract + `page.clock.install()` for deterministic client-captured OUT
  times; 1 pre-existing port-mismatch bug fixed along the way); floor
  `lint` clean.

## 2026-07-30 — Amber clock-out ring, faster clock-in return, keypad bottom-row swap (Claude Fable)

- Change: (1) ring colors moved to single-source tokens
  `--color-kiosk-timer-in` (green) / `--color-kiosk-timer-out` (**amber
  `#e0a526`**) in `@beyo/styles`; `CheckHero` picks by tone, `WorkedTodayPlate`
  uses `-out`. (2) New `lib/auto-return.ts`: clock-in results now return at
  `CLOCK_IN_AUTO_RETURN_FACTOR` (0.5) of the configured window (12s → 6s),
  clock-out unchanged; floor `MIN_AUTO_RETURN_SECONDS` 2s. Controller passes
  results through it, so timer and ring share one number. (3) Keypad bottom
  row swapped to **submit · 0 · delete** with lucide's `Delete` icon;
  `lucide-react` added as a package peer + floor app dependency.
- Why: user requests — amber clock-out ring (with an easy place to re-tint),
  clock-in 50% faster, and a bottom row matching the familiar PIN-pad layout.
- Impact: kit + a controller call site + `@beyo/styles` tokens (additive) +
  one new pure lib module. `npm install` ran for `lucide-react` — native
  bindings verified intact afterwards (zone 07 hazard #2).
- Docs updated: `04` (auto-return module row), `05` (where-to-change table,
  keypad row), package README contracts (Keypad, CheckHero, WorkedTodayPlate,
  KeypadScreen `onRefresh`), this entry.
- Validation: tsc clean; clock-kiosk 58/58 (4 new `auto-return.test.ts` cases
  pinning the 0.5 factor + floor); floor unit 9/9; Playwright 9/9 ×
  mobile/tablet/desktop (the auto-return spec's expectation updated 4s → 2s —
  the behavior change, asserted deliberately); floor lint clean; keypad +
  amber-ring screenshot-verified on tablet.

## 2026-07-30 — Auto-return ring, keypad pull-to-refresh, kiosk gesture hardening (Claude Fable)

- Change: (1) the auto-return countdown is now a smoothly depleting SVG ring
  (`.kiosk-ring` in `@beyo/styles`) — around `CheckHero` on clock-in/plain
  clock-out, around `WorkedTodayPlate` on the summary; the textual caption is
  `motion-reduce`-only + an always-on `sr-only` live region. (2) KeypadScreen
  swapped VSA → `PullToRefresh` (workers-app pattern) with a controller-
  injected `onRefresh` → awaited roster refetch; other screens gained
  `overscroll-contain`. (3) Floor app: `touch-action: pan-x pan-y` +
  iOS `gesturestart` guard (no pinch/double-tap zoom, no pull-down reload).
  (4) e2e: new `pressControl` tap/click helper for controls inside PTR.
- Why: user requests after the phone rehearsal — PWA gesture discipline,
  pull-to-refresh on query screens, and the countdown as an animated border
  on the check badge / hours plate.
- Impact: kit + controller keypad slice (`onRefresh`, additive) + floor
  `index.css`/`main.tsx` + spec helper. Two hazards exercised: SVG geometry
  attrs reject `calc()` (fixture-caught); PTR click-swallowing on touch
  projects (memoized hazard, now doc'd as zone 07 #6).
- Docs updated: `04` (onRefresh), `05` (Scrolling & PTR split, ring section,
  gesture hardening), `07` (hazard #6), this entry.
- Validation: tsc clean; kiosk 54/54; floor unit 9/9; ui 162/162; Playwright
  9/9 × mobile/tablet/desktop (cold); ring screenshot-verified mid-animation
  on tablet (check-circle + plate).

## 2026-07-30 — Phone plate overlap fixed + VerticalScrollArea adoption (Claude Fable)

- Change: `DarkTimePlate` + `WorkedTodayPlate` — hero numerals 40px base
  (design readme's phone spec; 58/64px from `sm:`), `flex-wrap` +
  `whitespace-nowrap` labels so side columns wrap below instead of
  overpainting. All four flow screens swapped from native `overflow-y-auto`
  to `@beyo/ui VerticalScrollArea` (kiosk-tinted hairline scrollbar);
  screen testids moved to the primitive's outer element.
- Why: operator's phone rehearsal screenshot — clock-in time overpainted the
  SCHEDULED column at 52px on ~390px viewports; native scrollbar looked wrong
  on the paper design. User requested the package primitive.
- Impact: kit-only (zone 05); prop contracts unchanged; screen testids
  unchanged in name. Screenshot-verified on mobile (plate + summary).
- Docs updated: `05` (plate wrap note + new Scrolling section), this entry.
- Validation: tsc clean; `test:clock-kiosk` 54/54; Playwright 9/9 on each of
  mobile/tablet/desktop, cold server.

## 2026-07-30 — F6 physical-device rehearsal PASSED on phone (operator)

- Change: none (validation event). The always-on rehearsal script was run on
  a physical phone over LAN; one blocker found and fixed during the run (the
  insecure-context session-id crash below). Operator confirms the rehearsal
  passed; deeper debugging on the target iPad is planned later.
- Why: final review finding F6 — the one gate no agent can automate.
- Impact: closes the capability's last open manual item. iPad-specific pass
  remains a nice-to-have follow-up, not a gate.
- Docs updated: this entry; memory updated.
- Validation: manual, per the script in `packages/clock-kiosk/README.md`.

## 2026-07-30 — Session-id generation survives insecure contexts (Claude Fable)

- Change: `kiosk-flow.store.ts` `createSessionId()` — `crypto.randomUUID` →
  fallback chain (`getRandomValues` hex → time+random) with a comment stating
  uniqueness-not-cryptography intent.
- Why: F6 physical-device rehearsal (operator) crashed at `KioskProvider`
  mount over LAN http — `crypto.randomUUID` is secure-context-only; the
  kiosk white-screened behind the router error boundary right after sign-in.
- Impact: store spine only (IMPACT_MAP "kiosk-flow.store" row) — id shape is
  opaque to all consumers; no seam change.
- Docs updated: `04` (session-id mention), `07` (new hazard #5: LAN device
  testing = insecure context, incl. MSW fallback mode), this entry.
- Validation: `tsc -p packages/clock-kiosk` clean; `test:clock-kiosk` 54/54.

## 2026-07-30 — Capability v1 complete (Claude Fable, orchestrator)

- Change: the entire capability, built in phases 1→2→3→4→6→7 (5 shelved) with
  a Codex-implements / Opus-reviews / Fable-designs-and-orchestrates loop.
  Final state: `@beyo/worker-shifts` (domain), floor device auth
  (api-client/auth floor gates), `apps/floor-app` (thin shell, port 5175),
  `@beyo/clock-kiosk` (flow + components + adapters + summary), `rise`
  surface type in `@beyo/ui`, kiosk tokens in `@beyo/styles`,
  `@beyo/stats/insight-codes` subpath. Commits `bd939800` → `e8a35e19`.
- Why: user capability request 2026-07-29; full decision record in the
  archived master plan (`docs/architecture/archives/implementation/
  PLAN_clock_kiosk_master_20260729.md`) and its Review log.
- Impact: everything — this entry is the baseline these docs describe.
- Docs updated: entire documentation set created (INDEX, 00–07, IMPACT_MAP,
  this file), stamped at commit `e8a35e19`.
- Validation: Opus final review verdict **complete-with-notes, master
  criteria 1–9 all PASS** (2026-07-30); matrix at stamp: typecheck 0 ·
  worker-shifts 40 · clock-kiosk 54 · floor 9 · ui 162 · auth 3 ·
  api-client 3 · Playwright 9×3 projects, cold server.
- **Open item**: F6 — physical-device always-on rehearsal (operator task;
  script in `packages/clock-kiosk/README.md`). Record its result as the next
  entry when run.
