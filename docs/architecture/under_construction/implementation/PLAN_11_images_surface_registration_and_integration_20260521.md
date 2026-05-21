# PLAN_11_images_surface_registration_and_integration_20260521

## Metadata

- Plan ID: `PLAN_11_images_surface_registration_and_integration_20260521`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: All previous plans (PLAN_01 through PLAN_10)

## Goal and intent

- Goal: Wire all image surface pages into the surface registry and build the public API (`index.ts`) so consuming features can use the complete image system.
- Business/user intent: The feature is useless until it's registered — `openCamera()`, `openViewer()`, and `openMetadataSheet()` from the controller all call `surface.open(id, props)`. Those IDs must be registered.
- Non-goals: Any implementation details already handled in previous plans.

## Scope

- In scope:
  - `src/features/images/surfaces.ts` — register all 4 image surfaces (camera, viewer, metadata sheet, editor)
  - `src/features/images/preload.ts` — preload functions for camera and viewer surfaces
  - `src/features/images/index.ts` — public API of the images feature
  - `src/app/surface-registry.ts` — spread `imageSurfaces` into the registry
- Out of scope: All implementation files (done in previous plans).
- Assumptions:
  - Surface IDs in this plan must exactly match the IDs used in `useEntityImagesController` (PLAN_04): `'image-camera'`, `'image-viewer'`, `'image-metadata'`, `'image-editor'`.
  - The camera and viewer are `slide` surfaces (full-page). The metadata sheet is a `sheet` surface (Vaul bottom drawer). The editor is a `slide` surface.

## Clarifications required

- [x] No `path` is needed for `slide` surfaces in this app — confirmed by existing `testing_forms` and `upholstery` surface patterns.

## Acceptance criteria

1. All 4 surface IDs (`image-camera`, `image-viewer`, `image-metadata`, `image-editor`) are registered in `surfaces.ts`.
2. `imageSurfaces` is spread into `src/app/surface-registry.ts`.
3. `preloadImageCameraSurface` and `preloadImageViewerSurface` are exported from `preload.ts`.
4. `src/features/images/index.ts` exports: `EntityImagesProvider`, `useEntityImagesContext`, `ImagePreviewGrid`, `ImageAddPictureButton`, `ImageSortableGrid`, relevant public types.
5. Internal components (`ImagePreviewTile`, `ImageUploadOverlay`, `ImageAnnotationCanvas`, `ImageAnnotationToolbar`, `ImageCarouselIndicators`) are NOT exported from `index.ts`.
6. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/15_feature_structure.md`: `surfaces.ts`, `preload.ts`, `index.ts` boundary
- `architecture/30_dynamic_loading.md`: lazy surface registration pattern, preload functions

### Local extensions loaded

- `architecture/28_surfaces_local.md`: surface types, `slide` for full-page, `sheet` for bottom overlay.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/items/surfaces.ts` — verify the preload + lazy pattern in this project.
- `src/app/surface-registry.ts` — verify the spread pattern and existing imports.
- `src/features/upholstery/surfaces.ts` — verify the `slide` surface without `path`.
- `src/features/images/controllers/use-entity-images.controller.ts` — confirm surface IDs used.

### Skill selection

- Primary skill: none

## Implementation plan

### Step 1 — Create `src/features/images/surfaces.ts`

Follow the exact pattern from `src/features/items/surfaces.ts`.

