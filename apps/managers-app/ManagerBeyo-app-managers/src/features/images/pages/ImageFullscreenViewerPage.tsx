import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Ellipsis, Pencil, X } from 'lucide-react';

import { useSurface } from '@/hooks/use-surface';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider'; // kept for auto-close effect only
import { useImageQuery } from '../api/use-image';
import {
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_METADATA_SURFACE_ID,
  type ImageMetadataSurfaceProps,
  type ImageViewerSurfaceProps,
} from '../controllers/use-entity-images.controller';
import { ImageCarouselIndicators } from '../components/ImageCarouselIndicators';
import { ImageAnnotationSvgLayer } from '../components/ImageAnnotationSvgLayer';
import { ZoomableImage } from '../components/ZoomableImage';
import {
  toImageAnnotationViewModel,
  toImageAnnotationViewModels,
  type ImageViewModel,
} from '../types';

function clampIndex(index: number, imageCount: number): number {
  if (imageCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), imageCount - 1);
}

export function ImageFullscreenViewerPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const {
    images: initialImages = [],
    initialImageClientId,
    entityType,
    entityClientId,
    mode = 'preview-only',
    onDelete,
    enableOnDemandImageLoad = false,
  } = useSurfaceProps<ImageViewerSurfaceProps>();
  const safeInitialImages = useMemo(() => initialImages.filter((image) => !image.isDeleted), [initialImages]);
  const fallbackInitialIndex = Math.max(
    safeInitialImages.findIndex((image) => image.clientId === initialImageClientId),
    0,
  );
  const [images, setImages] = useState<ImageViewModel[]>(safeInitialImages);
  const [activeIndex, setActiveIndex] = useState(fallbackInitialIndex);
  // Always-current read of activeIndex without triggering effect deps
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const isAnySlideZoomedRef = useRef(false);
  const [hiddenAnnotationIds, setHiddenAnnotationIds] = useState<Set<string>>(new Set());

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    startIndex: fallbackInitialIndex,
    watchDrag: () => !isAnySlideZoomedRef.current,
  });

  useEffect(() => {
    header?.setTitle('');
    header?.setActions(null);
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setImages(safeInitialImages);
  }, [safeInitialImages]);

  // Embla → state: update activeIndex when the user swipes.
  // This is the ONLY direction for normal scrolling — we never feed activeIndex
  // back into Embla after a swipe (that caused the pop/flicker).
  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const syncSelectedIndex = () => {
      setActiveIndex(emblaApi.selectedScrollSnap());
    };

    syncSelectedIndex();
    emblaApi.on('select', syncSelectedIndex);

    return () => {
      emblaApi.off('select', syncSelectedIndex);
    };
  }, [emblaApi]);

  // Handle image deletion: tell Embla about the new slide count and
  // jump to the nearest valid index. Does NOT fire on user swipes.
  useEffect(() => {
    if (!emblaApi || images.length === 0) {
      return;
    }

    emblaApi.reInit();

    const clampedIndex = clampIndex(activeIndexRef.current, images.length);
    if (clampedIndex !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(clampedIndex, true);
    }
    setActiveIndex(clampedIndex);
  // images.length change = deletion. Deliberately excludes activeIndex
  // to avoid re-running on every swipe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, images.length]);

  useEffect(() => {
    if (images.length > 0) {
      return;
    }

    useSurfaceStore.getState().closeTop();
  }, [images.length]);

  const currentImage = images[activeIndex];
  const currentImageClientId = currentImage?.clientId;
  const shouldLoadCurrentImage = enableOnDemandImageLoad && currentImage?.isFullyLoaded === false;
  const currentImageQueryId = shouldLoadCurrentImage ? currentImageClientId : currentImage?.clientId;
  const { data: freshImage } = useImageQuery(currentImageQueryId);

  useEffect(() => {
    if (!freshImage || !currentImageClientId) {
      return;
    }

    const nextAnnotation = freshImage.image_annotation
      ? toImageAnnotationViewModel(freshImage.image_annotation)
      : null;
    const nextAnnotations = toImageAnnotationViewModels(
      freshImage.image_annotation,
      freshImage.image_annotations,
    );
    const nextAnnotationSignature = JSON.stringify({
      annotation: nextAnnotation,
      annotations: nextAnnotations,
    });

    setImages((currentImages) => {
      let changed = false;

      const nextImages = currentImages.map((image) => {
        if (image.clientId !== currentImageClientId) {
          return image;
        }

        const currentAnnotationSignature = JSON.stringify({
          annotation: image.annotation,
          annotations: image.annotations,
        });

        if (currentAnnotationSignature === nextAnnotationSignature) {
          return image;
        }

        changed = true;
        return {
          ...image,
          isFullyLoaded: true,
          annotation: nextAnnotation,
          annotations: nextAnnotations,
        };
      });

      return changed ? nextImages : currentImages;
    });
  }, [currentImageClientId, freshImage]);

  const handleClose = useCallback(() => {
    header?.requestClose();
  }, [header]);

  const handleToggleAnnotation = useCallback((imageClientId: string) => {
    setHiddenAnnotationIds((previous) => {
      const next = new Set(previous);

      if (next.has(imageClientId)) {
        next.delete(imageClientId);
      } else {
        next.add(imageClientId);
      }

      return next;
    });
  }, []);

  const handleDelete = useCallback(
    (imageClientId: string) => {
      setImages((currentImages) => currentImages.filter((image) => image.clientId !== imageClientId));
      onDelete?.(imageClientId);
    },
    [onDelete],
  );

  const handleMetadataPress = useCallback(() => {
    if (!currentImage || !entityType || !entityClientId) {
      return;
    }

    surface.open(IMAGE_METADATA_SURFACE_ID, {
      image: currentImage,
      entityType,
      entityClientId,
      mode,
      onDelete: mode === 'preview-edit' ? handleDelete : undefined,
      annotationsVisible: !hiddenAnnotationIds.has(currentImage.clientId),
      onToggleAnnotations: () => handleToggleAnnotation(currentImage.clientId),
    } satisfies ImageMetadataSurfaceProps);
  }, [
    currentImage,
    entityClientId,
    entityType,
    handleDelete,
    handleToggleAnnotation,
    hiddenAnnotationIds,
    mode,
    surface,
  ]);

  const handleEditPress = useCallback(() => {
    if (!currentImage || !entityType || !entityClientId) {
      return;
    }

    surface.open(IMAGE_EDITOR_SURFACE_ID, {
      image: currentImage,
      entityType,
      entityClientId,
    });
  }, [currentImage, entityClientId, entityType, surface]);

  return (
    <div
      className="relative flex h-full min-h-full flex-col bg-black text-white"
      data-testid="image-fullscreen-viewer"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end px-4 pt-4">
        <button
          aria-label="Image options"
          className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/55"
          data-testid="viewer-metadata-button"
          type="button"
          onClick={handleMetadataPress}
        >
          <Ellipsis className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden" data-testid="viewer-carousel" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((image) => {
            const displayUrl = image.localObjectUrl ?? image.imageUrl;

            return (
              <div
                key={image.clientId}
                className="flex min-w-0 flex-[0_0_100%] items-center justify-center"
                data-testid={`viewer-slide-${image.clientId}`}
              >
                <ZoomableImage
                  annotationOverlay={
                    hiddenAnnotationIds.has(image.clientId) ? null : (
                      <ImageAnnotationSvgLayer
                        annotations={image.annotations}
                        heightPx={image.heightPx}
                        markerId={`img-ann-arrow-${image.clientId}`}
                        testId={`viewer-annotation-overlay-${image.clientId}`}
                        widthPx={image.widthPx}
                      />
                    )
                  }
                  src={displayUrl}
                  onZoomChange={(isZoomed) => {
                    isAnySlideZoomedRef.current = isZoomed;
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[calc(var(--safe-bottom)+1rem)] pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <ImageCarouselIndicators count={images.length} activeIndex={activeIndex} />
          </div>

          <div className="flex items-center justify-between">
            <div className="min-w-0">
              {mode === 'preview-edit' ? (
                <button
                  aria-label="Edit image"
                  className="pointer-events-auto inline-flex size-12 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-900 backdrop-blur-sm transition-colors duration-150 hover:bg-zinc-200/95"
                  data-testid="viewer-edit-button"
                  type="button"
                  onClick={handleEditPress}
                >
                  <Pencil className="size-5" />
                </button>
              ) : (
                <div className="size-12" aria-hidden="true" />
              )}
            </div>

            <button
              aria-label="Close viewer"
              className="pointer-events-auto inline-flex size-12 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-900 backdrop-blur-sm transition-colors duration-150 hover:bg-zinc-200/95"
              data-testid="viewer-close-button"
              type="button"
              onClick={handleClose}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
