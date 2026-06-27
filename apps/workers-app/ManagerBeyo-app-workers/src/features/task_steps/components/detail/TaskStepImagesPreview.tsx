import {
  ImageAnnotationSchema,
  ImageThumbnailGrid,
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

  return (
    <ImageThumbnailGrid
      getTileTestId={(image) => `task-step-image-tap-${image.clientId}`}
      images={step.item_images.map((image) => ({
        clientId: image.client_id,
        imageUrl: image.image_url,
        widthPx: image.width_px ?? null,
        heightPx: image.height_px ?? null,
        annotations:
          "image_annotation" in image ? getImageAnnotations(image) : [],
      }))}
      onOpen={handleOpenImageViewer}
      testId="task-step-images-preview"
    />
  );
}
