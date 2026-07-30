# SUMMARY_clock_kiosk_phase6_clock_out_summary_20260729

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase6_clock_out_summary_20260729`
- Completed at (UTC): `2026-07-30T07:46:02Z`
- Implemented plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase6_clock_out_summary_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Lifecycle state: `archived`

## Outcome

Phase 6 is complete. Clock-out responses now retain `analytics` through the
session-scoped store and map it once in
`packages/clock-kiosk/src/lib/analytics-view-model.ts`. The mapper derives IN
from the first usable `started_shift.start`, OUT from the final usable
`ended_shift.start`, and worked time from their wall-clock span. It never sums
timeline buckets, tolerates `segments_truncated`, formats display values, reuses
the existing `@beyo/stats` insight-code map, and provides factual metric/delta
copy for unknown codes.

`analytics: null`, invalid dates, and missing marker pairs retain the exact
Phase 4 plain clock-out result. Usable analytics render `SummaryScreen` with a
worked hero, insight rows, and the stopped-task notice. Each design-ahead
section is independently gated through injected adapters, whose production
defaults are null/empty.

`VITE_FLOOR_MOCKS=1` injects one showcase adapter set for scheduled shift,
announcements, completed items, week context, and production rate. Playwright
test mode uses the same flag for showcase data while retaining deterministic
route-level backend mocks; normal development mode also starts the existing MSW
backend fixture. The production build tree-shakes the showcase fixtures.

## Adapter interfaces shipped

| Interface | Signature / result |
|---|---|
| `ScheduledShiftAdapter` | `({ user, timeZone }) => { label, value } \| null` |
| `AnnouncementsAdapter` | `({ user, timeZone }) => KioskAnnouncement[]`; each item carries `id`, `title`, `body`, `accent`, and ISO `date`; assembly caps at three and hides empty output |
| `SummaryExtrasAdapter.items` | `({ analytics, user, timeZone }) => { items, totalUnits, lineCount } \| null`; empty `items` is gated to null |
| `SummaryExtrasAdapter.week` | same context → `{ days, targetSeconds, loggedSeconds } \| null`; empty `days` is gated to null |
| `SummaryExtrasAdapter.rate` | same context → `{ unitsPerHour, baseline, baselineDays } \| null` |
| `KioskAdaptersInput` | optional top-level adapters plus a partial nested `summaryExtras`, resolved against null/empty defaults |

`KioskProviderProps` and all adapter/public display types are exported from
`@beyo/clock-kiosk`. Mapping and gating internals are not exported from the
package barrel.

## Files changed

Package and root:

- `package-lock.json`
- `packages/clock-kiosk/package.json`
- `packages/clock-kiosk/src/adapters/showcase-kiosk-adapters.ts`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.test.tsx`
- `packages/clock-kiosk/src/index.ts`
- `packages/clock-kiosk/src/lib/analytics-view-model.ts`
- `packages/clock-kiosk/src/lib/analytics-view-model.test.ts`
- `packages/clock-kiosk/src/lib/kiosk-adapters.ts`
- `packages/clock-kiosk/src/lib/kiosk-adapters.test.ts`
- `packages/clock-kiosk/src/pages/ResultSurfacePage.tsx`
- `packages/clock-kiosk/src/providers/KioskProvider.tsx`
- `packages/clock-kiosk/src/showcase.ts`
- `packages/clock-kiosk/src/store/kiosk-flow.store.ts`
- `packages/clock-kiosk/src/types.ts`
- `packages/stats/package.json`

Floor host:

- `apps/floor-app/ManagerBeyo-app-floor/.env.test`
- `apps/floor-app/ManagerBeyo-app-floor/package.json`
- `apps/floor-app/ManagerBeyo-app-floor/src/app/FloorKioskProvider.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/main.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/tests/playwright/clock-kiosk.spec.ts`

Lifecycle:

- `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase6_clock_out_summary_20260729.md`
- `docs/architecture/archives/ARCHIVE_clock_kiosk_phase6_clock_out_summary_20260729_0746.md`
- `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase6_clock_out_summary_20260729.md`
- `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- `docs/architecture/under_construction/intention/clock_in_app.md`

## Validation

- `npm run typecheck` — passed with zero errors.
- `npm run test:clock-kiosk` — passed: 4 files, 34 tests.
- `npx playwright test --grep kiosk-summary --project=mobile` — passed: 2/2.
- `npx playwright test --grep kiosk-summary --project=desktop` — passed: 2/2.
- Full `clock-kiosk.spec.ts` on mobile — passed: 7/7.
- Full `clock-kiosk.spec.ts` on desktop — passed: 7/7.
- `npm run lint --workspace managerbeyo-app-floor` — passed.
- `npm run build --workspace managerbeyo-app-floor` — passed; showcase item
  and announcement strings are absent from production `dist`.
- `git diff --check` — passed.
- Kit integrity audit — `git diff -- packages/clock-kiosk/src/components`
  returned no changes.

## Deviations

- The existing insight map was found and imported rather than forked. A narrow
  `@beyo/stats/insight-copy` export was added because the stats root barrel
  pulled unrelated manager-stats surfaces into the floor production bundle.
- The committed `AnnouncementsList` prop implementation accepts and renders
  `title`, `body`, and `accent`, but not the plan table's `date`. The shipped
  adapter retains the ISO `date` so backend wiring does not change later; the
  read-only kit was not structurally edited. Rendering the date is a
  Claude-owned additive visual follow-up.
- Playwright's `.env.test` enables the single approved
  `VITE_FLOOR_MOCKS=1` showcase flag. `main.tsx` deliberately does not start the
  browser MSW worker in test mode, preserving the existing deterministic
  `page.route()` tests; development mode still starts MSW.

## Trace

The archived plan and archive record are linked from Metadata. The governing
master remains `approved`; Phase 7 is the next active implementation phase.
