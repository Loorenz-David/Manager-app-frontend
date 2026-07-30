# SUMMARY_clock_kiosk_phase6_corrections_20260730

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase6_corrections_20260730`
- Completed at (UTC): `2026-07-30T10:56:48Z`
- Implemented plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase6_corrections_20260730.md`
- Corrected phase: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase6_clock_out_summary_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Lifecycle state: `archived`

## Outcome

The Phase 6 review findings assigned to Codex are closed. The floor Vite and
Playwright configurations agree on port 5175 again, the LAN-publishing
`vite --host` change is reverted, and a cold Playwright start was proven after
terminating the stale 5175 listener.

Clock-out mapping now pairs the final valid OUT marker with the last valid IN
marker at or before it, derives the subtitle date from the same client clock
and workspace zone as the kiosk header, and never discards a valid hero because
the analytics date is empty, date-time-shaped, or otherwise unsuitable as
subtitle input. Partial and omitted analytics timelines default safely at the
worker-shift boundary, so a successful mutation is not converted into a retry
flow by missing counters.

Known insight codes render the approved worker-facing factual table in
`@beyo/clock-kiosk`, including neutral polarity. Unknown codes use the neutral
metric-plus-signed-delta fallback. `@beyo/stats/src` is byte-untouched and its
manager-facing regression suite remains green. Insight rows receive the code as
their stable React key.

Scheduled-shift adapters now receive the fresh nullable `CurrentShift` and
return raw start/end values. The controller formats the values in the workspace
zone and supplies `"Today's shift"` to confirmation and `"SCHEDULED"` to the
clock-in plate. The announcements adapter remains a synchronous presentation
seam; the barrel documents that endpoint-backed query ownership stays with the
host.

After authenticated keypad mount, both kiosk surface chunks preload through
the package `lazyWithPreload` instances. The host's confirm/result wrappers own
Suspense inside `FloorKioskFrame`, using the pre-existing
`KioskSurfaceSkeleton`; the tiny host wrappers are warmed with the registry so
the engine-level generic `SurfaceSkeleton` is not reachable for kiosk surfaces.
`KioskSurfaceSkeleton` is now exported from the public barrel.

## Finding dispositions

| Finding | Disposition |
|---|---|
| C1 | Fixed: Vite restored to 5175; Playwright remains on 5175; `dev` reverted to `vite`; stale listener killed before a cold mobile smoke pass. |
| C2 | Fixed: final OUT pairs with the last valid IN at/before it; truncation and two-shift tests added. |
| C3 | Fixed: subtitle date uses the client clock in the workspace time zone; midnight-crossing test added. |
| C4 | Fixed: analytics `date` no longer gates the hero; ISO date-time, empty date, and unusable client-label tests retain worked/IN/OUT. |
| C5 | Fixed: `ScheduledShiftAdapter` receives `currentShift`; `CurrentShiftSchema` retains additive `scheduled_shift`; announcement query ownership documented. |
| C6 | Fixed: adapter returns raw start/end; controller formats once and supplies the two required surface labels; controller and Playwright assertions added. |
| C7 | Fixed per option (a) plus amendment: all authored worker sentences are wired verbatim with semantic formatting; unknown codes use the neutral factual fallback; stats source unchanged. |
| C8 | Fixed: five timeline counters and `timeline` itself default safely; omission tests cover both shapes. |
| C9 | Fixed: known codes retain authored copy at neutral polarity. |
| C10 | Fixed: nested summary adapters resolve each key with `??`; explicit `items: undefined` regression added. |
| C11 | Fixed: Playwright boots the real undefined-adapter path and asserts hero/notice/insight present with items/week/rate absent. |
| C12 | Already executed before this session: dated `AnnouncementsList` support remains in place. |
| C13 | Fixed: assembly supplies insight `code` as an optional additive key prop; no DOM or class changes. |
| O1 | Fixed: authenticated keypad idle preloads confirm and result/summary chunks; mutation-observer Playwright proof sees no fallback after the idle beat. |
| O3 | Fixed: kiosk Suspense is inside the host frame with a per-surface kiosk fallback; generic engine fallback is not observed for confirm or result. |

O2 was already executed before this session. This correction exports and uses
its `KioskSurfaceSkeleton`. C14 remains intentionally deferred to Phase 7.

## Files changed

Floor host:

- `apps/floor-app/ManagerBeyo-app-floor/package.json`
- `apps/floor-app/ManagerBeyo-app-floor/vite.config.ts`
- `apps/floor-app/ManagerBeyo-app-floor/src/app/FloorKioskProvider.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/app/surface-registry.ts`
- `apps/floor-app/ManagerBeyo-app-floor/tests/playwright/clock-kiosk.spec.ts`

Clock kiosk:

- `packages/clock-kiosk/src/adapters/showcase-kiosk-adapters.ts`
- `packages/clock-kiosk/src/components/summary/SummaryScreen.tsx`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.test.tsx`
- `packages/clock-kiosk/src/index.ts`
- `packages/clock-kiosk/src/lib/analytics-view-model.ts`
- `packages/clock-kiosk/src/lib/analytics-view-model.test.ts`
- `packages/clock-kiosk/src/lib/kiosk-adapters.ts`
- `packages/clock-kiosk/src/lib/kiosk-adapters.test.ts`
- `packages/clock-kiosk/src/surfaces.ts`
- `packages/clock-kiosk/src/types.ts`

Worker shifts:

- `packages/worker-shifts/src/index.ts`
- `packages/worker-shifts/src/types.ts`
- `packages/worker-shifts/src/types.test.ts`

Lifecycle:

- `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase6_corrections_20260730.md`
- `docs/architecture/archives/ARCHIVE_clock_kiosk_phase6_corrections_20260730_1056.md`
- `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase6_corrections_20260730.md`
- `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- `docs/architecture/under_construction/intention/clock_in_app.md`

## Validation

- Cold port proof: nothing listening on 5175, then
  `npx playwright test --grep floor-bootstrap --project=mobile` — 1/1.
- `npm run typecheck` — passed with zero errors.
- `npm run test:clock-kiosk` — 4 files, 52/52.
- `npm run test:worker-shifts` — 5 files, 39/39.
- `npm run test:stats` — 17 files, 142/142.
- `npm run test:ui` — 29 files, 162/162.
- `npm run test:auth` — 2 files, 3/3.
- `npm run test:api-client` — 1 file, 3/3.
- `npx playwright test --grep kiosk-summary` — 3/3 on mobile, tablet,
  and desktop.
- `npx playwright test --grep clock-kiosk` — 8/8 on mobile, tablet,
  and desktop.
- `npm run lint --workspace managerbeyo-app-floor` — passed.
- `npm run build --workspace managerbeyo-app-floor` — passed.
- Production bundle grep — showcase item and announcement fixtures absent.
- `git diff --check` — passed.

## Deviations

- C13 required the master-authorized additive prop exception on
  `SummaryScreen`: an optional stable `key` field and React-key selection were
  added. Its DOM, classes, layout, and styling remain unchanged.
- The C11 standard-run test uses a test-mode-only URL switch to force the
  production `adapters={undefined}` branch while retaining the route-level
  backend mocks required by the rest of the Playwright suite. The switch is
  unreachable in production because the showcase gate is already
  `import.meta.env.DEV`-guarded.

## Trace

The archived corrections plan and archive record are linked from Metadata.
The governing master remains `approved`; Phase 6 awaits reviewer blessing, and
Phase 7 remains the next implementation phase after that gate.
