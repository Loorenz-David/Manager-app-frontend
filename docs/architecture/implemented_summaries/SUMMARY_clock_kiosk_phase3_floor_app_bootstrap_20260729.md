# SUMMARY_clock_kiosk_phase3_floor_app_bootstrap_20260729

## Metadata

- Summary ID: `SUMMARY_clock_kiosk_phase3_floor_app_bootstrap_20260729`
- Status: `summarized`
- Owner agent: Codex
- Created at (UTC): `2026-07-29T16:42:59Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase3_floor_app_bootstrap_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`

## What was implemented

- Bootstrapped `apps/floor-app/ManagerBeyo-app-floor` as a registered Vite,
  React, Tailwind, PWA, Vitest, ESLint, TypeScript, and Playwright workspace on
  dev port 5175.
- Mounted the standard infrastructure providers and router-aware
  `SurfaceProvider` + `AuthProvider appScope="floor"` without tabs,
  SlideStack, or realtime.
- Added guest `/sign-in` and protected `/` routes. The protected route renders
  only an empty placeholder inside the real `KioskFrame` + `KioskHeader`
  chrome.
- Added a persisted, validated device-config store for `terminalLabel` and
  `autoReturnSeconds` (default 12), plus a device settings page registered as a
  `rise` surface.
- Added 600 ms pointer/keyboard long-press handling on the header identity
  block. Tap/click does not open settings.
- Added the terminal-label setup field around the existing
  `SignInForm appScope="floor"`, terminal-signed-out recovery copy, and
  workspace-time-zone clock/date formatting that ticks each second.
- Added inline-confirmed terminal logout. The floor app selects the shared
  auth hook's floor-only path, which attempts the logout POST and guarantees
  persisted-token, in-memory-token, auth-store, and query-cache cleanup on
  success or failure; the host callback optionally wipes device config.
- Added an injectManifest service worker, standalone `orientation: any`
  manifest, SVG icons, viewport-safe HTML, and self-hosted Instrument Sans /
  IBM Plex Mono font faces.
- Registered the Claude-owned `RiseSurface` additively in the shared
  `@beyo/ui` renderer and surface union. Existing slide/sheet/modal shell cases
  were not changed.
- Extended `@beyo/ui` tests for rise open/close history, stacking, covered
  surface inertness, dialogs, and backdrop rendering; documented rise in
  `architecture/28_surfaces_local.md`.

## Final Tailwind source registration

```css
@source "../../../../packages/ui/src";
@source "../../../../packages/hooks/src";
@source "../../../../packages/auth/src";
@source "../../../../packages/lib/src";
@source "../../../../packages/clock-kiosk/src";
```

The generated production CSS was checked for `.bg-kiosk-canvas`,
`.font-kiosk-sans`, and `.max-w-\[760px\]`.

## Files changed

- New floor workspace: environment files; Vite/Vitest/Playwright/ESLint and
  TypeScript configs; `index.html`; PWA icon/service worker; four font files;
  app/providers/router/root/surface registry; host chrome assembly; routes;
  sign-in/settings/placeholder pages; device store; clock and long-press hooks;
  unit tests; Playwright fixture and smoke spec.
- `.gitignore`, `package.json`, `package-lock.json`: trackable floor env files,
  ignored TypeScript build metadata, floor workspace registration, dependency
  lock, and root typecheck chain.
- `packages/ui/src/providers/SurfaceProvider.tsx`: additive rise import, union
  member, and renderer-map entry.
- `packages/ui/src/providers/surface-history.test.ts`,
  `packages/ui/src/providers/SurfaceProvider.rise.test.tsx`: rise regression
  coverage.
- `apps/{managers-app,workers-app,selleres-app}/.../SurfaceRouteFrame.tsx`:
  type-only exclusion of the non-routed rise surface.
- `architecture/28_surfaces_local.md`: rise surface contract entry.
- `packages/auth/src/api/use-sign-out.ts`: additive floor-gated sign-out path
  with unconditional local revocation in `finally`; the pre-existing
  non-floor function remains unchanged.
- `packages/auth/src/api/use-sign-out.test.tsx`: logout-API-failure coverage for
  the floor storage key and complete local teardown, plus non-floor failure
  invariance.
- Lifecycle artifacts: this summary, archive record, archived child plan,
  intention-plan progress, and master Review-log entry.

The existing chrome files in `packages/clock-kiosk` and
`packages/ui/src/components/surfaces/RiseSurface.tsx` were read-only and were
not edited.

## Validation evidence

- `npm install` from the monorepo root: pass, exit 0. npm reported the
  pre-existing Node-engine warning for `@zxing/library` and the existing audit
  count (15 high); neither blocked install.
- `npm run typecheck`: pass, exit 0, including the new floor workspace and the
  complete registered shared-package chain.
- `npm run test:auth`: pass, 2 files / 3 tests. The failed floor logout case
  clears the persisted key, in-memory token, auth store, and query cache; the
  default non-floor failure path retains its previous behavior.
- Floor `npm run test:unit`: pass, 4 files / 6 tests (clock, device store,
  router guards, and long-press-only settings access).
- `npm run test:ui`: pass, 29 files / 162 tests. One pre-existing Framer Motion
  stderr warning from `AnimatedRemoval` remained non-failing.
- `npx playwright test --grep floor-bootstrap --project=desktop`: pass, 1/1.
  The mocked floor sign-in asserted request scope, terminal label, workspace
  chrome, and an HH:mm change after advancing the browser clock one minute.
- Floor `npm run build`: pass. Vite transformed 3668 modules and injectManifest
  precached 18 entries.
- Floor `npm run lint`: pass, zero errors.

The clean install omitted two platform optional packages despite their
package declarations. The first post-install Playwright start therefore
failed before tests could run; installing the exact Rolldown and Lightning CSS
Darwin ARM64 versions with `--no-save` repaired the local toolchain, and the
required Playwright rerun passed without a manifest or product-code change.

## Deviations and justifications

- Added `@source` entries for `@beyo/clock-kiosk` and `@beyo/lib` beyond the
  child criterion's short list. Both are consumed class-bearing packages, so
  §14 and the plan's reviewer-grep requirement make these entries mandatory.
- Supplied app-local font binaries from the official Google Fonts repository
  because the prompt-described committed font assets were absent.
- Narrowed three existing apps' route-frame state types to exclude `rise`.
  This is a compile-only consequence of widening the shared union; their
  existing shell maps and runtime behavior are unchanged.
- Did not enable `exactOptionalPropertyTypes` or
  `noUncheckedIndexedAccess` in the floor consumer project because raw
  workspace-package source currently fails those flags in unrelated existing
  modules. The app stays strict and all authoritative root/package typechecks
  pass.
- Used the kit's actual exported `DeviceSettingsPanel` name inside a rise
  surface; the plan's “DeviceSettingsSurface chrome” wording did not correspond
  to an exported component.
- Did not implement the optional corrupt-persisted-JWT cleanup (Phase 2 L1).
  The required M1 fix is instead implemented at the shared auth boundary
  behind an explicit floor scope, exactly as the amended criterion requires.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_clock_kiosk_phase3_floor_app_bootstrap_20260729_1642.md`
