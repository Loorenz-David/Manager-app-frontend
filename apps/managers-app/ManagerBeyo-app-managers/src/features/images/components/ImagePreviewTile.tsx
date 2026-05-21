import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { useEntityImagesContext } from '../providers/EntityImagesProvider';
import type { ImageViewModel } from '../types';
import { ImageUploadOverlay } from './ImageUploadOverlay';

const LONG_PRESS_MS = 500;

type ImagePreviewTileProps = {
  image: ImageViewModel;
  isEditMode?: boolean;
  onLongPress?: (imageClientId: string) => void;
  testId?: string;
};

export function ImagePreviewTile({
  image,
  isEditMode = false,
  onLongPress,
  testId,
}: ImagePreviewTileProps): React.JSX.Element {
  const { openViewer, deleteImage } = useEntityImagesContext();
  const longPressTimerRef = useRef<number | null>(null);
  const displayUrl = image.localObjectUrl ?? image.imageUrl;
  const isConfirmed = image.uploadState === 'completed';

  function clearLongPressTimer(): void {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handlePointerDown(): void {
    if (!onLongPress) {
      return;
    }

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      onLongPress(image.clientId);
      longPressTimerRef.current = null;
    }, LONG_PRESS_MS);
  }

  useEffect(() => clearLongPressTimer, []);

  return (
    <div
      className={[
        'relative aspect-square overflow-hidden rounded-xl bg-muted',
        isEditMode ? 'ring-2 ring-destructive/30' : '',
      ].join(' ')}
      data-testid={testId ?? `image-preview-tile-${image.clientId}`}
    >
      <button
        type="button"
        className="size-full"
        data-testid={`image-preview-tile-button-${image.clientId}`}
        aria-label={isConfirmed ? 'View image' : 'Image upload in progress'}
        disabled={!isConfirmed}
        onClick={() => openViewer(image.clientId)}
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        onPointerCancel={clearLongPressTimer}
      >
        <img src={displayUrl} alt="" className="size-full object-cover" loading="lazy" />
      </button>

      <ImageUploadOverlay uploadState={image.uploadState} />

      {isEditMode ? (
        <button
          type="button"
          className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
          data-testid={`image-delete-button-${image.clientId}`}
          aria-label="Delete image"
          onClick={() => deleteImage(image.clientId)}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
