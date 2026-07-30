# SUMMARY_clock_kiosk_phase7_corrections_20260730

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase7_corrections_20260730`
- Completed at (UTC): `2026-07-30T14:10:00Z`
- Implemented plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase7_corrections_20260730.md`
- Corrected phase: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase7_validation_polish_20260729.md`
- Governing master: `docs/architecture/archives/implementation/PLAN_clock_kiosk_master_20260729.md`
- Lifecycle state: `archived`

## Outcome

Phase 7 corrections assigned to Codex are complete. Roster-unavailable now
presents a quiet offline notice without triggering the no-match error signal,
README integration guidance is copy-safe and frame-accurate, documented/public
surface exports are reconciled, dependency declarations are honest, and
Playwright cannot silently reuse a wrong-mode local server.

F8 lifecycle closure is complete: the master plan moved to
`docs/architecture/archives/implementation/PLAN_clock_kiosk_master_20260729.md`,
and the capability README now points to that archived location.

## Finding dispositions

| Finding | Disposition |
|---|---|
| F1 | Fixed: roster-unavailable path now passes `statusNotice` (`"Terminal offline — try again in a moment"`) and keeps keypad `error` false; no red/shake signal on idle outage. Test at `use-kiosk-flow.controller.test.tsx` renamed/re-pointed to assert notice + no error signal. |
| F2 | Fixed: README registration snippet now includes host frame composition, in-frame `Suspense`, per-surface `KioskSurfaceSkeleton` fallback, and preload wiring. |
| F3 | Fixed: `src/index.ts` now exports the eight documented Phase 6 components; stale barrel note removed; README now documents `preloadClockKioskSurfaces` and `KioskSurfaceSkeleton` variants. |
| F4 | Fixed: README `@source` block now includes `@beyo/lib`; mono font block now includes IBM Plex Mono 400/500/600 to match the host. |
| F5 | Fixed: removed unused peers (`@beyo/auth`, `@beyo/hooks`, `@tanstack/react-query`, `zod`) and added test-only dev dependencies (`@beyo/api-client`, `@testing-library/react`, `vitest`). |
| F6 | Not implemented here by design: remains operator-owned physical-device rehearsal gate. |
| F7 | Fixed: floor Playwright config now uses `reuseExistingServer: !!process.env.CI`, so local runs fail loud instead of silently reusing stale dev servers. |
| F8 | Fixed: master plan moved to `archives/implementation`; capability README includes required pointer line. |

## Files changed

- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.ts`
- `packages/clock-kiosk/src/controllers/use-kiosk-flow.controller.test.tsx`
- `packages/clock-kiosk/src/index.ts`
- `packages/clock-kiosk/package.json`
- `packages/clock-kiosk/README.md`
- `apps/floor-app/ManagerBeyo-app-floor/playwright.config.ts`
- `docs/architecture/under_construction/implementation/clock_in_out_app/README.md`
- `docs/architecture/archives/implementation/PLAN_clock_kiosk_master_20260729.md` (moved)
- `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase7_corrections_20260730.md` (moved + closed)

## Validation

- `npm run typecheck` — passed.
- `npm run test:clock-kiosk` — 54/54 passed.
- `npm run test:worker-shifts` — 40/40 passed.
- `npm run test:unit --workspace managerbeyo-app-floor` — 9/9 passed.
- `npm run test:ui` — 162/162 passed.
- `npm run lint` in floor app — passed.
- `npm run build` in floor app — passed.
- Cold server matrix (`lsof/kill` on 5175 before each run):
  - `npx playwright test --grep clock-kiosk --project=mobile` — 9/9 passed.
  - `npx playwright test --grep clock-kiosk --project=tablet` — 9/9 passed.
  - `npx playwright test --grep clock-kiosk --project=desktop` — 9/9 passed.

## Deviations

- None for Codex-routed findings F1/F2/F3/F4/F5/F7/F8.
- F6 remains intentionally open for operator execution on a physical device.
