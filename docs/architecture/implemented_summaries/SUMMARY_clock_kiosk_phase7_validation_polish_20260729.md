# SUMMARY_clock_kiosk_phase7_validation_polish_20260729

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase7_validation_polish_20260729`
- Completed at (UTC): `2026-07-30T10:15:41Z`
- Implemented plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase7_validation_polish_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Lifecycle state: `archived`

## Outcome

Phase 7 closes the ManagerBeyo floor clock kiosk capability. The always-on
terminal now resynchronizes its header clock from the real clock when focus or
visibility returns, and a confirmation screen hidden for the 30-second
inactivity window atomically returns to the cleared keypad. Floor roster focus
refresh is configured to run even while cached roster data is fresh and is
covered through TanStack Query's public `focusManager` lifecycle. Stale roster
data remains matchable; a roster error with no cached users presents a quiet
terminal-offline state.

The final package audit moved `KNOWN_INSIGHT_CODES` into the standalone public
`@beyo/stats/insight-codes` module, retaining the existing stats barrel export
for manager consumers. `@beyo/worker-shifts` now declares `msw` as its own
development dependency. The install's missing Darwin Vite native bindings were
recovered by reinstalling `@rolldown/binding-darwin-arm64` and
`lightningcss-darwin-arm64` together.

The host integration README now documents protected floor-scope mounting,
route/page and rise-surface registration, provider/adapters, `@source` entries,
kiosk token and font registration, device configuration, the all-mocked
live-flip checklist, and a target-device rehearsal script. A throttled cold-load
Playwright assertion proves `KioskSurfaceSkeleton` appears inside `KioskFrame`;
the ordinary preloaded journey continues to prove no skeleton flash.

Claude completed the design-fidelity and a11y pass against keypad, email,
confirm, clock-in result, and analytics summary captures on phone, tablet, and
desktop. Its scoped fidelity fixes correct desktop/landscape keypad overflow and
format announcement dates for display. The post-fix evidence records 27/27 e2e
passes across all three projects.

## Acceptance Evidence

| Criterion | Evidence |
|---|---|
| Always-on resilience | Focus/visibility clock resync; hidden-confirm reset; stale/absent roster distinction; `focusManager` refetch test; target-device rehearsal documented. |
| Loading and recovery states | Existing roster/confirm/action/summary/sign-in/revoked states audited; cold chunk renders `KioskSurfaceSkeleton` within the frame. |
| Validation matrix | Root typecheck; worker shifts 40/40; kiosk 54/54; floor 9/9; kiosk Playwright 9/9 on mobile, tablet, desktop. |
| Public API and boundaries | Grep verified no floor deep imports; worker shifts has no UI/kiosk import; clock kiosk imports no app code. |
| Live flip | All v1 routes remain mocked because their backend phases are ❌; endpoint-specific flip runbook is in the README. |
| Host integration | README specifies floor auth, providers/adapters, loaders/surfaces, styles/fonts/tokens, and persisted device configuration. |
| Fidelity and a11y | Claude review entry records side-by-side capture, token/type/ordering verification, accessible-name snapshot, focus order, reduced motion, and 27/27 e2e. |

## Files Changed

### Packages and root

- `package.json`
- `package-lock.json`
- `packages/worker-shifts/package.json`
- `packages/worker-shifts/src/api/use-floor-roster-query.ts`
- `packages/worker-shifts/src/api/worker-shifts-api.test.ts`
- `packages/stats/package.json`
- `packages/stats/src/lib/insight-codes.ts`
- `packages/stats/src/lib/insight-copy.ts`
- `packages/stats/src/lib/insight-copy.test.ts`
- `packages/clock-kiosk/README.md`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.test.tsx`
- `packages/clock-kiosk/src/lib/analytics-view-model.ts`
- Claude fidelity changes recorded in the child plan review log, including
  `packages/clock-kiosk/src/lib/kiosk-adapters.ts` and the read-only kit sizing
  adjustments.

### Floor host and tests

- `apps/floor-app/ManagerBeyo-app-floor/src/app/FloorKioskProvider.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/hooks/use-kiosk-clock.ts`
- `apps/floor-app/ManagerBeyo-app-floor/src/hooks/use-kiosk-clock.test.ts`
- `apps/floor-app/ManagerBeyo-app-floor/tests/playwright/clock-kiosk.spec.ts`

### Lifecycle

- `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase7_validation_polish_20260729.md`
- `docs/architecture/archives/ARCHIVE_clock_kiosk_phase7_validation_polish_20260730_1015.md`
- `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase7_validation_polish_20260729.md`
- `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`

## Validation

- `npm run typecheck` -- passed with zero errors.
- `npm run test:stats` -- passed: 143 tests.
- `npm run test:worker-shifts` -- passed: 5 files, 40 tests.
- `npm run test:clock-kiosk` -- passed: 4 files, 54 tests.
- `npm run test:unit --workspace managerbeyo-app-floor` -- passed: 5 files, 9 tests.
- `npx playwright test --grep clock-kiosk --project=mobile` -- passed: 9/9.
- `npx playwright test --grep clock-kiosk --project=tablet` -- passed: 9/9.
- `npx playwright test --grep clock-kiosk --project=desktop` -- passed: 9/9.
- Claude fidelity/a11y post-fix capture validation -- passed: 27/27 across the three projects.
- `git diff --check` -- passed.

## Deviations

- No mocked endpoint was flipped to live: the handoff liveness table keeps all
  v1 kiosk routes at ❌. The README records the exact future per-endpoint flip
  process instead.
- Physical sleep/wake and network-disconnect rehearsal remains host/device
  operational work, so it is documented as a manual script rather than claimed
  as a simulated browser result.
- The initial `npm install` dropped the platform-native Rolldown binding. The
  prescribed paired native-binding reinstall restored Vite, after which all
  browser validation passed.

## Trace

The child plan is archived with this summary and its archive record. The
master's Review log records capability completion and its lifecycle status moves
to `completed`.
