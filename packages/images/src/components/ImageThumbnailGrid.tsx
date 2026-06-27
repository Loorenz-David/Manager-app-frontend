import { ImageAnnotationSvgLayer } from './ImageAnnotationSvgLayer';
import type { ImageAnnotationViewModel } from '../types';

export type ImageThumbnailGridItem = {
  clientId: string;
  imageUrl: string;
  widthPx: number | null;
  heightPx: number | null;
  annotations: ImageAnnotationViewModel[];
};

type ImageThumbnailGridProps = {
  images: ImageThumbnailGridItem[];
  onOpen: (clientId: string) => void;
  testId?: string;
  getTileTestId?: (image: ImageThumbnailGridItem) => string | undefined;
  getAnnotationTestId?: (image: ImageThumbnailGridItem) => string | undefined;
};

export function ImageThumbnailGrid({
  images,
  onOpen,
  testId = 'image-thumbnail-grid',
  getTileTestId,
  getAnnotationTestId,
}: ImageThumbnailGridProps): React.JSX.Element | null {
  if (images.length === 0) {
    return null;
  }

  const visibleImages = images.slice(0, 3);
  const overflowCount = Math.max(images.length - 3, 0);

  return (
    <div className="grid grid-cols-3 gap-2" data-testid={testId}>
      {visibleImages.map((image, index) => {
        const isOverflowSlot = index === 2 && overflowCount > 0;
        const showAnnotations = index < 2 && image.annotations.length > 0;

        return (
          <button
            key={image.clientId}
            className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            data-testid={getTileTestId?.(image)}
            type="button"
            onClick={() => onOpen(image.clientId)}
          >
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="lazy"
              src={image.imageUrl}
            />

            {showAnnotations ? (
              <ImageAnnotationSvgLayer
                annotations={image.annotations}
                coverMode
                heightPx={image.heightPx}
                testId={getAnnotationTestId?.(image)}
                widthPx={image.widthPx}
              />
            ) : null}

            {isOverflowSlot ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-lg font-semibold text-white">
                  +{overflowCount}
                </span>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
