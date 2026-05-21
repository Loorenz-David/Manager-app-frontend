import { Camera } from 'lucide-react';

import { useEntityImagesContext } from '../providers/EntityImagesProvider';
import { preloadImageCameraSurface } from '../surfaces';

type ImageAddPictureButtonProps = {
  testId?: string;
};

export function ImageAddPictureButton({
  testId = 'image-add-picture-button',
}: ImageAddPictureButtonProps): React.JSX.Element {
  const { openCamera } = useEntityImagesContext();

  return (
    <button
      type="button"
      className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 px-2 text-muted-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      data-testid={testId}
      aria-label="Add picture"
      onClick={openCamera}
      onFocus={() => {
        void preloadImageCameraSurface();
      }}
      onPointerEnter={() => {
        void preloadImageCameraSurface();
      }}
      onTouchStart={() => {
        void preloadImageCameraSurface();
      }}
    >
      <Camera className="size-5 shrink-0" aria-hidden="true" />
      <span className="text-center text-xs font-medium leading-tight">Add picture</span>
    </button>
  );
}
