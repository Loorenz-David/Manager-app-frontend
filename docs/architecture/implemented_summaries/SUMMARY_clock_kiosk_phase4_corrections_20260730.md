# SUMMARY_clock_kiosk_phase4_corrections_20260730

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase4_corrections_20260730`
- Completed at (UTC): `2026-07-30T07:30:00Z`
- Implemented plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase4_corrections_20260730.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Source Phase 4 plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Lifecycle state: `archived`

## Outcome

Phase 4 corrections C1–C15 are complete. Kiosk execution now exists only in
the authenticated route subtree, physical-key handling is scoped to an
uncovered keypad and ignores editable targets, and the unauthenticated sign-in
route issues no roster request. Confirm and result are host-composed inside the
same opaque `FloorKioskFrame` used by device settings, while the cleared keypad
stays mounted below every kiosk surface.

The reviewed flow invariants remain intact. Non-409 action/refetch failures stay
on confirmation with one generic retry message; 409 remains silent
reconciliation. Rise exits retain their screen content for the 220 ms motion,
invalidate stale async continuations immediately, reset both action mutations,
then wipe personal flow state. Kit components, `RiseSurface`,
`@beyo/worker-shifts`, and the shared auth/API/style packages were not edited.

## Finding dispositions

| Finding | Disposition |
|---|---|
| C1 — global key handling | Fixed. The provider/controller is absent from `/sign-in`; editable targets are ignored without `preventDefault`; a foreign surface makes the kiosk listener inert. Playwright proves exact `TERMINAL 04`, `floor42@shop.com`, and `Passw0rd123` input, settings accepts `30`, and `4821` over settings opens no confirm. |
| C2 — unauthenticated roster query | Fixed. `FloorKioskProvider` and `SurfaceProvider` mount below `FloorProtectedRoute`. The sign-in test counts zero roster requests, sees no revoked-device note, and no longer contains a roster route stub. |
| C3 — incomplete greeting | Fixed. Exported pure `goodDayPartGreeting` maps all three day parts to `Good morning/afternoon/evening`. The controller uses the real Phase 1 helper and Playwright pins `Good afternoon, Marco`. |
| C4 — transparent surfaces / missing keypad | Fixed with resolved option (a). The floor registry wraps raw confirm/result registrations in `FloorKioskFrame`; package registrations remain app-agnostic. `ClockKioskPage` always renders. Playwright proves an opaque equal paper color on both surfaces plus one keypad screen and four code cells under confirm. |
| C5 — empty exit animation | Fixed. Return invalidates the session and closes first, retains the current view model through the 220 ms rise exit, and resets at 250 ms. The underlying keypad is rendered cleared throughout; unit and Playwright assert exit content remains attached. |
| C6 — silent action failures | Fixed. Mutation failures and failed post-action `/current` reads return acting state to confirmation with only `Something went wrong. Please try again`; the action remains retryable and no result/keypad bounce occurs. The 409 branch is unchanged and silent. |
| C7 — role fallback | Fixed. Only `name`, `role_name`, and `workspace_role_name` are accepted; unknown id/uuid-only records produce no role line. |
| C8 — roster error as no-match | Fixed. Roster pending/error disables matching and keypad interaction without raising the generic no-match state. |
| C9 — retained mutation/user state | Fixed. Both mutations reset at return start; the flow store resets after exit. The controller test asserts the prior `user_id` is absent afterward. |
| C10 — Vite env declarations | Fixed. Both triple-slash references are first and one `ImportMetaEnv` declares `VITE_API_URL` plus `VITE_FLOOR_MOCKS`. |
| C11 — production MSW worker | Fixed. The generated worker moved from `public/` to `src/mocks/` and is served only by a Vite development plugin when the mock bootstrap requests it. Production build inspection finds no `dist/mockServiceWorker.js`. |
| C12 — dead provider config | Fixed. `KioskProvider` no longer accepts unused `terminalLabel`/`workspaceName`; host-owned chrome continues to receive those values in `FloorKioskFrame`. The master package-boundary description now matches. |
| C13 — public API / memo hygiene | Fixed. The barrel no longer exports the two internal surface loaders; raw `clockKioskSurfaces` remains public. The floor host passes one module-stable adapters object. |
| C14 — 409 test fidelity | Fixed. The controller test rejects with `new ApiRequestError(409, "conflict", ...)`. |
| C15 — tablet evidence | Fixed. The complete combined kiosk/bootstrap suite passed 7/7 on mobile, tablet, and desktop. |

## Validation

- `npm run typecheck` — passed with zero TypeScript errors.
- `npm run test:clock-kiosk` — passed: 2 files, 18 tests.
- `npm run test:worker-shifts` — passed: 5 files, 36 tests.
- `npm run test:ui` — passed: 29 files, 162 tests.
- `npm run test:auth` — passed: 2 files, 3 tests.
- `npm run test:api-client` — passed: 1 file, 3 tests.
- `npm run test:unit --workspace managerbeyo-app-floor` — passed: 5 files, 8 tests.
- `npx playwright test --grep 'clock-kiosk|floor-bootstrap' --project=mobile` — passed: 7/7.
- `npx playwright test --grep 'clock-kiosk|floor-bootstrap' --project=tablet` — passed: 7/7.
- `npx playwright test --grep 'clock-kiosk|floor-bootstrap' --project=desktop` — passed: 7/7.
- `npm run lint --workspace managerbeyo-app-floor` — passed with zero warnings.
- `npm run build --workspace managerbeyo-app-floor` — passed.
- Production artifact inspection — passed; `mockServiceWorker.js` is absent from `dist/`.
- `git diff --check` — passed.

The production build retains the pre-existing informational large-chunk and
Workbox `inlineDynamicImports` deprecation warnings.

## Trace

The corrections plan and archive record are linked from Metadata. The governing
master remains active and approved; its Review log records C1–C15 completion and
releases the Phase 6 implementation hold created by C1/C2.
