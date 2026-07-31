# 07 — Testing & validation

Last verified: 2026-07-31

## The matrix (all must be green before any change ships)

| Command (from `frontend/`) | Covers | Count at stamp |
|---|---|---|
| `npm run typecheck` | root chain incl. both packages + floor app (+ its test files) | exit 0 |
| `npm run test:worker-shifts` | schemas/matcher/time/actions vs mocks | 40 |
| `npm run test:clock-kiosk` | store machine, controller (409/offline/timers/keydown), view models, adapter gates | 54 |
| `npm run test:unit --workspace managerbeyo-app-floor` | clock hook, device store (clamp), guards, long-press | 9 |
| `npm run test:ui` / `test:auth` / `test:api-client` | shared-engine + auth invariance safety nets | 162 / 3 / 3 |
| `npx playwright test --grep clock-kiosk --project=<p>` for mobile, tablet, desktop | full journeys, /current call counts, wrong-code shake, email fallback, auto-return, settings typing guard, cold-load skeleton, production-default GAP absence | 9 per project |

Touching floor auth (zone 02) or `@beyo/ui`? The ui/auth/api-client suites are
non-negotiable — they are the three-live-apps invariance proof.

## E2E conventions (floor app `tests/playwright/`)

- Fixture `fixtures/app-fixture.ts` fails any test on console errors/pageerrors.
- Specs mock EVERYTHING via `page.route` (fake JWT via `encodeJwt`, roster,
  `/current`, clock actions) + `addInitScript` seeding `beyo.floor.access_token`
  and the device-config storage — independent of the MSW dev mocks; keep their
  semantics aligned with `@beyo/worker-shifts/mocks` handlers.
- Projects: mobile (iPhone 14 Pro) · tablet **834×1194 = the primary design
  target** · desktop 1440×900. Run mobile first by repo convention; never skip
  tablet (a whole phase once did — review finding).
- Mocked-analytics fixtures/route stubs: `analytics.rate` is required (not
  defaulted) — an analytics object missing it fails to parse. Summary-tile
  e2e that asserts client-captured OUT time/worked span (`WorkedTodayPlate`)
  needs `page.clock.install()` to keep the moment deterministic — see the
  `kiosk-summary` specs for the pattern.

## Known hazards (each has bitten at least once)

1. **Stale dev server on 5175.** `reuseExistingServer` is CI-only now, but a
   manually-started `npm run dev` still occupies the port and CAN be reused in
   CI-flagged contexts or confuse manual checks; two processes on the port
   poisoned two separate validation rounds. Before trusting any e2e result:
   `lsof -ti :5175` and kill what you didn't intend.
2. **npm install drops native bindings** (rolldown + lightningcss
   darwin-arm64). After ANY install, if vite/vitest fail with "Cannot find
   native binding": reinstall BOTH `@rolldown/binding-darwin-arm64` and
   `lightningcss-darwin-arm64` together.
3. **Defect-locking tests.** Twice a test asserted the buggy behavior under a
   correct-sounding name (Phase 6 C2 marker pairing, Phase 7 F1 offline
   error). When fixing behavior, rename AND re-point the pinning test; when
   reviewing, read what the test asserts, not what it is called.
4. **Console-error fixture**: any new console noise fails every spec — silence
   the source, don't filter the fixture.
5. **Controls inside PullToRefresh swallow synthetic clicks on touch
   projects.** use-gesture's `filterTaps` eats Playwright `.click()` inside
   PTR (keypad keys, "Clock with email", email submit) on the `mobile`
   project. Use the spec's `pressControl(page, testId)` helper (tap on
   `hasTouch` projects, click otherwise) for anything inside PTR; surfaces
   outside PTR keep plain `.click()`. Same repo-wide hazard as the
   workers-app suites.
6. **LAN device testing = insecure context.** Reaching the dev server from a
   tablet over `http://<ip>:5175` disables secure-context APIs:
   `crypto.randomUUID` (absent — session ids have a fallback chain in the
   store since 2026-07-30), service workers (MSW drops to fallback mode —
   still mocks, slower path; PWA install/SW features untestable). Never
   introduce a secure-context-only API without a fallback; for full-fidelity
   device checks serve HTTPS or use a production build.

## The manual gate that automation can't cover

The always-on rehearsal script in `packages/clock-kiosk/README.md` — run on
the physical target device (sleep/wake, network pull → offline notice,
glove-tap sizes, long stationary session). Status: **still open** (operator
task F6 from the final review); record the result in `CHANGELOG.md` when run.

## Verification pointers

- `apps/floor-app/ManagerBeyo-app-floor/playwright.config.ts` (projects,
  CI-only reuse), `tests/playwright/clock-kiosk.spec.ts` (conventions),
  root `package.json` (script registry).
