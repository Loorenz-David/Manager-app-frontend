# PLAN_05_images_preview_grid_and_add_picture_trigger_20260521

## Metadata

- Plan ID: `PLAN_05_images_preview_grid_and_add_picture_trigger_20260521`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T21:48:13Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01`, `PLAN_04`

## Goal and intent

- Goal: Build the reusable image preview grid and add-picture trigger UI. These are the primary visual components that consuming features place in forms and detail pages.
- Business/user intent: Users should see their images immediately as a 3×2 square grid. Tapping a tile opens the full-screen viewer. Long-pressing enters reorder/delete mode (skeleton only — full implementation in PLAN_09). Adding a new picture opens the camera.
- Non-goals: Camera surface (PLAN_06), carousel viewer (PLAN_07), reorder/delete implementation (PLAN_09), annotation editor (PLAN_10). This plan builds the grid and triggers only.

## Scope

- In scope:
  - `src/features/images/providers/EntityImagesProvider.tsx` — wraps `useEntityImagesController`, provides context
  - `src/features/images/components/ImagePreviewGrid.tsx` — 3-column CSS grid, max 2 rows default, renders tiles + add-picture button
  - `src/features/images/components/ImagePreviewTile.tsx` — single square tile: cover image, upload overlay, tap handler
  - `src/features/images/components/ImageUploadOverlay.tsx` — dark overlay + spinner for uploading state, error badge for failed state
  - `src/features/images/components/ImageAddPictureButton.tsx` — standalone "+ Add picture" trigger button
- Out of scope: Drag-and-drop, reorder mode, camera stream, carousel viewer, annotation, surface page components.
- Assumptions:
  - The provider is consumed by pages/forms — NOT by the images feature internally.
  - All surface-opening logic (camera, viewer) goes through the controller.
  - `data-testid` must be added to all interactive elements for PLAN_12 Playwright coverage.

## Clarifications required

- [x] Reorder mode entry (long-press) is a skeleton only in this plan — the tile shows a long-press handler that does nothing yet. Full implementation in PLAN_09.

## Acceptance criteria

1. `EntityImagesProvider` exports both the provider component and `useEntityImagesContext` hook.
2. `ImagePreviewGrid` renders up to 6 tiles by default (3×2), with the add-picture button occupying the next available slot if < 6 images.
3. `ImagePreviewTile` shows the upload overlay when `uploadState` is uploading/compressing/confirming.
4. `ImagePreviewTile` shows an error badge when `uploadState === 'failed'`.
5. Tapping a confirmed tile calls `controller.openViewer(imageClientId)`.
6. `ImageAddPictureButton` calls `controller.openCamera()` when tapped.
7. All interactive elements have `data-testid` attributes.
8. No component imports from `api/`, `actions/`, `controllers/`, `store/`, or `lib/` directly — only context hook.
9. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: general conventions
- `architecture/07_components.md`: component builds from smallest leaf upward, context consumption
- `architecture/14_styling.md`: Tailwind utility-first, CSS grid, `cva` for variants
- `architecture/15_feature_structure.md`: `providers/`, `components/` folder placement, `index.ts` boundary
- `architecture/23_providers.md`: provider exports component + context hook, context value is controller return type
- `architecture/27_responsive.md`: mobile-first, touch targets, safe areas
- `architecture/32_loading_skeletons.md`: skeleton for `isPending` state

### Local extensions loaded

- `architecture/28_surfaces_local.md`: surface types reference (slide/sheet) — for context about what `openCamera` and `openViewer` eventually do.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/images/controllers/use-entity-images.controller.ts` — verify `EntityImagesController` shape and surface IDs.
- `src/features/images/types.ts` — `ImageViewModel`, `ImageUploadState`.
- `src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx` — verify existing provider + context hook pattern in this project.
- `src/features/upholstery/components/UpholsteryCard.tsx` — verify `cva` + `cn` styling pattern in use.
- `src/components/primitives/index.ts` — verify which shared primitives are available (spinner, etc.).

Prohibited reads:
- Any feature's provider to understand the provider pattern — use `23_providers.md`.

### Skill selection

- Primary skill: none (pure implementation)

## Implementation plan

