# 03 — Floor app shell (`apps/floor-app/ManagerBeyo-app-floor`)

Last verified: 2026-07-30 · commit `e8a35e19`

The thin host. Owns auth wiring, routing, device configuration, surface
registration, chrome glue, and styling registration — **zero kiosk logic**
(anything that would survive a port to another host belongs in a package).
Dev port **5175**, no `--host` by default.

## File map (`src/`)

| File | Role |
|---|---|
| `app/providers.tsx` | MotionConfig(`reducedMotion="user"`) › LazyMotion › BreakpointProvider › KeyboardInsetProvider › QueryClientProvider › Toaster. |
| `app/RootRoute.tsx` | SurfaceProvider(registry) › AuthProvider(`appScope="floor"`, `onSessionExpired` → revoked flag) › FloorKioskProvider › Outlet. NO RealtimeProvider (no socket in v1). |
| `app/router.tsx` + `app/router-guards.tsx` | `/sign-in` under `FloorGuestRoute`; `/` under `FloorProtectedRoute` › `FloorKioskRoute` › `AppShell` › kiosk page. **`FloorKioskRoute` is the auth boundary for kiosk logic**: the controller (and with it the roster query + global keydown) mounts only here — moving it above `FloorProtectedRoute` re-creates the Phase 4 blocker C2 (unauthenticated roster call → false revocation on sign-in). |
| `app/FloorKioskProvider.tsx` | Glue: builds `surfaceOpeners` (open/close the two kiosk surfaces via `useSurfaceStore`), passes device-config `autoReturnSeconds`, workspace `timeZone`, and adapters (production: defaults; dev+`VITE_FLOOR_MOCKS=1`: showcase adapters). |
| `app/surface-registry.ts` | Central registry. `withFloorKioskFrame(...)` wraps EVERY kiosk surface page in `FloorKioskFrame` + an in-frame `Suspense` with `KioskSurfaceSkeleton` fallback — this is what makes rise surfaces opaque paper and keeps cold loads from rendering on the bare dim (Phase 4 C4 / operator O3). Registers: device-settings + the two `clockKioskSurfaces`, all type `"rise"`. |
| `app/AppShell.tsx` | Mounts `FloorKioskFrame` (chrome: `KioskFrame`+`KioskHeader` fed by `useKioskClock` + device config) with the long-press identity slot. |
| `components/FloorKioskFrame.tsx` | The host chrome composition reused by AppShell AND every surface wrapper. |
| `hooks/use-kiosk-clock.ts` | Per-second clock reading the real `Date` (no accumulating interval); resyncs on focus/visibility (Phase 7 resilience). |
| `hooks/use-device-settings-long-press.ts` | 600ms long-press on the header identity block → device-settings surface. Deliberately the ONLY entry; no tap path. |
| `store/device-config.store.ts` | Persisted zustand: `terminalLabel`, `autoReturnSeconds` (clamped **4–120**, default 12 — one exported constant; out-of-range persisted values rehydrate to default). |
| `pages/SignInPage.tsx` | `DeviceSignInCard` chrome + `SignInForm appScope="floor"` + terminal-label field; shows the revoked-device note off the session-expired flag. |
| `pages/DeviceSettingsPage.tsx` | Settings rows + device Log out (confirm-gated; full revocation via the floor-gated sign-out). |
| `pages/KioskPlaceholderPage.tsx` | Historical Phase 3 placeholder (the real page comes from the package loader). |
| `lib/floor-session-expired.ts` | Session-scoped revoked-device flag (read+cleared by SignInPage). |
| `mocks/browser.ts` | Dev MSW worker (worker file lives OUTSIDE `public/` so production ships no `mockServiceWorker.js`). |
| `index.css` | `@source` lines for consumed packages (Tailwind v4 scans nothing in node_modules — a missing line = silently unstyled classes) + the two self-hosted font faces (`public/fonts/`). |
| `vite.config.ts` / `playwright.config.ts` | Port 5175; PWA `registerType: "autoUpdate"` (unattended device); Playwright projects mobile/tablet(834×1194)/desktop, `reuseExistingServer` **CI-only** (stale local servers poisoned two validation rounds). |

## Preloading (operator finding O1)

`FloorKioskRoute`/kiosk mount calls `preloadClockKioskSurfaces()` during
authenticated keypad idle — on an always-on device the confirm/result chunks
must never load mid-interaction. Host wrappers are warmed at module scope, so
only package chunks can ever suspend (into the in-frame skeleton).

## Rules for changing this zone

- Keep the shell thin: new kiosk behavior goes in `@beyo/clock-kiosk`; new
  shift logic in `@beyo/worker-shifts`; only glue lives here.
- Anything mounted above `FloorProtectedRoute` runs unauthenticated — no
  queries, no kiosk controller, ever.
- New package consumption ⇒ add its `@source` line AND update the
  `architecture/14_styling.md` §14 table.

## Verification pointers

- `src/app/router.tsx` (the guard nesting), `src/app/surface-registry.ts`
  (`withFloorKioskFrame`), `src/store/device-config.store.ts` (clamp constant),
  `playwright.config.ts` (projects + CI-only reuse).
