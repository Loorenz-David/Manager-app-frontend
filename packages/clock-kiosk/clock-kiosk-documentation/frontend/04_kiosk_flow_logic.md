# 04 — Kiosk flow logic (`@beyo/clock-kiosk` non-visual layer)

Last verified: 2026-07-31

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
| `lib/analytics-view-model.ts` | Pure analytics → summary view model — **rewritten 2026-07-31** for the NEW `analytics` contract (handoff §5.1 removed `segments[]`/`insights[]`). IN/OUT/worked no longer come from `analytics` at all: the backend gives no clock-out timestamp, so the controller threads two client-captured moments through `KioskResult` — `clockedInAt` (pre-action `current.shift_started_at`) and `clockedOutAt` (`new Date().toISOString()` when the action resolves) — and this module just formats their span. `analytics` itself is still the gate (`null`/missing `clockedInAt` → null view model → plain result screen, handoff hard rule); its `completed_items`/`week`/`rate` feed the summary GAP tiles separately, via `lib/summary-extras-adapters.ts`, not this file. `insights` is gone from the returned view model (handoff: "not provided for this screen anymore"). |
| `lib/auto-return.ts` | `autoReturnSecondsForResult(kind, configured)` + `CLOCK_IN_AUTO_RETURN_FACTOR` (0.5) + `MIN_AUTO_RETURN_SECONDS` (2). Clock-in results return to the keypad twice as fast as clock-out (glance vs read); the controller passes the result through this on `showResult`, so the store countdown and the ring animation share one number. **Change the pace here.** Unit-pinned in `auto-return.test.ts`. |
| `lib/kiosk-adapters.ts` | `DEFAULT_ADAPTERS` — `scheduledShift`/`announcements` default to null/[]; `summaryExtras` defaults to `defaultSummaryExtrasAdapters` (see next row), **not** null-returning stubs, as of 2026-07-31. Gates (`gateAnnouncements` slices to 3 + formats ISO→"29 Jul"; `gateSummaryExtras` per-key `??` fallbacks + hides items/week only when their array/days is empty), scheduled-shift context assembly. |
| `lib/summary-extras-adapters.ts` | **New 2026-07-31.** `defaultSummaryExtrasAdapters: SummaryExtrasAdapter` — a pure mapping from `ClockOutAnalytics` (`completed_items`/`week`/`rate`) to the kit's `SummaryItems`/`SummaryWeek`/`SummaryRate` presentation types. Unlike `scheduledShift`/`announcements` this needs no host-owned query — the backend embeds the data directly in the clock-out response — so it closes gap-mapping rows §3/§4/§5 (zone 06) for every host automatically. `DEFAULT_WEEKLY_TARGET_HOURS` (40h) is the one hard-coded value — the backend has no `scheduled_seconds` concept at all (handoff §5.1) — **change the weekly target here.** |
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
- `lib/analytics-view-model.test.ts` (clock-timestamp span, date-label edge cases, degradation)
- `lib/summary-extras-adapters.test.ts` (completed_items/week/rate mapping, empty-array gating)
- Floor Playwright `tests/playwright/clock-kiosk.spec.ts` (journeys, /current
  call counts, settings-typing guard)