```ts
import { lazy } from 'react';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

const preloadedImageSurfaces = new Set<string>();

function loadImageCameraPage() {
  return import('@/features/images/pages/ImageCameraPage').then((m) => ({
    default: m.ImageCameraPage,
  }));
}

function loadImageFullscreenViewerPage() {
  return import('@/features/images/pages/ImageFullscreenViewerPage').then((m) => ({
    default: m.ImageFullscreenViewerPage,
  }));
}

function loadImageMetadataActionsSheetPage() {
  return import('@/features/images/pages/ImageMetadataActionsSheetPage').then((m) => ({
    default: m.ImageMetadataActionsSheetPage,
  }));
}

function loadImageEditorPage() {
  return import('@/features/images/pages/ImageEditorPage').then((m) => ({
    default: m.ImageEditorPage,
  }));
}

export function preloadImageCameraSurface(): Promise<unknown> {
  if (preloadedImageSurfaces.has('image-camera')) return Promise.resolve();
  preloadedImageSurfaces.add('image-camera');
  return loadImageCameraPage();
}

export function preloadImageViewerSurface(): Promise<unknown> {
  if (preloadedImageSurfaces.has('image-viewer')) return Promise.resolve();
  preloadedImageSurfaces.add('image-viewer');
  return loadImageFullscreenViewerPage();
}

export const imageSurfaces: SurfaceRegistrations = {
  'image-camera': {
    surface: 'slide',
    component: lazy(loadImageCameraPage),
  },
  'image-viewer': {
    surface: 'slide',
    component: lazy(loadImageFullscreenViewerPage),
  },
  'image-metadata': {
    surface: 'sheet',
    component: lazy(loadImageMetadataActionsSheetPage),
  },
  'image-editor': {
    surface: 'slide',
    component: lazy(loadImageEditorPage),
  },
};
```

### Step 2 — Create `src/features/images/preload.ts`

```ts
export { preloadImageCameraSurface, preloadImageViewerSurface } from './surfaces';
```

### Step 3 — Update `src/app/surface-registry.ts`

Read the current file first. Add the images import and spread:

```ts
// Add to imports:
import { imageSurfaces } from '@/features/images';

// Add to the surfaceRegistry spread:
export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...itemSurfaces,
  ...phoneInputSurfaces,
  ...upholsterySurfaces,
  ...imageSurfaces,  // ← add this line
};
```

Note: `imageSurfaces` must be exported from `@/features/images/index.ts` for this import to work. See Step 4.

### Step 4 — Create `src/features/images/index.ts`

The public API. Export only what consuming features and pages need.

```ts
// Providers — used by pages/forms to wrap image sections
export { EntityImagesProvider, useEntityImagesContext } from './providers/EntityImagesProvider';

// Top-level view components — used by pages/forms
export { ImagePreviewGrid } from './components/ImagePreviewGrid';
export { ImageAddPictureButton } from './components/ImageAddPictureButton';
export { ImageSortableGrid } from './components/ImageSortableGrid';

// Surface registrations — consumed by surface-registry.ts
export { imageSurfaces } from './surfaces';

// Preload functions — consumed by forms that use this feature
export { preloadImageCameraSurface, preloadImageViewerSurface } from './preload';

// Public types — used by other features/pages
export type {
  ImageViewModel,
  ImageUploadState,
  ImageAnnotationType,
  ImageLinkEntityType,
  EntityImagesController,
} from './types';

// Re-export EntityImagesController type from controller
export type { EntityImagesController } from './controllers/use-entity-images.controller';
```

**Note:** Do NOT export internal components: `ImagePreviewTile`, `ImageUploadOverlay`, `ImageCarouselIndicators`, `ImageAnnotationCanvas`, `ImageAnnotationToolbar`. These are private to the feature.

### Step 5 — Typecheck

Run `npm run typecheck`. Resolve any errors.

## Risks and mitigations

- Risk: `EntityImagesController` type exported from both `types.ts` (where it's defined as a local type) and `controllers/use-entity-images.controller.ts` (where `ReturnType<>` is used). This creates a duplicate export.
  Mitigation: Remove `EntityImagesController` from `types.ts` — it belongs only in the controller file. The `index.ts` re-exports from the controller file only.

- Risk: `surface-registry.ts` importing from `@/features/images` before `index.ts` is complete causes a circular import.
  Mitigation: `imageSurfaces` is a plain object constant — no React, no hooks. The import is safe at module level.

## Validation plan

- `npm run typecheck`: zero errors.
- Manual: navigate to an item form that uses `EntityImagesProvider` — all 4 surfaces open correctly.
- Check that `ImagePreviewTile` cannot be imported from `@/features/images` (TypeScript should error).

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
