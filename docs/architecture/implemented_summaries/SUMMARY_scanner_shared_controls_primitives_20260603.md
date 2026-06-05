# SUMMARY_scanner_shared_controls_primitives_20260603

## Metadata

- Summary ID: `SUMMARY_scanner_shared_controls_primitives_20260603`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-03T19:28:59Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_TBD_scanner_shared_controls_primitives_20260603.md`
- Related debug plan (optional): `—`

## What was implemented

- Added `ScannerCloseControl` as a shared bottom-right scanner close affordance inside `@beyo/scanner`.
- Added `ScannerLensPicker` as a shared centered pill-style multi-lens control that renders only when multiple camera lenses are available.
- Extended `ScannerSlideContent` with a `children` composition slot so route entries and future app-owned overlays can mount controls inside the scanner shell.
- Exported `ScannerCloseControl`, `ScannerLensPicker`, and `FrozenFrameCanvas` from the scanner package public API so future app-owned scanner routes can compose them directly.

## Files changed

- `packages/scanner/src/ui/ScannerCloseControl.tsx`: added the shared close button primitive.
- `packages/scanner/src/ui/ScannerLensPicker.tsx`: added the shared multi-lens picker primitive.
- `packages/scanner/src/ui/ScannerSlideContent.tsx`: added `children` support for in-shell overlay composition.
- `packages/scanner/src/index.ts`: exported the new control primitives plus `FrozenFrameCanvas`.

## Contract adherence

- `architecture/35_shared_packages.md`: the new scanner controls stay inside the shared source package boundary and are exported through the raw TypeScript barrel.
- `architecture/07_components.md`: both controls are pure prop-driven UI primitives with named exports and no business logic.
- `architecture/28_surfaces_local.md`: the controls are scanner-shell overlays inside the slide content, not app-level surface chrome.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- Lens-switching state ownership was intentionally deferred to the next plan; the picker is presentational only in this step.
- No managers-app composition changes were made in this plan; the shared controls are consumed in the next plan.

## Handoff notes (if needed)

- None.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_TBD_scanner_shared_controls_primitives_20260603.md`
