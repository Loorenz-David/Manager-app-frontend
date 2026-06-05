# SUMMARY_scanner_multi_format_20260603

## Metadata

- Summary ID: `SUMMARY_scanner_multi_format_20260603`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-03T18:22:11Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_scanner_multi_format_20260603.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended `@beyo/scanner` with a shared `ScanFormat` type and format-aware ZXing reader factory caching for `"qr"`, `"barcode"`, and `"any"` decode modes.
- Added barcode-specific guide geometry and ROI selection so barcode scans use a wide rectangular sampling region while QR and `"any"` keep the square guide.
- Threaded `scanFormat` through the scanner slide surface props, route entry, content component, guide overlay, and decode-session hook so the UI and decoder stay aligned.
- Updated the managers-app task-creation forms so article number scanning opens the shared scanner in `"barcode"` mode and SKU scanning opens it in `"qr"` mode.

## Files changed

- `packages/scanner/src/types.ts`, `surface-ids.ts`, and `index.ts`: added and exported `ScanFormat` plus the new barcode guide helpers.
- `packages/scanner/src/domain/zxing-loader.ts`, `scanner-guide.ts`, and `camera-session.manager.ts`: added per-format reader hints and barcode-specific ROI geometry.
- `packages/scanner/src/flows/use-qr-scanner.ts` and `packages/scanner/src/pages/ScannerSlideRouteEntry.tsx`: threaded `scanFormat` through the decode-session lifecycle.
- `packages/scanner/src/ui/ScannerGuideOverlay.tsx` and `ScannerSlideContent.tsx`: rendered square vs. rectangular guides based on the requested scan format.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/*FormContent.tsx`: selected `"barcode"` for article numbers and `"qr"` for SKUs when opening the scanner slide.

## Contract adherence

- `architecture/35_shared_packages.md`: the scanner changes stayed inside the shared source package boundary and continued to expose raw TypeScript entrypoints with app-owned runtime dependencies.
- `architecture/30_dynamic_loading_local.md`: the managers-app still opens the scanner via the existing preloaded slide surface registration rather than adding a separate app-local scanner implementation.
- `architecture/28_surfaces_local.md`: the scanner remains a `slide` surface, with only its props and internal behavior extended.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run build`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- Workers app integration remains out of scope; no workers-app scanner callers were updated.
- `"any"` mode intentionally reuses the square QR guide, so it is less optimized for wide barcodes than explicit `"barcode"` mode.

## Handoff notes (if needed)

- None.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_scanner_multi_format_20260603.md`
