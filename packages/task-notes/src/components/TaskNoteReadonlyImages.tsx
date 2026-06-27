import type {
  ImageLinkEntityType,
  ImageAnnotationViewModel,
  ImageViewModel,
} from "@beyo/images";
import {
  ImageThumbnailGrid,
  toImageAnnotationViewModels,
} from "@beyo/images";

import type { TaskNoteApiEntry, TaskNoteApiImage } from "../types";

type TaskNoteReadonlyImagesProps = {
  images: TaskNoteApiImage[];
  onOpen: (imageClientId: string) => void;
  testId?: string;
};

export function TaskNoteReadonlyImages({
  images,
  onOpen,
  testId = "task-note-readonly-images",
}: TaskNoteReadonlyImagesProps): React.JSX.Element | null {
  if (images.length === 0) {
    return null;
  }

  return (
    <ImageThumbnailGrid
      images={images.map((image) => ({
        clientId: image.client_id,
        imageUrl: image.image_url,
        widthPx: image.width_px ?? null,
        heightPx: image.height_px ?? null,
        annotations: toTaskNoteImageAnnotations(image),
      }))}
      getAnnotationTestId={(image) =>
        `task-note-image-annotations-${image.clientId}`
      }
      onOpen={onOpen}
      testId={testId}
    />
  );
}

export function toTaskNoteViewerImages(
  entry: TaskNoteApiEntry,
): ImageViewModel[] {
  return entry.note_images.map((image, index) => ({
    clientId: image.client_id,
    linkClientId:
      typeof image.link_client_id === "string" ? image.link_client_id : null,
    entityType: "note" as ImageLinkEntityType,
    entityClientId: entry.note.client_id,
    imageUrl: image.image_url,
    localObjectUrl: null,
    displayOrder:
      typeof image.display_order === "number" ? image.display_order : index,
    widthPx: typeof image.width_px === "number" ? image.width_px : null,
    heightPx: typeof image.height_px === "number" ? image.height_px : null,
    fileSizeBytes:
      typeof image.file_size_bytes === "number" ? image.file_size_bytes : null,
    createdAt:
      typeof image.created_at === "string"
        ? image.created_at
        : entry.note.created_at,
    uploadState: "completed",
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation: toTaskNoteImageAnnotations(image)[0] ?? null,
    annotations: toTaskNoteImageAnnotations(image),
  }));
}

function toTaskNoteImageAnnotations(
  image: TaskNoteApiImage,
): ImageAnnotationViewModel[] {
  return toImageAnnotationViewModels(
    image.image_annotation ?? null,
    image.image_annotations ?? [],
  );
}
