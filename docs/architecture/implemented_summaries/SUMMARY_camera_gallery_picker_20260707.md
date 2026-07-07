# SUMMARY_camera_gallery_picker_20260707

## Metadata

- Summary ID: `SUMMARY_camera_gallery_picker_20260707`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T11:06:10Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_camera_gallery_picker_20260707.md`
- Related debug plan (optional): `—`

## What was implemented

- Replaced the camera page's bottom-left "latest image" affordance with an always-available device image picker that opens the native file chooser for `image/*`.
- Routed selected files through the existing `onCapture` pipeline so device-picked images follow the same optimistic insert, compression/upload, and editor handoff as live camera captures.
- Removed the now-dead `latestImageUrl` and `onViewLatest` camera surface props from the images controller wiring.
- Added Playwright coverage for the device-picker path using a real image asset already present in the repository.

## Files changed

- `packages/images/src/pages/ImageCameraPage.tsx`: replaced latest-image preview state with hidden file input handling and the new select-from-device button.
- `packages/images/src/controllers/use-entity-images.controller.ts`: removed obsolete camera surface props and latest-image viewer wiring.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/images/images-item-flow.spec.ts`: added a device-picker flow test and fixed the fixture path to the shared repo image asset.

## Contract adherence

- `architecture/07_components.md`: kept `ImageCameraPage` as a thin surface-prop consumer with no controller or API imports added.
- `architecture/08_hooks.md`: kept controller changes confined to the surface callback wiring in `openCamera`.
- `architecture/17_testing.md`: extended the existing cohesive Playwright image flow spec rather than creating parallel test infrastructure.
- `architecture/34_runtime_validation.md`: added stable `data-testid` selectors for the new picker button and hidden file input.

## Validation evidence

- `npm run typecheck`: pass
- `npx playwright test tests/playwright/features/images/images-item-flow.spec.ts --project=mobile --grep "selects an image from the device picker"`: pass
- `npx playwright test tests/playwright/features/images/images-item-flow.spec.ts --project=desktop --grep "selects an image from the device picker"`: pass
- `npx playwright test tests/playwright/features/images/images-item-flow.spec.ts --project=mobile`: fail, existing camera keep-alive assertions in the broader spec still fail outside the new picker case
- `npx playwright test tests/playwright/features/images/images-item-flow.spec.ts --project=desktop`: fail, existing camera keep-alive/upload timing assertions in the broader spec still fail outside the new picker case

## Known gaps or deferred items

- The broader `images-item-flow` Playwright spec still has pre-existing failures around camera keep-alive and upload timing assertions that are not specific to the new device-picker path.
- Device-picker validation currently reuses an existing repository image asset instead of a manager-app-local fixture file because a suitable real image already existed in the repo.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_camera_gallery_picker_20260707.md`
