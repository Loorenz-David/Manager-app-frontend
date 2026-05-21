# PLAN_07_images_fullscreen_carousel_viewer_20260521

## Metadata

- Plan ID: `PLAN_07_images_fullscreen_carousel_viewer_20260521`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T21:58:39Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01`, `PLAN_04`, `PLAN_05`

## Goal and intent

- Goal: Build the full-screen image carousel viewer using `embla-carousel-react`. Supports opening at a selected image, horizontal swiping, dot indicators, mode-aware edit button, and three-dot metadata action trigger.
- Business/user intent: Tapping any image in the preview grid opens this viewer. It should feel like a native photo viewer — smooth swipe, dark background, contain-fit images, indicator dots.
- Non-goals: Annotation editor internals (PLAN_10), metadata sheet internals (PLAN_08), camera (PLAN_06), surface registration (PLAN_11).

## Scope

- In scope:
  - `src/features/images/pages/ImageFullscreenViewerPage.tsx` — full-screen slide surface page with embla carousel
  - `src/features/images/components/ImageCarouselIndicators.tsx` — dot indicator bar
- Out of scope: Annotation editor, metadata sheet page component, camera.
- Assumptions:
  - `embla-carousel-react` must be installed. Verify with `package.json`. If not present, add it: `npm install embla-carousel-react embla-carousel`.
  - The page opens as a `slide` surface receiving: `{ images: ImageViewModel[], initialImageClientId: string, entityType, entityClientId, mode: 'preview-only' | 'preview-edit', onDelete?: (imageClientId: string) => void }`.
  - Viewer modes: `preview-only` — no delete, no edit button. `preview-edit` — delete and edit buttons visible.
  - The three-dot button opens the metadata sheet surface — calls `surface.open('image-metadata', { image, ... })`.

## Clarifications required

- [x] Mode is passed as a surface prop. The viewer does NOT own the delete logic — it calls `onDelete(imageClientId)` from surface props.
- [x] Annotation editor entry: tapping the edit button (in `preview-edit` mode) opens the annotation editor surface — calls `surface.open('image-editor', { image })`. Full implementation in PLAN_10.

## Acceptance criteria

1. Viewer opens at the `initialImageClientId` image without visible jump.
2. Horizontal swipe advances/retreats through images.
3. Dot indicators update as carousel scrolls.
4. Three-dot button (top right) calls `surface.open('image-metadata', ...)`.
5. Close/back button (bottom right) calls `useSurfaceStore.getState().closeTop()`.
6. In `preview-edit` mode: edit button (bottom left) visible, calling `surface.open('image-editor', ...)`.
7. Optimistic images (with `localObjectUrl`) render correctly — viewer uses `localObjectUrl ?? imageUrl`.
8. `data-testid` on all interactive elements.
9. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: general conventions
- `architecture/07_components.md`: component structure, leaf → view
- `architecture/14_styling.md`: Tailwind, dark overlay, safe area
- `architecture/15_feature_structure.md`: pages/ placement
- `architecture/18_performance.md`: GPU-friendly carousel, avoid jank
- `architecture/27_responsive.md`: full-screen mobile layout, safe areas
- `architecture/31_animations.md`: CSS-only, no heavy animation libraries for core behavior

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `slide` surface page pattern — `useSurfaceProps`, `useSurfaceStore.getState().closeTop()`.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/images/types.ts` — `ImageViewModel`, viewer mode types.
- `src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx` — verify surface props + close pattern.
- `package.json` — verify `embla-carousel-react` dependency exists.
- `src/hooks/use-surface.ts` — verify `useSurface().open(id, props)` signature.

### Skill selection

- Primary skill: none (pure implementation)

## Implementation plan

### Step 0 — Verify embla-carousel-react dependency

Read `package.json`. If `embla-carousel-react` is not in dependencies, add it:

```bash
npm install embla-carousel-react embla-carousel
```

### Step 1 — Create `src/features/images/components/ImageCarouselIndicators.tsx`

```tsx
import { cn } from '@/lib/utils';

type ImageCarouselIndicatorsProps = {
  count: number;
  activeIndex: number;
  testId?: string;
};

export function ImageCarouselIndicators({
  count,
  activeIndex,
  testId,
}: ImageCarouselIndicatorsProps): React.JSX.Element | null {
  if (count <= 1) return null;

  return (
    <div
      className="flex items-center justify-center gap-1.5"
      data-testid={testId ?? 'image-carousel-indicators'}
      role="tablist"
      aria-label="Image indicators"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === activeIndex}
          className={cn(
            'size-1.5 rounded-full transition-all duration-200',
            i === activeIndex
              ? 'w-4 bg-white'
              : 'bg-white/40',
          )}
          data-testid={`carousel-dot-${i}`}
        />
      ))}
    </div>
  );
}
```

### Step 2 — Create `src/features/images/pages/ImageFullscreenViewerPage.tsx`

**Surface props type:**

