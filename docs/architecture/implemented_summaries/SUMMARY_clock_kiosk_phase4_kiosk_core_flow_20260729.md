# SUMMARY_clock_kiosk_phase4_kiosk_core_flow_20260729

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase4_kiosk_core_flow_20260729`
- Completed at (UTC): `2026-07-29T19:35:00Z`
- Implemented plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Lifecycle state: `archived`

## Outcome

Phase 4 is complete. `@beyo/clock-kiosk` now owns the keypad → fresh-state confirm → explicit clock action → result → cleared-keypad loop. The keypad remains mounted at `/`; identity confirmation and results are package-registered `rise` surfaces merged through the floor app's central registry.

The store/controller/provider enforce one session id per interaction, fresh `/current` reads before action presentation and after action awaits, silent 409 reconciliation, 30-second confirmation inactivity return, device-config result countdown, physical keyboard input, and one local generic no-match path for code and email. Clock-out analytics are parsed by Phase 1 but deliberately not rendered; only `transitioned_steps > 0` appears on the plain result.

`VITE_FLOOR_MOCKS=1` dynamically starts the Phase 1 worker-shift handlers plus floor auth handlers. Production and Playwright test modes explicitly disable this browser worker. A no-route-interception smoke test signed in through the browser mock and reached the keypad with no console errors.

## Five flow invariants

| Invariant | Implementation evidence | Test evidence |
|---|---|---|
| Roster decides who; fresh `/current` decides state | `submitMatch` calls `matchWorker` locally, opens pending confirm, then calls `fetchCurrentShift(userId)`; every successful clock action is followed by another fresh call before result/confirm rendering. | `wires fourth-digit local matching to a fresh current-state read`; both clock-in/out Playwright journeys assert exactly two current-state requests. |
| Any 409 refreshes confirmation | Action conflicts call `refreshConfirm` and never invoke result/error UI. | `treats 409 as a fresh state correction and renders one corrected action`. |
| Every exit returns to a cleared keypad | One `returnToKeypad` boundary resets the store/session and closes both kiosk surfaces; result and confirm timers live in the controller. | Store transition/reset test; 4-second result auto-return test; 30-second confirm timeout test; Playwright manual Done and timeout assertions. |
| One generic local no-match path | Code/email use `matchWorker` against roster data; rejection clears both identifier fields and exposes one message. No identify request exists. | Store no-match test; wrong-code Playwright asserts shake, generic copy, cleared cells, and zero `/current` calls; email Playwright proves case-insensitive local matching. |
| Stale session async work is dropped | All async continuations capture and compare the interaction session id before applying state. Reset generates a new id. | Store stale-transition test and deferred fresh-current race test. |

## Files changed

Package and root:

- `package.json`
- `package-lock.json`
- `packages/clock-kiosk/package.json`
- `packages/clock-kiosk/vitest.config.ts`
- `packages/clock-kiosk/src/index.ts`
- `packages/clock-kiosk/src/types.ts`
- `packages/clock-kiosk/src/surface-ids.ts`
- `packages/clock-kiosk/src/surfaces.ts`
- `packages/clock-kiosk/src/store/kiosk-flow.store.ts`
- `packages/clock-kiosk/src/store/kiosk-flow.store.test.ts`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.test.tsx`
- `packages/clock-kiosk/src/providers/KioskProvider.tsx`
- `packages/clock-kiosk/src/pages/ClockKioskPage.tsx`
- `packages/clock-kiosk/src/pages/IdentityConfirmSurfacePage.tsx`
- `packages/clock-kiosk/src/pages/ResultSurfacePage.tsx`

Floor host:

- `apps/floor-app/ManagerBeyo-app-floor/.env`
- `apps/floor-app/ManagerBeyo-app-floor/.env.test`
- `apps/floor-app/ManagerBeyo-app-floor/.env.production`
- `apps/floor-app/ManagerBeyo-app-floor/package.json`
- `apps/floor-app/ManagerBeyo-app-floor/public/mockServiceWorker.js`
- `apps/floor-app/ManagerBeyo-app-floor/src/app/FloorKioskProvider.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/app/RootRoute.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/app/router.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/app/surface-registry.ts`
- `apps/floor-app/ManagerBeyo-app-floor/src/main.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/mocks/browser.ts`
- `apps/floor-app/ManagerBeyo-app-floor/src/vite-env.d.ts`
- `apps/floor-app/ManagerBeyo-app-floor/tests/playwright/clock-kiosk.spec.ts`
- `apps/floor-app/ManagerBeyo-app-floor/tests/playwright/floor-bootstrap.spec.ts`

Lifecycle:

- `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase4_kiosk_core_flow_20260729.md`
- `docs/architecture/archives/ARCHIVE_clock_kiosk_phase4_kiosk_core_flow_20260729_1935.md`
- `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase4_kiosk_core_flow_20260729.md`
- `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- `docs/architecture/under_construction/intention/clock_in_app.md`

## Validation

- `npm run typecheck` — passed with zero errors.
- `npm run test:clock-kiosk` — passed: 2 files, 9 tests.
- `npm run test:worker-shifts` — passed: 5 files, 36 tests.
- `npx playwright test --grep clock-kiosk --project=mobile` — passed: 5/5.
- `npx playwright test --grep clock-kiosk --project=desktop` — passed: 5/5.
- `VITE_FLOOR_MOCKS=1` browser smoke — mocked sign-in reached `/` and a visible keypad; zero console errors.
- `npm run build --workspace managerbeyo-app-floor` — passed; production output excludes the browser mock chunk.
- `git diff --check` — passed.

## Deviations

- No Claude-owned component file was edited. The existing optional kit props were sufficient, so no additive prop change or Review-log exception was needed.
- `@source` was not added for `@beyo/worker-shifts` or `@beyo/pause-reasons`: the styling authority marks the logic-only worker-shifts package as omit, and pause reasons remain out of v1. The already-present `@beyo/clock-kiosk` source registration is the only class-bearing Phase 4 package registration required.
- The first post-install build exposed npm's optional Darwin ARM64 binding bug. Rolldown and Lightning CSS bindings were restored locally with `npm install --no-save`; no platform-specific project dependency was recorded.

## Trace

The archived plan and archive record are linked from Metadata. The master remains `approved`; Phase 6 is the next active implementation phase.
