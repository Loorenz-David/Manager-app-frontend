# 04 — Kiosk flow logic (`@beyo/clock-kiosk` non-visual layer)

Last verified: 2026-07-30 · commit `e8a35e19`

The behavioral heart. Everything here is Codex-lane logic; it feeds the
Claude-owned components (zone 05) through typed props and never contains
DOM/styling.

## File map (`packages/clock-kiosk/src/`, non-component)

| File | Role |
|---|---|
| `store/kiosk-flow.store.ts` | Vanilla zustand factory `createKioskFlowStore()`. States: `keypad {code,email,mode,error,matching}` → `confirming {user,current\|null,actionFailed}` → `acting` → `result {result,countdownSeconds}`. **Every transition checks `sessionId`**; `reset()` mints a new id (`crypto.randomUUID` with insecure-context fallbacks — getRandomValues hex, then time+random; LAN-http tablets lack the API) — that single mechanism implements invariant 5 (stale async dropped) and invariant 3 (cleared keypad). `beginMatch`/`beginActing` return booleans (re-entry guards). |
| `controllers/use-kiosk-flow.controller.ts` | The orchestrator (~620 lines). Owns: roster query mount; local matching (`matchWorker`) on 4th digit/submit/email; fresh `fetchFreshCurrentShift` after match AND after every action (invariant 1); clock-in/out mutations; 409 → refetch → confirm re-render with `actionFailed:false` (invariant 2); non-409 failure → stays on confirm with ONE generic retry message (`actionFailed:true`) — never silent-drop (double-clock risk); auto-return timers (result countdown via `tickResult`, 30s confirm inactivity incl. hidden-tab); global keydown (0-9/Backspace/Enter) gated by `isEditableEventTarget` + `hasForeignSurface` (Phase 4 C1); roster-outage → `statusNotice` "Terminal offline — try again in a moment" with NO error signal (Phase 7 F1); keypad `onRefresh` (pull-to-refresh → awaited roster refetch); greeting/roleLine/notice view-model builders; surface opener calls at the right transitions. |
| `providers/KioskProvider.tsx` | Context: `{adapters, autoReturnSeconds, surfaceOpeners, timeZone}` + the store instance. Host glue passes these (see zone 03). |
| `pages/ClockKioskPage.tsx` | The always-mounted page — renders `KeypadScreen` from context **unconditionally** (returning null when a surface is open re-creates Phase 4 C4). |
| `pages/IdentityConfirmSurfacePage.tsx` / `ResultSurfacePage.tsx` | Thin surface entries reading controller context → kit screens. `ResultSurfacePage` branches: clock-in result / plain clock-out / analytics `SummaryScreen`. |
| `surfaces.ts` | `loadClockKioskPage`, the two surface loaders, `preloadClockKioskSurfaces()` (Promise.all of both), and `clockKioskSurfaces` (both registered as type `"rise"`). |
| `surface-ids.ts` | `CLOCK_KIOSK_CONFIRM_SURFACE_ID`, `CLOCK_KIOSK_RESULT_SURFACE_ID`, `ClockKioskSurfaceOpeners` type (`openIdentityConfirm/openResult/closeKioskSurfaces`). |
| `lib/analytics-view-model.ts` | Pure analytics → summary view model. IN = last valid `started_shift` at/before the final valid `ended_shift`; worked = that wall-clock span (never bucket sums — disjoint-shift gap bug C2). Subtitle date = CLIENT clock in workspace zone (not `analytics.date` — cross-midnight C3). `dateLabel` nullable — a bad date can't discard a valid hero (C4). Insight rows via the kiosk-owned worker-facing factual copy table (8 templates; neutral metric+delta fallback; NEVER a `@beyo/stats` title — only `@beyo/stats/insight-codes` is imported). `analytics: null`/missing markers → null view model → plain result screen (handoff hard rule). |
| `lib/kiosk-adapters.ts` | `DEFAULT_ADAPTERS` (null/[]/null), gates (`gateAnnouncements` slices to 3 + formats ISO→"29 Jul"; `gateSummaryExtras` per-key `??` fallbacks), scheduled-shift context assembly. |
| `adapters/showcase-kiosk-adapters.ts` | Dev-only fixtures matching the design images; reachable ONLY via `import.meta.env.DEV && VITE_FLOOR_MOCKS==='1'` (statically dead in any build — verified by dist grep). |
| `types.ts` | `KioskAdapters` (+Input): `scheduledShift(ctx incl. currentShift)`, `announcements(ctx) → KioskAnnouncement[]`, `summaryExtras {items,week,rate}`. Synchronous presentation seams — hosts own any queries and pass data through. |
| `index.ts` / `showcase.ts` | Public barrel (components + provider + loaders + preload + surface ids + adapter types) / dev-only `KioskKitShowcase` subpath. |

## Behavioral contracts to preserve (each has a pinning test)

- Exactly 2 `/current` calls per happy-path journey (match + post-action).
- 409 on clock-in/out is a state correction, not an error (test drives a real
  `ApiRequestError`).
- Auto-return: result countdown from device-config seconds; confirm 30s
  inactivity (also while tab hidden); every exit path → `reset()` + close all
  kiosk surfaces atomically.
- Keypad input: physical keys work on desktop; typing NEVER affects editable
  targets or foreign surfaces (settings/sign-in regression = C1).
- Roster stale → still matchable; roster absent → quiet `statusNotice`, no
  error signal, keypad disabled-ish but never dead-ended.

## Verification pointers

- `store/kiosk-flow.store.ts` + `.test.ts` (transitions, session-id race)
- `controllers/use-kiosk-flow.controller.test.tsx` (409, offline notice,
  timers, keydown gating)
- `lib/analytics-view-model.test.ts` (marker pairing, copy table, degradation)
- Floor Playwright `tests/playwright/clock-kiosk.spec.ts` (journeys, /current
  call counts, settings-typing guard)