```ts
type ImageFullscreenViewerPageProps = {
  images: ImageViewModel[];
  initialImageClientId: string;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  mode: 'preview-only' | 'preview-edit';
  onDelete?: (imageClientId: string) => void;
};
```

**Implementation:**

```tsx
import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, MoreHorizontal, Pencil } from 'lucide-react';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurface } from '@/hooks/use-surface';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { ImageCarouselIndicators } from '../components/ImageCarouselIndicators';
import type { ImageViewModel, ImageLinkEntityType } from '../types';

export function ImageFullscreenViewerPage(): React.JSX.Element {
  const {
    images,
    initialImageClientId,
    entityType,
    entityClientId,
    mode,
    onDelete,
  } = useSurfaceProps<ImageFullscreenViewerPageProps>();

  const surface = useSurface();

  // Find initial index
  const initialIndex = Math.max(
    images.findIndex((img) => img.clientId === initialImageClientId),
    0,
  );

  // Embla carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: initialIndex,
    loop: false,
  });
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  // Sync active index with carousel scroll
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  const currentImage: ImageViewModel | undefined = images[activeIndex];

  const handleClose = useCallback(() => {
    useSurfaceStore.getState().closeTop();
  }, []);

  const handleMetadataPress = useCallback(() => {
    if (!currentImage) return;
    surface.open('image-metadata', {
      image: currentImage,
      entityType,
      entityClientId,
      mode,
      onDelete,
    });
  }, [surface, currentImage, entityType, entityClientId, mode, onDelete]);

  const handleEditPress = useCallback(() => {
    if (!currentImage) return;
    surface.open('image-editor', {
      image: currentImage,
      entityType,
      entityClientId,
    });
  }, [surface, currentImage, entityType, entityClientId]);

  return (
    <div
      className="relative flex h-full flex-col bg-black"
      data-testid="image-fullscreen-viewer"
    >
      {/* Top right — three-dot action button */}
      <div className="absolute right-4 top-safe-area-inset-top z-10 pt-4">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full bg-black/40"
          onClick={handleMetadataPress}
          aria-label="Image options"
          data-testid="viewer-metadata-button"
        >
          <MoreHorizontal className="size-5 text-white" />
        </button>
      </div>

      {/* Embla carousel — fills available space */}
      <div
        className="flex-1 overflow-hidden"
        ref={emblaRef}
        data-testid="viewer-carousel"
      >
        <div className="flex h-full">
          {images.map((image) => {
            const displayUrl = image.localObjectUrl ?? image.imageUrl;
            return (
              <div
                key={image.clientId}
                className="relative min-w-full flex-[0_0_100%]"
                data-testid={`viewer-slide-${image.clientId}`}
              >
                <img
                  src={displayUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  loading="lazy"
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom region — indicators + close + optional edit */}
      <div className="flex items-center justify-between px-6 pb-safe-area-inset-bottom pt-4">
        {/* Edit button (preview-edit mode only) */}
        {mode === 'preview-edit' ? (
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full bg-white/10"
            onClick={handleEditPress}
            aria-label="Edit image"
            data-testid="viewer-edit-button"
          >
            <Pencil className="size-5 text-white" />
          </button>
        ) : (
          <div className="size-10" /> // spacer
        )}

        {/* Dot indicators (center) */}
        <ImageCarouselIndicators
          count={images.length}
          activeIndex={activeIndex}
          testId="viewer-carousel-indicators"
        />

        {/* Close/back button */}
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full bg-white/10"
          onClick={handleClose}
          aria-label="Close viewer"
          data-testid="viewer-close-button"
        >
          <ChevronLeft className="size-5 text-white" />
        </button>
      </div>
    </div>
  );
}
```

### Step 3 — Typecheck

Run `npm run typecheck`. Resolve any errors.

## Risks and mitigations

- Risk: Embla `startIndex` doesn't match if `initialImageClientId` is not found in `images`.
  Mitigation: `findIndex` returns -1 which is clamped to 0 with `Math.max(..., 0)` — viewer opens at first image.

- Risk: `images` array passed via surface props may be stale if the controller updates after the viewer opens.
  Mitigation: For MVP, the images are passed at open time. The viewer is read-only for display. When the user deletes via metadata sheet, the surface closes, and the grid (which reads live from the controller) reflects the change. Full live sync is a future enhancement.

- Risk: Embla carousel may not align correctly if images have mixed aspect ratios.
  Mitigation: Each slide is `min-w-full` (full width), image uses `object-contain` — always contained within the viewport regardless of source dimensions.

## Validation plan

- `npm run typecheck`: zero errors.
- Manual test: tap a tile → viewer opens at correct image, swipe works, dots update.
- Manual test: open viewer at last image, swipe left does nothing.
- Unit tests (PLAN_12): `ImageCarouselIndicators` renders correct number of dots, active dot wider.
- Playwright (PLAN_12): viewer opens from grid tap, close button closes surface.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.
- `2026-05-21` Codex: Implemented fullscreen viewer, indicators, and image surface registration. `npm run typecheck` passed.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