### Step 1 — Create `src/features/images/providers/EntityImagesProvider.tsx`

```tsx
import { createContext, useContext } from 'react';
import { useEntityImagesController } from '../controllers/use-entity-images.controller';
import type { EntityImagesController } from '../controllers/use-entity-images.controller';
import type { ImageLinkEntityType } from '../types';

type EntityImagesProviderProps = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  viewerMode?: 'preview-only' | 'preview-edit';
  children: React.ReactNode;
};

const EntityImagesContext = createContext<EntityImagesController | null>(null);

export function EntityImagesProvider({
  entityType,
  entityClientId,
  viewerMode,
  children,
}: EntityImagesProviderProps): React.JSX.Element {
  const controller = useEntityImagesController({ entityType, entityClientId, viewerMode });
  return (
    <EntityImagesContext.Provider value={controller}>
      {children}
    </EntityImagesContext.Provider>
  );
}

export function useEntityImagesContext(): EntityImagesController {
  const ctx = useContext(EntityImagesContext);
  if (!ctx) {
    throw new Error(
      'useEntityImagesContext must be used within <EntityImagesProvider>',
    );
  }
  return ctx;
}
```

### Step 2 — Create `src/features/images/components/ImageUploadOverlay.tsx`

Overlay displayed on top of a tile during upload or error states.

```tsx
import { cn } from '@/lib/utils';
import type { ImageUploadState } from '../types';

type ImageUploadOverlayProps = {
  uploadState: ImageUploadState;
};

const UPLOADING_STATES: ImageUploadState[] = [
  'captured',
  'compressing',
  'requesting_upload_url',
  'uploading',
  'confirming',
];

export function ImageUploadOverlay({ uploadState }: ImageUploadOverlayProps): React.JSX.Element | null {
  const isUploading = UPLOADING_STATES.includes(uploadState);
  const isFailed = uploadState === 'failed';

  if (!isUploading && !isFailed) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center rounded-xl',
        isUploading && 'bg-black/40',
        isFailed && 'bg-destructive/60',
      )}
      data-testid="image-upload-overlay"
    >
      {isUploading ? (
        // Spinner — use existing spinner primitive or a simple Tailwind spinner
        <div
          className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
          data-testid="image-upload-spinner"
          aria-label="Uploading"
        />
      ) : (
        // Error badge
        <span
          className="text-xs font-medium text-white"
          data-testid="image-upload-error-badge"
          aria-label="Upload failed"
        >
          Failed
        </span>
      )}
    </div>
  );
}
```

### Step 3 — Create `src/features/images/components/ImagePreviewTile.tsx`

A single square tile. Uses `aspect-square` to maintain 1:1 ratio.

```tsx
import { useCallback } from 'react';
import { ImageUploadOverlay } from './ImageUploadOverlay';
import { cn } from '@/lib/utils';
import type { ImageViewModel } from '../types';

type ImagePreviewTileProps = {
  image: ImageViewModel;
  onTap: (imageClientId: string) => void;
  onLongPress?: (imageClientId: string) => void;
  isEditMode?: boolean;
  onDeletePress?: (imageClientId: string) => void;
  testId?: string;
};

export function ImagePreviewTile({
  image,
  onTap,
  onLongPress,
  isEditMode = false,
  onDeletePress,
  testId,
}: ImagePreviewTileProps): React.JSX.Element {
  const displayUrl = image.localObjectUrl ?? image.imageUrl;
  const isUploading =
    image.uploadState !== 'completed' &&
    image.uploadState !== 'idle' &&
    image.uploadState !== 'failed';
  const isFailed = image.uploadState === 'failed';
  const isInteractive = !isUploading;

  const handleClick = useCallback(() => {
    if (isInteractive) {
      onTap(image.clientId);
    }
  }, [isInteractive, onTap, image.clientId]);

  return (
    <div
      className={cn(
        'relative aspect-square overflow-hidden rounded-xl bg-muted',
        isEditMode && 'animate-[shake_0.4s_ease-in-out_infinite]', // CSS shake added in PLAN_09
      )}
      data-testid={testId ?? `image-preview-tile-${image.clientId}`}
    >
      {/* Image */}
      <button
        type="button"
        className="size-full"
        onClick={handleClick}
        disabled={!isInteractive}
        aria-label={isFailed ? 'Upload failed' : 'View image'}
        data-testid={`image-preview-tile-button-${image.clientId}`}
      >
        <img
          src={displayUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </button>

      {/* Upload overlay */}
      <ImageUploadOverlay uploadState={image.uploadState} />

      {/* Delete button in edit mode — skeleton for PLAN_09 */}
      {isEditMode && onDeletePress ? (
        <button
          type="button"
          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white"
          onClick={() => onDeletePress(image.clientId)}
          aria-label="Delete image"
          data-testid={`image-delete-button-${image.clientId}`}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
```

