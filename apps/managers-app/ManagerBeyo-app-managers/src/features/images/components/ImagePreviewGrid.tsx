import { useEntityImagesContext } from '../providers/EntityImagesProvider';
import { ImageAddPictureButton } from './ImageAddPictureButton';
import { ImagePreviewTile } from './ImagePreviewTile';

const DEFAULT_MAX_VISIBLE_IMAGES = 6;

type ImagePreviewGridProps = {
  maxImages?: number;
  testId?: string;
};

export function ImagePreviewGrid({
  maxImages = DEFAULT_MAX_VISIBLE_IMAGES,
  testId = 'image-preview-grid',
}: ImagePreviewGridProps): React.JSX.Element {
  const { images, isPending } = useEntityImagesContext();
  const visibleImages = images.slice(0, maxImages);
  const showAddPictureButton = visibleImages.length < maxImages;

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
    <div className="grid grid-cols-3 gap-2" data-testid={testId}>
      {visibleImages.map((image) => (
        <ImagePreviewTile key={image.clientId} image={image} />
      ))}
      {showAddPictureButton ? <ImageAddPictureButton /> : null}
    </div>
  );
}
