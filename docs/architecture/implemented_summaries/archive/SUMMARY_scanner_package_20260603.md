# SUMMARY_scanner_package_20260603

## Metadata

- Summary ID: `SUMMARY_scanner_package_20260603`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-03T17:48:00Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_scanner_package_20260603.md`
- Related debug plan (optional): `—`

## What was implemented

- Created a new shared workspace package at `packages/scanner` by moving the scanner core modules behind the `@beyo/scanner` package boundary and adding a slide-specific route entry plus scanner surface ids.
- Registered the scanner as a managers-app slide surface, added Tailwind source discovery for the new package, and mounted `useCameraAppLifecycleFlow` once at the app root.
- Wired `ItemIdentityField` scan buttons in the Internal, Pre-Order, and Return task-creation flows so they open the shared scanner, prewarm the camera, write the decoded QR value into the active identity field, and close immediately on success.
- Added the required workspace/runtime dependencies so the managers app consumes `@beyo/scanner` plus ZXing through npm workspaces.

## Files changed

- `packages/scanner/*`: added the new scanner workspace package, copied scanner-core modules, and created `ScannerSlideContent`, `ScannerSlideRouteEntry`, `surface-ids`, and the package barrel.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/*`: registered the scanner slide surface, exported its preload helper, and added an `onOpenScanner` callback path in `ItemIdentityField`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/*FormContent.tsx`: hoisted scanner surface preloads, prewarmed the camera session, and wired scan callbacks into the active `item.article_number` or `item.sku` form field.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/providers.tsx`: mounted the shared camera lifecycle handler.
- `apps/managers-app/ManagerBeyo-app-managers/package.json` and `src/index.css`: added the scanner workspace dependency, ZXing deps, and the Tailwind `@source` entry.

## Contract adherence

- `architecture/35_shared_packages.md`: the scanner now lives as a source package under `packages/` with raw TypeScript exports, peer dependencies only, and app-side Tailwind `@source` registration.
- `architecture/28_surfaces_local.md`: the managers app registers the scanner as a `slide` surface, matching the local surface-shell contract.
- `architecture/30_dynamic_loading_local.md`: the scanner surface uses `lazyWithPreload`, and the staged task-creation forms hoist its preload at form-container level.

## Validation evidence

- `npm install`: pass, executed in `frontend/`; verified `node_modules/@beyo/scanner` is a symlink to `packages/scanner`
- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run build`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- Workers app integration remains deferred exactly as scoped; only the managers app consumes `@beyo/scanner` in this implementation.
- QR-only decoding remains unchanged; barcode format expansion, lens switching, and confirmation/freeze-frame flows were intentionally left out.

## Handoff notes (if needed)

- None.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_scanner_package_20260603.md`
