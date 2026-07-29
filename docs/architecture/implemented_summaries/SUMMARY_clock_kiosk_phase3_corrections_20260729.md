# SUMMARY_clock_kiosk_phase3_corrections_20260729

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase3_corrections_20260729`
- Completed at (UTC): `2026-07-29T19:30:00Z`
- Implemented plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase3_corrections_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`
- Lifecycle state: `archived`

## Outcome

Phase 3 corrections C1–C8 are complete. The floor host now validates its phone, primary-tablet, and desktop bootstrap; rejects unsafe auto-return values at input, save, and persisted-rehydrate boundaries; records the explicit floor revocation path for the one-time recovery note; and has complete package/typecheck/PWA bookkeeping. No kiosk flow capability was added.

Claude's prior C9 and C11 changes remain intact. C10 keeps its approved no-removal disposition because the Phase 4 `CodeCells` kit now consumes `.kiosk-shake`; removing it would break the approved kit. No kit component or `RiseSurface` file was edited by the C1–C8 implementation.

## Finding dispositions

| Finding | Disposition |
|---|---|
| C1 — viewport coverage | Fixed. Playwright now declares `mobile` (iPhone 14 Pro), `tablet` (834×1194), and `desktop` (1440×900), with workspace scripts for each. The unchanged bootstrap spec passes on all three. |
| C2 — auto-return range | Fixed. One exported `AUTO_RETURN_SECONDS_RANGE` constant defines min 4 / max 120. The settings input exposes the bounds, rejected saves show accessible feedback and do not close/persist, and the persisted Zod schema rejects corrupt values so rehydration retains the default 12. |
| C3 — package typecheck registration | Fixed. Root `typecheck` explicitly runs `packages/clock-kiosk/tsconfig.json` alongside `worker-shifts`. |
| C4 — Tailwind source authority | Fixed. `architecture/14_styling.md` lists `@beyo/clock-kiosk` as sourced and `@beyo/worker-shifts` as `no — omit`. No app stylesheet changed. |
| C5 — floor test typechecking | Fixed. The floor app no longer excludes `src/**/*.test.ts(x)` from `tsconfig.app.json`; root typecheck covers all five floor source test files. |
| C6 — unused direct dependencies | Fixed. The floor host no longer directly declares `@beyo/api-client` or `@beyo/notifications`; `npm install`, typecheck, and build remain green. |
| C7 — explicit revoked-device note | Fixed. The existing sole `AuthProvider` expiry listener invokes an optional callback. Only the floor root supplies it, recording a session-scoped flag that `SignInPage` reads and clears. Tablet Playwright proves stored token → authenticated `/users/me` request → mocked 401 → token removal → `/sign-in` with the note visible. |
| C8 — unattended PWA update | Fixed. The floor PWA now uses `registerType: "autoUpdate"`. |

## Files changed

Implementation and configuration:

- `package.json`
- `package-lock.json`
- `architecture/14_styling.md`
- `apps/floor-app/ManagerBeyo-app-floor/package.json`
- `apps/floor-app/ManagerBeyo-app-floor/playwright.config.ts`
- `apps/floor-app/ManagerBeyo-app-floor/tsconfig.app.json`
- `apps/floor-app/ManagerBeyo-app-floor/vite.config.ts`
- `apps/floor-app/ManagerBeyo-app-floor/src/app/RootRoute.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/lib/floor-session-expired.ts`
- `apps/floor-app/ManagerBeyo-app-floor/src/pages/DeviceSettingsPage.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/pages/DeviceSettingsPage.test.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/pages/SignInPage.tsx`
- `apps/floor-app/ManagerBeyo-app-floor/src/store/device-config.store.ts`
- `apps/floor-app/ManagerBeyo-app-floor/src/store/device-config.store.test.ts`
- `apps/floor-app/ManagerBeyo-app-floor/src/test/setup.ts`
- `apps/floor-app/ManagerBeyo-app-floor/tests/playwright/floor-revoked.spec.ts`
- `packages/auth/src/components/AuthProvider.tsx`

Lifecycle documentation:

- `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase3_corrections_20260729.md`
- `docs/architecture/archives/ARCHIVE_clock_kiosk_phase3_corrections_20260729_1930.md`
- `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase3_corrections_20260729.md`
- `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- `docs/architecture/under_construction/intention/clock_in_app.md`

## Validation

- `npm install` — passed; workspace lock metadata refreshed after removing the two unused floor declarations. Existing Node 23 engine warnings remain informational.
- `npm run typecheck` — passed with zero TypeScript errors, including floor source tests and the new explicit `@beyo/clock-kiosk` package entry.
- `npm run test:unit --workspace managerbeyo-app-floor` — passed: 5 files, 8 tests.
- `npm run test:ui` — passed: 29 files, 162 tests.
- `npm run test:auth` — passed: 2 files, 3 tests.
- `npm run test:api-client` — passed: 1 file, 3 tests.
- `npx playwright test --grep floor-bootstrap --project=mobile` — passed: 1/1.
- `npx playwright test --grep floor-bootstrap --project=tablet` — passed: 1/1.
- `npx playwright test --grep floor-bootstrap --project=desktop` — passed: 1/1.
- `npx playwright test --grep floor-revoked --project=tablet` — passed: 1/1.
- `npm run lint --workspace managerbeyo-app-floor` — passed.
- `npm run build --workspace managerbeyo-app-floor` — passed; PWA service worker and manifest generated.
- `git diff --check` — passed.

The first Playwright launch exposed npm's missing optional Darwin ARM64 native bindings for Rolldown and Lightning CSS. They were restored locally with `npm install --no-save`; no project dependency declaration was added for this environment-only repair.

## Trace

The corrections plan is archived at the path in Metadata. The governing master remains `approved` and records C1–C8 completion plus the preserved C9–C11 dispositions in its Review log.
