import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { useEntityImagesContext } from '../providers/EntityImagesProvider';
import type { ImageViewModel } from '../types';
import { ImageAnnotationSvgLayer } from './ImageAnnotationSvgLayer';
import { ImageUploadOverlay } from './ImageUploadOverlay';

const LONG_PRESS_MS = 500;

type ImagePreviewTileProps = {
  image: ImageViewModel;
  isEditMode?: boolean;
  onTap?: (imageClientId: string) => void;
  onDeletePress?: (imageClientId: string) => void;
  onLongPress?: (imageClientId: string) => void;
  testId?: string;
};

export function ImagePreviewTile({
  image,
  isEditMode = false,
  onTap,
  onDeletePress,
  onLongPress,
  testId,
}: ImagePreviewTileProps): React.JSX.Element {
  const { openViewer, deleteImage } = useEntityImagesContext();
  const longPressTimerRef = useRef<number | null>(null);
  const didTriggerLongPressRef = useRef(false);
  const displayUrl = image.localObjectUrl ?? image.imageUrl;
  const isConfirmed = image.uploadState === 'completed';
  const handleTap = onTap ?? openViewer;
  const handleDeletePress = onDeletePress ?? deleteImage;

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
    didTriggerLongPressRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      didTriggerLongPressRef.current = true;
      onLongPress(image.clientId);
      longPressTimerRef.current = null;
    }, LONG_PRESS_MS);
  }

  function handleClick(): void {
    if (didTriggerLongPressRef.current) {
      didTriggerLongPressRef.current = false;
      return;
    }

    handleTap(image.clientId);
  }

  useEffect(() => clearLongPressTimer, []);

  return (
    <div
      className={[
        'relative aspect-square overflow-hidden rounded-xl bg-muted',
        isEditMode ? 'animate-image-edit-shake ring-2 ring-destructive/30' : '',
      ].join(' ')}
      data-testid={testId ?? `image-preview-tile-${image.clientId}`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      <button
        type="button"
        className="size-full"
        data-testid={`image-preview-tile-button-${image.clientId}`}
        aria-label={
          isEditMode ? 'Image edit mode active' : isConfirmed ? 'View image' : 'Image upload in progress'
        }
        disabled={isEditMode || !isConfirmed}
        onClick={handleClick}
      >
        <img src={displayUrl} alt="" className="size-full object-cover" loading="lazy" draggable={false} />
      </button>

      <ImageAnnotationSvgLayer
        annotations={image.annotations}
        coverMode
        heightPx={image.heightPx}
        testId={`image-annotation-overlay-${image.clientId}`}
        widthPx={image.widthPx}
      />

      <ImageUploadOverlay uploadState={image.uploadState} />

      {isEditMode ? (
        <button
          type="button"
          className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
          data-testid={`image-delete-button-${image.clientId}`}
          aria-label="Delete image"
          onClick={(event) => {
            event.stopPropagation();
            handleDeletePress(image.clientId);
          }}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
