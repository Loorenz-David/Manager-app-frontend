import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

import { useEntityImagesContext } from '../providers/EntityImagesProvider';
import { ImageAddPictureButton } from './ImageAddPictureButton';
import { ImageSortableGrid } from './ImageSortableGrid';

const DEFAULT_MAX_VISIBLE_IMAGES = 6;

type ImagePreviewGridProps = {
  maxImages?: number;
  testId?: string;
};

export function ImagePreviewGrid({
  maxImages = DEFAULT_MAX_VISIBLE_IMAGES,
  testId = 'image-preview-grid',
}: ImagePreviewGridProps): React.JSX.Element {
  const { deleteImage, images, isPending, openViewer, reorderImages } = useEntityImagesContext();
  const [isEditMode, setIsEditMode] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleImages = images.slice(0, maxImages);
  const showAddPictureButton = !isEditMode && visibleImages.length < maxImages;

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsEditMode(false);
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isEditMode]);

  if (isPending) {
    return (
      <div
        className="grid grid-cols-3 gap-2"
        data-testid={`${testId}-skeleton`}
        aria-label="Loading images"
      >
        {Array.from({ length: maxImages }).map((_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-xl bg-muted"
            data-testid={`image-preview-skeleton-tile-${index}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-2" data-testid={`${testId}-container`}>
      <div className="grid grid-cols-3 gap-2" data-testid={testId}>
        <ImageSortableGrid
          images={visibleImages}
          isEditMode={isEditMode}
          onDelete={deleteImage}
          onLongPress={() => setIsEditMode(true)}
          onReorder={reorderImages}
          onTap={(imageClientId) => {
            if (isEditMode) {
              return;
            }

            openViewer(imageClientId);
          }}
        />
        {showAddPictureButton ? <ImageAddPictureButton /> : null}
      </div>

      {isEditMode ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white"
            data-testid={`${testId}-done-button`}
            aria-label="Done editing images"
            onClick={() => setIsEditMode(false)}
          >
            <Check className="size-4" aria-hidden="true" />
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
