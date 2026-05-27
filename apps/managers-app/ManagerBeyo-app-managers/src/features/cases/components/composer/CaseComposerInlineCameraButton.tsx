import { Camera } from "lucide-react";

import { useEntityImagesContext } from "@/features/images/providers/EntityImagesProvider";
import { preloadImageCameraSurface } from "@/features/images/surfaces";

type CaseComposerInlineCameraButtonProps = {
  testId?: string;
};

export function CaseComposerInlineCameraButton({
  testId = "case-composer-inline-camera-button",
}: CaseComposerInlineCameraButtonProps): React.JSX.Element {
  const { openCamera } = useEntityImagesContext();

  return (
    <button
      aria-label="Take picture"
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      data-testid={testId}
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
      type="button"
    >
      <Camera aria-hidden="true" className="size-5" />
    </button>
  );
}
