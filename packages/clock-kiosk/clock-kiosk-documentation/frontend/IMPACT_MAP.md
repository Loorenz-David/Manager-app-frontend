# IMPACT MAP — "if I change X, what breaks up/down the line?"

Last verified: 2026-07-31

**Mandatory reading before ANY code change.** Find the row(s) for what you're
touching; the right column is your checklist of places to verify (and whose
zone docs to update). If your change creates a seam this map doesn't have,
ADD THE ROW — that's how the map stays alive.

## Seam table

| If you change… | It propagates to… (verify each) |
|---|---|
| **`@beyo/worker-shifts` schemas** (`types.ts`) | Parse boundary for EVERY response: too-strict → 502s kill roster identification / confirm / clock-out result. → controller + `analytics-view-model` consumers, adapter context types (`clock-kiosk/types.ts`), mock fixtures + handlers, floor Playwright route stubs, `types.test.ts` round-trips. Tolerance tiebreaker rule (zone 01) applies. |
| **Roster query behavior** (interval, staleness, error) | Keypad matchability + the offline `statusNotice` path + email mode (also roster-based) → controller outage branch, `use-kiosk-flow.controller.test.tsx` offline cases, keypad e2e. Roster mounts ONLY under `FloorKioskRoute` (unauth mount = false revocation on sign-in). |
| **`fetchFreshCurrentShift` / current-shift semantics** | Invariant 1. Confirm's single-action decision, 409 recovery, post-action refetch, `scheduledShift` adapter context, "exactly 2 `/current` per journey" e2e assertions. |
| **Clock action endpoints/hooks** | Result construction (`transitioned_steps` notice, `analytics`), 409-as-refresh path, double-clock protection (non-409 → stay on confirm with retry). |
| **`kiosk-flow.store.ts` transitions/shape** | THE spine. Controller orchestration, both surface pages' context reads, session-id race + reset guarantees (invariants 3+5), store tests, every journey e2e. Any new state MUST carry `sessionId` and be reachable-from/returnable-to `keypad`. |
| **Controller** (`use-kiosk-flow.controller.ts`) | The five invariants live here — re-verify each against its pinning test (zone 04 list). Also: keydown guards (editable targets/foreign surfaces), timers incl. hidden-tab, `statusNotice` vs `error` exclusivity. |
| **Kit component props** (`components/**`) | Ownership rule: additive-optional only outside a design session. → README contract tables, both surface pages + `ClockKioskPage` call sites, showcase, `data-testid` consumers in Playwright, barrel exports, zone 05. |
| **Kiosk tokens / fonts** (`@beyo/styles`, font faces) | Every kiosk screen in EVERY host; `@source` completeness per host; contrast results recorded in the archived Phase 7 plan. Non-kiosk tokens are other apps' — never touch. |
| **`RiseSurface` / surface type `"rise"`** (`@beyo/ui`) | SHARED ENGINE — three live apps. Additive-only discipline; `test:ui` (162) is the gate; kiosk opacity comes from the HOST wrapper, not the shell — don't "fix" backgrounds in the shell. |
| **Surface ids / openers / registrations** (`surface-ids.ts`, `surfaces.ts`) | Host registry (`withFloorKioskFrame` wrapping!), preload (`preloadClockKioskSurfaces` + module-scope warm wrappers), auto-return's `closeKioskSurfaces`, O1/O3 cold-load e2e, README §Host Integration snippet (must stay copy-safe — F2). |
| **Adapter signatures** (`clock-kiosk/types.ts`) | PUBLIC SEAM hosts already implement — changing shapes breaks the "gap closure = data change only" promise (review finding C5). → `FloorKioskProvider`, showcase adapters, `defaultSummaryExtrasAdapters`, gates + their tests, zone 06 recipe, README. Extend via new optional fields, not re-shapes. |
| **`analytics-view-model.ts`** | Summary hero/IN/OUT — built from the controller's client-captured `clockedInAt`/`clockedOutAt` (not from `analytics`, since the backend gives no clock-out timestamp), subtitle date (client clock in workspace zone), degradation ladder (null analytics < missing `clockedInAt`). Tests pin each; also `kiosk-summary` e2e incl. the `analytics:null` regression spec. |
| **`summary-extras-adapters.ts`** (default `summaryExtras`) | The GAP-closing mapping off `analytics.completed_items`/`week`/`rate` — every host inherits this unless it overrides a key. → `kiosk-adapters.ts` gates, `SummaryItems`/`SummaryWeek`/`SummaryRate` types + the three components that render them, `DEFAULT_WEEKLY_TARGET_HOURS` (the one hard-coded value — change it here only), its own tests, zone 04/06. |
| **Device-config store** | Auto-return timing everywhere (clamp 4–120 in ONE exported constant — input attrs + save + rehydrate all read it), settings page, controller countdowns, persisted-storage rehydrate tests. |
| **Floor auth files** (`auth-token.ts`, `use-sign-out.ts`, `AuthProvider`) | ⚠ Zone 02 rules. Three-live-apps invariance suites (auth 3, api-client 3, ui 162) + floor boot/revocation/logout paths + revoked-note flag + `floor-revoked` e2e. |
| **Router/guard nesting** (floor `router.tsx`) | The auth boundary for ALL kiosk logic (roster, keydown, preload). Anything moved above `FloorProtectedRoute` runs unauthenticated (C2 class). |
| **Playwright/vite config** (ports, projects, reuse) | Port 5175 is a master decision; three projects are mandatory (tablet = primary target); `reuseExistingServer` CI-only (stale-server hazard). The suite's own validation plan runs through these files. |
| **Public barrels** (`index.ts` of either package) | Hosts + docs: README contract/API sections, zone docs, deep-import audit (none allowed), subpath map (`/mocks`, `/showcase` — `clock-kiosk` no longer imports `@beyo/stats` at all as of 2026-07-31). Docs↔barrel drift was review finding F3 — reconcile BOTH directions. |
| **Mock handlers/fixtures** | Dev runtime + package tests + (independently) floor e2e stubs — keep the three aligned; `analytics.rate` is a required field (no default) — every fixture/route stub that returns non-null analytics must include it or parsing throws. |

## Standing invariants index (quick lookup)

Five kiosk UX invariants → `INDEX.md`. Ownership/dependency arrows →
`00_overview.md`. Tolerance tiebreaker → `01`. Floor-gate discipline → `02`.
Thin-shell rule + auth boundary → `03`. Behavioral contracts + pinning tests →
`04`. Kit ownership → `05`. Adapter-seam stability → `06`. Hazards → `07`.
