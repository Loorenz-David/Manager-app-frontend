export {
  IMAGE_CAMERA_SURFACE_ID,
  IMAGE_VIEWER_SURFACE_ID,
  IMAGE_METADATA_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID,
  IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID,
  IMAGE_ANNOTATION_ACTIONS_SURFACE_ID,
  imageSurfaces,
  preloadImageCameraSurface,
  preloadImageEditorSurface,
  preloadImageViewerSurface,
} from "./surfaces";
export type {
  ImageAnnotationToolPickerSurfaceProps,
  ImageEditorDiscardChangesSurfaceProps,
  ImageAnnotationActionsSurfaceProps,
} from "./surfaces";

export {
  IMAGE_STORAGE_PROVIDER,
  IMAGE_SOURCE_TYPE,
  IMAGE_SOURCE_REFERENCE,
  IMAGE_EVENT_TYPE,
  IMAGE_EVENT_STATE,
  IMAGE_EVENT_LAST_ERROR,
  IMAGE_ANNOTATION_TYPE,
  IMAGE_LINK_ENTITY_TYPE,
  ImageAnnotationSchema,
  toImageAnnotationViewModel,
  toImageViewModel,
  buildImageAnnotationPayload,
  toImageAnnotationViewModels,
} from "./types";
export type {
  ImageAnnotationType,
  ImageLinkEntityType,
  ImageUploadState,
  ImageViewModel,
  ImageAnnotationViewModel,
  AnnotatedCanvasItem,
  ImageAnnotationTool,
  CreateImageFromUrlInput,
  CreateImageFromUrlBatch,
} from "./types";

export {
  EntityImagesProvider,
  useEntityImagesContext,
} from "./providers/EntityImagesProvider";
export type { EntityImagesController } from "./controllers/use-entity-images.controller";

export { ImagePreviewGrid } from "./components/ImagePreviewGrid";
export {
  ImageThumbnailGrid,
} from "./components/ImageThumbnailGrid";
export { ImageAddPictureButton } from "./components/ImageAddPictureButton";
export { ImageSortableGrid } from "./components/ImageSortableGrid";
export { ImageAnnotationSvgLayer } from "./components/ImageAnnotationSvgLayer";
export { ImageUploadOverlay } from "./components/ImageUploadOverlay";

export type {
  ImageThumbnailGridItem,
} from "./components/ImageThumbnailGrid";

export { useEntityImagesQuery } from "./api/use-entity-images";
export { imageKeys } from "./api/image-keys";
export { useImageQuery } from "./api/use-image";
export { useCreateImagesFromUrl } from "./actions/use-create-images-from-url";

export { useDeleteImage } from "./actions/use-delete-image";

export {
  preloadImageCameraSurface as preloadImageCamera,
  preloadImageEditorSurface as preloadImageEditor,
  preloadImageViewerSurface as preloadImageViewer,
} from "./preload";