### Step 4 — Create `src/features/images/components/ImageAddPictureButton.tsx`

```tsx
import { Camera } from 'lucide-react';

type ImageAddPictureButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  testId?: string;
};

export function ImageAddPictureButton({
  onPress,
  disabled = false,
  testId,
}: ImageAddPictureButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      onClick={onPress}
      disabled={disabled}
      data-testid={testId ?? 'image-add-picture-button'}
      aria-label="Add picture"
    >
      <Camera className="size-5 shrink-0" aria-hidden="true" />
      <span className="text-xs font-medium">Add picture</span>
    </button>
  );
}
```

### Step 5 — Create `src/features/images/components/ImagePreviewGrid.tsx`

The grid consumes the context. It assembles tiles + the add-picture button.

```tsx
import { useEntityImagesContext } from '../providers/EntityImagesProvider';
import { ImagePreviewTile } from './ImagePreviewTile';
import { ImageAddPictureButton } from './ImageAddPictureButton';

const MAX_VISIBLE_IMAGES = 6;

type ImagePreviewGridProps = {
  maxImages?: number;
  testId?: string;
};

export function ImagePreviewGrid({
  maxImages = MAX_VISIBLE_IMAGES,
  testId,
}: ImagePreviewGridProps): React.JSX.Element {
  const {
    images,
    isPending,
    openCamera,
    openViewer,
    deleteImage,
  } = useEntityImagesContext();

  const visibleImages = images.slice(0, maxImages);
  const showAddButton = visibleImages.length < maxImages;

  if (isPending) {
    // Skeleton: 3×2 grid of loading tiles
    return (
      <div
        className="grid grid-cols-3 gap-2"
        data-testid={testId ?? 'image-preview-grid-skeleton'}
        aria-label="Loading images"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-3 gap-2"
      data-testid={testId ?? 'image-preview-grid'}
    >
      {visibleImages.map((image) => (
        <ImagePreviewTile
          key={image.clientId}
          image={image}
          onTap={openViewer}
          onDeletePress={deleteImage}
          testId={`image-preview-tile-${image.clientId}`}
        />
      ))}
      {showAddButton ? (
        <ImageAddPictureButton
          onPress={openCamera}
          testId="image-add-picture-button"
        />
      ) : null}
    </div>
  );
}
```

### Step 6 — Typecheck

Run `npm run typecheck`. Resolve any TypeScript errors.

## Risks and mitigations

- Risk: `IMAGE_ADD_PICTURE` slot disappears when exactly 6 images exist — user can't add more.
  Mitigation: Intentional per spec — max 6 images in the grid. If the product needs more, the consuming page can use a separate add button below the grid. Document this in the component's JSDoc comment.

- Risk: `localObjectUrl` used as `src` may be a revoked URL if the controller revoked it before the image re-renders.
  Mitigation: Controller (PLAN_04) only revokes after patching `localObjectUrl: null` in the store, so the tile will already be showing `imageUrl` by the time the URL is revoked. The component always prefers `localObjectUrl ?? imageUrl`.

## Validation plan

- `npm run typecheck`: zero errors.
- Unit tests (PLAN_12): `ImagePreviewGrid` renders correct number of tiles and the add-picture button.
- Unit tests (PLAN_12): `ImagePreviewTile` shows overlay when `uploadState === 'uploading'`.
- Unit tests (PLAN_12): `ImageAddPictureButton` calls `onPress` when clicked.
- Playwright (PLAN_12): grid renders on item form, add-picture button triggers camera surface.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
