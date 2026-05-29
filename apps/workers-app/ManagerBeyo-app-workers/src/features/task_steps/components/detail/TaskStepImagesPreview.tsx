import {
  ImageAnnotationSchema,
  ImageAnnotationSvgLayer,
  toImageAnnotationViewModels,
} from "@beyo/images";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

function getImageAnnotations(image: { image_annotation?: unknown }) {
  const parsed = ImageAnnotationSchema.nullable().safeParse(
    image.image_annotation,
  );
  const parsedAnnotation = parsed.success && parsed.data ? parsed.data : null;

  return toImageAnnotationViewModels(parsedAnnotation ?? undefined, undefined);
}

export function TaskStepImagesPreview(): React.JSX.Element | null {
  const { step, handleOpenImageViewer } = useTaskStepDetailContext();

  if (!step || step.item_images.length === 0) {
    return null;
  }

  const previews = step.item_images.slice(0, 3);
  const extraCount = Math.max(0, step.item_images.length - 3);

  return (
    <div
      className="grid grid-cols-3 gap-2"
      data-testid="task-step-images-preview"
    >
      {previews.map((image, index) => {
        const isThirdSlot = index === 2;
        const showExtraOverlay = isThirdSlot && extraCount > 0;
        const annotations =
          index < 2 && "image_annotation" in image
            ? getImageAnnotations(image)
            : [];

        return (
          <button
            key={image.client_id}
            type="button"
            className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted"
            data-testid={`task-step-image-tap-${image.client_id}`}
            onClick={() => handleOpenImageViewer(image.client_id)}
          >
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="lazy"
              src={image.image_url}
            />

            {index < 2 ? (
              <ImageAnnotationSvgLayer
                annotations={annotations}
                coverMode
                heightPx={image.height_px}
                widthPx={image.width_px}
              />
            ) : null}

            {showExtraOverlay ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-lg font-semibold text-white">
                  +{extraCount}
                </span>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
