import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { confirmImageUpload } from "../api/confirm-image-upload";
import { useEntityImagesQuery } from "../api/use-entity-images";
import { imageKeys } from "../api/image-keys";
import {
  runImagePreUploadPipeline,
  runImageUploadPipeline,
  type ImagePreUploadResult,
} from "../lib/image-upload-pipeline";
import {
  buildEntityKey,
  EMPTY_OPTIMISTIC_IMAGES,
  useImagesStore,
} from "../store/images.store";
import { useDeleteImage } from "../actions/use-delete-image";
import { useReorderImages } from "../actions/use-reorder-images";
import { useUnlinkImage } from "../actions/use-unlink-image";
import type {
  Image,
  ImageAnnotationItemData,
  ImageLinkEntityType,
  ImageUploadState,
  ImageViewModel,
} from "../types";
import {
  toImageAnnotationViewModel,
  toImageAnnotationViewModels,
  toImageViewModel,
} from "../types";
import { useSurface } from "@/hooks/use-surface";
import { generateClientId } from "@/lib/client-id";
import {
  IMAGE_CAMERA_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_METADATA_SURFACE_ID,
  IMAGE_VIEWER_SURFACE_ID,
} from "../surfaces";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

type DeleteImageOptions = {
  hardDelete?: boolean;
};

export {
  IMAGE_CAMERA_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_METADATA_SURFACE_ID,
  IMAGE_VIEWER_SURFACE_ID,
};

export type ImageViewerMode = "preview-only" | "preview-edit";
export type ImageCaptureFlow = "camera-to-viewer" | "camera-to-editor";
export type ImageDeleteMode = "unlink" | "hard-delete";

export type UseEntityImagesControllerInput = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  viewerMode?: ImageViewerMode;
  captureFlow?: ImageCaptureFlow;
  deleteMode?: ImageDeleteMode;
  onImagesChanged?: () => void;
};

export type ImageCameraSurfaceProps = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  captureFlow: ImageCaptureFlow;
  latestImageUrl?: string;
  onCapture: (rawBlob: Blob) => ImageViewModel;
  onEditCapturedImage?: (capturedImage: ImageViewModel) => void;
  onViewLatest?: () => void;
};

export type ImageViewerSurfaceProps = {
  images: ImageViewModel[];
  initialImageClientId: string;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  mode: ImageViewerMode;
  onDelete?: (imageClientId: string) => void;
  enableOnDemandImageLoad?: boolean;
};

export type ImageMetadataSurfaceProps = {
  image: ImageViewModel;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  mode: ImageViewerMode;
  onDelete?: (imageClientId: string) => void;
  annotationsVisible?: boolean;
  onToggleAnnotations?: () => void;
};

export type ImageEditorSurfaceProps = {
  image: ImageViewModel;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  isDirectCaptureSession?: boolean;
  onSaveComplete?: () => void;
  onCancelCapture?: (imageClientId: string) => Promise<void> | void;
  onDeferredConfirm?: (annotations: ImageAnnotationItemData[]) => void;
};

function toConfirmedOptimisticViewModel(
  image: Image,
  entityType: ImageLinkEntityType,
  entityClientId: string,
  displayOrder: number,
): ImageViewModel {
  const annotation = image.image_annotation
    ? toImageAnnotationViewModel(image.image_annotation)
    : null;

  return {
    clientId: image.client_id,
    linkClientId: null,
    entityType,
    entityClientId,
    imageUrl: image.image_url,
    localObjectUrl: null,
    displayOrder,
    widthPx: image.width_px ?? null,
    heightPx: image.height_px ?? null,
    fileSizeBytes: image.file_size_bytes ?? null,
    createdAt: image.created_at,
    uploadState: "completed",
    isOptimistic: true,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation,
    annotations: toImageAnnotationViewModels(
      image.image_annotation,
      image.image_annotations,
    ),
  };
}

function isUploadingState(state: ImageUploadState): boolean {
  return (
    state === "captured" ||
    state === "compressing" ||
    state === "requesting_upload_url" ||
    state === "uploading" ||
    state === "confirming"
  );
}

function revokeLocalObjectUrl(image: ImageViewModel | undefined): void {
  if (image?.localObjectUrl) {
    URL.revokeObjectURL(image.localObjectUrl);
  }
}

export function useEntityImagesController(
  input: UseEntityImagesControllerInput,
) {
  const {
    entityType,
    entityClientId,
    viewerMode = "preview-edit",
    captureFlow = "camera-to-viewer",
    deleteMode = "unlink",
    onImagesChanged,
  } = input;
  const entityKey = buildEntityKey(entityType, entityClientId);
  const queryClient = useQueryClient();
  const surface = useSurface();
  const uploadRetrySourcesRef = useRef(new Map<string, Blob>());
  const pendingDeleteModesRef = useRef(new Map<string, DeleteImageOptions>());
  const preUploadResultsRef = useRef(new Map<string, ImagePreUploadResult>());
  const capturedAnnotationsRef = useRef(
    new Map<string, ImageAnnotationItemData[]>(),
  );

  const {
    data: serverImages = [],
    isPending,
    isError,
  } = useEntityImagesQuery({
    entity_type: entityType,
    entity_client_id: entityClientId,
  });

  const optimisticImages = useImagesStore(
    (state) => state.optimisticImages[entityKey] ?? EMPTY_OPTIMISTIC_IMAGES,
  );
  const insertOptimisticImage = useImagesStore(
    (state) => state.insertOptimisticImage,
  );
  const patchOptimisticImage = useImagesStore(
    (state) => state.patchOptimisticImage,
  );
  const removeOptimisticImage = useImagesStore(
    (state) => state.removeOptimisticImage,
  );
  const clearOptimisticImages = useImagesStore(
    (state) => state.clearOptimisticImages,
  );

  const unlinkAction = useUnlinkImage();
  const deleteAction = useDeleteImage();
  const reorderAction = useReorderImages();

  const clearRetrySource = useCallback((imageClientId: string) => {
    uploadRetrySourcesRef.current.delete(imageClientId);
    pendingDeleteModesRef.current.delete(imageClientId);
    preUploadResultsRef.current.delete(imageClientId);
    capturedAnnotationsRef.current.delete(imageClientId);
  }, []);

  const confirmedImages = useMemo(
    () =>
      [...serverImages].sort(
        (left, right) => left.display_order - right.display_order,
      ),
    [serverImages],
  );

  const images = useMemo<ImageViewModel[]>(() => {
    const confirmed = confirmedImages.map(toImageViewModel);
    const confirmedIds = new Set(confirmed.map((image) => image.clientId));
    const pendingOptimistic = optimisticImages
      .filter((image) => !image.isDeleted && !confirmedIds.has(image.clientId))
      .sort((left, right) => left.displayOrder - right.displayOrder);

    return [...confirmed, ...pendingOptimistic];
  }, [confirmedImages, optimisticImages]);

  useEffect(() => {
    return () => {
      const currentImages =
        useImagesStore.getState().optimisticImages[entityKey] ?? [];
      currentImages.forEach((image) => {
        revokeLocalObjectUrl(image);
        clearRetrySource(image.clientId);
      });
      clearOptimisticImages(entityKey);
    };
  }, [clearOptimisticImages, clearRetrySource, entityKey]);

  useEffect(() => {
    const confirmedIds = new Set(
      serverImages.map((image) => image.image.client_id),
    );

    optimisticImages.forEach((image) => {
      if (confirmedIds.has(image.clientId) && image.localObjectUrl === null) {
        clearRetrySource(image.clientId);
        removeOptimisticImage(entityKey, image.clientId);
      }
    });
  }, [
    clearRetrySource,
    entityKey,
    optimisticImages,
    removeOptimisticImage,
    serverImages,
  ]);

  const invalidateEntityImages = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: imageKeys.list({
        entity_type: entityType,
        entity_client_id: entityClientId,
      }),
    });
    onImagesChanged?.();
  }, [entityClientId, entityType, onImagesChanged, queryClient]);

  const runDeferredConfirm = useCallback(
    (
      imageClientId: string,
      annotations: ImageAnnotationItemData[],
      preUploadResult: ImagePreUploadResult,
      fallbackDisplayOrder: number,
    ) => {
      patchOptimisticImage(entityKey, imageClientId, {
        pendingUploadClientId: preUploadResult.pendingUploadClientId,
        widthPx: preUploadResult.widthPx,
        heightPx: preUploadResult.heightPx,
        uploadState: "confirming",
        uploadError: null,
      });

      void confirmImageUpload({
        pending_upload_client_id: preUploadResult.pendingUploadClientId,
        entity_type: entityType,
        entity_client_id: entityClientId,
        image_client_id: imageClientId,
        width_px: preUploadResult.widthPx,
        height_px: preUploadResult.heightPx,
        image_annotations:
          annotations.length > 0
            ? (annotations as unknown as Record<string, unknown>[])
            : undefined,
      })
        .then(async (confirmedImage) => {
          const currentImage = useImagesStore
            .getState()
            .optimisticImages[
              entityKey
            ]?.find((image) => image.clientId === imageClientId);

          if (currentImage?.uploadState === "delete_requested") {
            const deleteOptions =
              pendingDeleteModesRef.current.get(imageClientId);
            const shouldHardDelete = deleteOptions?.hardDelete === true;
            revokeLocalObjectUrl(currentImage);
            clearRetrySource(imageClientId);
            removeOptimisticImage(entityKey, imageClientId);

            if (shouldHardDelete) {
              void deleteAction
                .deleteImageWithOptionsAsync({
                  imageClientId: confirmedImage.client_id,
                  hardDelete: true,
                })
                .then(() => onImagesChanged?.());
              return;
            }

            void unlinkAction
              .unlinkImageAsync({
                image_client_id: confirmedImage.client_id,
                entity_type: entityType,
                entity_client_id: entityClientId,
              })
              .then(() => onImagesChanged?.());
            return;
          }

          revokeLocalObjectUrl(currentImage);
          clearRetrySource(imageClientId);
          patchOptimisticImage(
            entityKey,
            imageClientId,
            toConfirmedOptimisticViewModel(
              confirmedImage,
              entityType,
              entityClientId,
              currentImage?.displayOrder ?? fallbackDisplayOrder,
            ),
          );

          await invalidateEntityImages();
        })
        .catch((error: unknown) => {
          const currentImage = useImagesStore
            .getState()
            .optimisticImages[
              entityKey
            ]?.find((image) => image.clientId === imageClientId);

          if (currentImage?.uploadState === "delete_requested") {
            revokeLocalObjectUrl(currentImage);
            clearRetrySource(imageClientId);
            removeOptimisticImage(entityKey, imageClientId);
            return;
          }

          patchOptimisticImage(entityKey, imageClientId, {
            uploadState: "failed",
            uploadError:
              error instanceof Error ? error.message : "Confirm failed.",
          });
        });
    },
    [
      clearRetrySource,
      deleteAction,
      entityClientId,
      entityKey,
      entityType,
      invalidateEntityImages,
      onImagesChanged,
      patchOptimisticImage,
      removeOptimisticImage,
      unlinkAction,
    ],
  );

  const startUpload = useCallback(
    ({
      imageClientId,
      rawBlob,
      fallbackDisplayOrder,
    }: {
      imageClientId: string;
      rawBlob: Blob;
      fallbackDisplayOrder: number;
    }) => {
      void runImageUploadPipeline({
        rawBlob,
        entityType,
        entityClientId,
        onProgress: (progressState) => {
          patchOptimisticImage(entityKey, imageClientId, {
            uploadState: progressState,
          });
        },
      })
        .then(async (confirmedImage) => {
          const currentImage = useImagesStore
            .getState()
            .optimisticImages[
              entityKey
            ]?.find((image) => image.clientId === imageClientId);

          if (currentImage?.uploadState === "delete_requested") {
            const deleteOptions =
              pendingDeleteModesRef.current.get(imageClientId);
            const shouldHardDelete = deleteOptions?.hardDelete === true;
            revokeLocalObjectUrl(currentImage);
            clearRetrySource(imageClientId);
            removeOptimisticImage(entityKey, imageClientId);

            if (shouldHardDelete) {
              void deleteAction
                .deleteImageWithOptionsAsync({
                  imageClientId: confirmedImage.client_id,
                  hardDelete: true,
                })
                .then(() => onImagesChanged?.());
              return;
            }

            void unlinkAction
              .unlinkImageAsync({
                image_client_id: confirmedImage.client_id,
                entity_type: entityType,
                entity_client_id: entityClientId,
              })
              .then(() => onImagesChanged?.());
            return;
          }

          revokeLocalObjectUrl(currentImage);
          clearRetrySource(imageClientId);
          patchOptimisticImage(
            entityKey,
            imageClientId,
            toConfirmedOptimisticViewModel(
              confirmedImage,
              entityType,
              entityClientId,
              currentImage?.displayOrder ?? fallbackDisplayOrder,
            ),
          );

          await invalidateEntityImages();
        })
        .catch((error: unknown) => {
          const currentImage = useImagesStore
            .getState()
            .optimisticImages[
              entityKey
            ]?.find((image) => image.clientId === imageClientId);

          if (currentImage?.uploadState === "delete_requested") {
            revokeLocalObjectUrl(currentImage);
            clearRetrySource(imageClientId);
            removeOptimisticImage(entityKey, imageClientId);
            return;
          }

          patchOptimisticImage(entityKey, imageClientId, {
            uploadState: "failed",
            uploadError:
              error instanceof Error ? error.message : "Upload failed.",
          });
        });
    },
    [
      clearRetrySource,
      entityClientId,
      entityKey,
      entityType,
      deleteAction,
      invalidateEntityImages,
      onImagesChanged,
      patchOptimisticImage,
      removeOptimisticImage,
      unlinkAction,
    ],
  );

  const startUploadDeferred = useCallback(
    ({
      imageClientId,
      rawBlob,
      fallbackDisplayOrder,
    }: {
      imageClientId: string;
      rawBlob: Blob;
      fallbackDisplayOrder: number;
    }) => {
      void runImagePreUploadPipeline({
        rawBlob,
        entityType,
        entityClientId,
        onProgress: (progressState) => {
          patchOptimisticImage(entityKey, imageClientId, {
            uploadState: progressState,
          });
        },
      })
        .then((result) => {
          const currentImage = useImagesStore
            .getState()
            .optimisticImages[
              entityKey
            ]?.find((image) => image.clientId === imageClientId);

          if (currentImage?.uploadState === "delete_requested") {
            revokeLocalObjectUrl(currentImage);
            clearRetrySource(imageClientId);
            removeOptimisticImage(entityKey, imageClientId);
            return;
          }

          preUploadResultsRef.current.set(imageClientId, result);
          patchOptimisticImage(entityKey, imageClientId, {
            pendingUploadClientId: result.pendingUploadClientId,
            widthPx: result.widthPx,
            heightPx: result.heightPx,
          });

          const pendingAnnotations =
            capturedAnnotationsRef.current.get(imageClientId);

          if (pendingAnnotations !== undefined) {
            capturedAnnotationsRef.current.delete(imageClientId);
            runDeferredConfirm(
              imageClientId,
              pendingAnnotations,
              result,
              fallbackDisplayOrder,
            );
            return;
          }

          patchOptimisticImage(entityKey, imageClientId, {
            uploadState: "pre_confirm",
          });
        })
        .catch((error: unknown) => {
          const currentImage = useImagesStore
            .getState()
            .optimisticImages[
              entityKey
            ]?.find((image) => image.clientId === imageClientId);

          if (currentImage?.uploadState === "delete_requested") {
            revokeLocalObjectUrl(currentImage);
            clearRetrySource(imageClientId);
            removeOptimisticImage(entityKey, imageClientId);
            return;
          }

          patchOptimisticImage(entityKey, imageClientId, {
            uploadState: "failed",
            uploadError:
              error instanceof Error ? error.message : "Upload failed.",
          });
        });
    },
    [
      clearRetrySource,
      entityClientId,
      entityKey,
      entityType,
      patchOptimisticImage,
      removeOptimisticImage,
      runDeferredConfirm,
    ],
  );

  const buildDeferredConfirmCallback = useCallback(
    (imageClientId: string, fallbackDisplayOrder: number) =>
      (annotations: ImageAnnotationItemData[]) => {
        capturedAnnotationsRef.current.set(imageClientId, annotations);

        const preUploadResult = preUploadResultsRef.current.get(imageClientId);
        if (!preUploadResult) {
          return;
        }

        capturedAnnotationsRef.current.delete(imageClientId);
        runDeferredConfirm(
          imageClientId,
          annotations,
          preUploadResult,
          fallbackDisplayOrder,
        );
      },
    [runDeferredConfirm],
  );

  const uploadImage = useCallback(
    (rawBlob: Blob) => {
      const optimisticClientId = generateClientId("Image");
      const localObjectUrl = URL.createObjectURL(rawBlob);
      const maxDisplayOrder = images.reduce(
        (maxValue, image) => Math.max(maxValue, image.displayOrder),
        -1,
      );
      const optimisticImage: ImageViewModel = {
        clientId: optimisticClientId,
        linkClientId: null,
        entityType,
        entityClientId,
        imageUrl: localObjectUrl,
        localObjectUrl,
        displayOrder: maxDisplayOrder + 1,
        widthPx: null,
        heightPx: null,
        fileSizeBytes: rawBlob.size,
        createdAt: new Date().toISOString(),
        uploadState: "captured",
        isOptimistic: true,
        isDeleted: false,
        pendingUploadClientId: null,
        uploadError: null,
        annotation: null,
        annotations: [],
      };

      insertOptimisticImage(entityKey, optimisticImage);
      uploadRetrySourcesRef.current.set(optimisticClientId, rawBlob);
      if (captureFlow === "camera-to-editor") {
        startUploadDeferred({
          imageClientId: optimisticClientId,
          rawBlob,
          fallbackDisplayOrder: maxDisplayOrder + 1,
        });
      } else {
        startUpload({
          imageClientId: optimisticClientId,
          rawBlob,
          fallbackDisplayOrder: maxDisplayOrder + 1,
        });
      }

      return optimisticImage;
    },
    [
      captureFlow,
      images,
      insertOptimisticImage,
      startUpload,
      startUploadDeferred,
      entityClientId,
      entityKey,
      entityType,
    ],
  );

  const retryImageUpload = useCallback(
    (imageClientId: string) => {
      const rawBlob = uploadRetrySourcesRef.current.get(imageClientId);
      const currentImage = useImagesStore
        .getState()
        .optimisticImages[
          entityKey
        ]?.find((image) => image.clientId === imageClientId);

      if (
        !rawBlob ||
        !currentImage ||
        isUploadingState(currentImage.uploadState)
      ) {
        return;
      }

      if (currentImage.localObjectUrl === null) {
        const nextLocalObjectUrl = URL.createObjectURL(rawBlob);
        patchOptimisticImage(entityKey, imageClientId, {
          imageUrl: nextLocalObjectUrl,
          localObjectUrl: nextLocalObjectUrl,
        });
      }

      patchOptimisticImage(entityKey, imageClientId, {
        isDeleted: false,
        uploadError: null,
        uploadState: "captured",
      });
      if (captureFlow === "camera-to-editor") {
        startUploadDeferred({
          imageClientId,
          rawBlob,
          fallbackDisplayOrder: currentImage.displayOrder,
        });
      } else {
        startUpload({
          imageClientId,
          rawBlob,
          fallbackDisplayOrder: currentImage.displayOrder,
        });
      }
    },
    [captureFlow, entityKey, patchOptimisticImage, startUpload, startUploadDeferred],
  );

  const deleteImage = useCallback(
    (imageClientId: string, options?: DeleteImageOptions) => {
      const resolvedDeleteOptions: DeleteImageOptions = {
        hardDelete:
          options?.hardDelete ?? (deleteMode === "hard-delete" ? true : undefined),
      };
      const optimisticImage = useImagesStore
        .getState()
        .optimisticImages[
          entityKey
        ]?.find((image) => image.clientId === imageClientId);

      if (optimisticImage) {
        if (isUploadingState(optimisticImage.uploadState)) {
          pendingDeleteModesRef.current.set(imageClientId, resolvedDeleteOptions);
          patchOptimisticImage(entityKey, imageClientId, {
            isDeleted: true,
            uploadState: "delete_requested",
          });
          return;
        }

        revokeLocalObjectUrl(optimisticImage);
        clearRetrySource(imageClientId);

        removeOptimisticImage(entityKey, imageClientId);

        if (optimisticImage.uploadState !== "completed") {
          return;
        }
      }

      if (resolvedDeleteOptions.hardDelete) {
        void deleteAction
          .deleteImageWithOptionsAsync({
            imageClientId,
            hardDelete: true,
          })
          .then(() => onImagesChanged?.());
        return;
      }

      void unlinkAction
        .unlinkImageAsync({
          image_client_id: imageClientId,
          entity_type: entityType,
          entity_client_id: entityClientId,
        })
        .then(() => onImagesChanged?.());
    },
    [
      clearRetrySource,
      deleteMode,
      entityClientId,
      deleteAction,
      entityKey,
      entityType,
      onImagesChanged,
      patchOptimisticImage,
      removeOptimisticImage,
      unlinkAction,
    ],
  );

  const reorderImages = useCallback(
    (orderedClientIds: string[]) => {
      reorderAction.reorderImages({
        entity_type: entityType,
        entity_client_id: entityClientId,
        ordered_image_client_ids: orderedClientIds,
      });
    },
    [entityClientId, entityType, reorderAction],
  );

  const openViewer = useCallback(
    (initialImageClientId: string) => {
      surface.open(IMAGE_VIEWER_SURFACE_ID, {
        images,
        initialImageClientId,
        entityType,
        entityClientId,
        mode: viewerMode,
        onDelete: viewerMode === "preview-edit" ? deleteImage : undefined,
      } satisfies ImageViewerSurfaceProps);
    },
    [deleteImage, entityClientId, entityType, images, surface, viewerMode],
  );

  const imagesRef = useRef(images);
  imagesRef.current = images;

  const openViewerRef = useRef(openViewer);
  openViewerRef.current = openViewer;

  const openEditorForCapturedImage = useCallback(
    (capturedImage: ImageViewModel) => {
      surface.open(IMAGE_EDITOR_SURFACE_ID, {
        image: capturedImage,
        entityType,
        entityClientId,
        isDirectCaptureSession: true,
        onSaveComplete: () => {
          useSurfaceStore
            .getState()
            .closeMany([IMAGE_EDITOR_SURFACE_ID, IMAGE_CAMERA_SURFACE_ID]);
        },
        onCancelCapture: (imageClientId: string) => {
          deleteImage(imageClientId, { hardDelete: true });
        },
        onDeferredConfirm: buildDeferredConfirmCallback(
          capturedImage.clientId,
          capturedImage.displayOrder,
        ),
      } satisfies ImageEditorSurfaceProps);
    },
    [
      buildDeferredConfirmCallback,
      deleteImage,
      entityClientId,
      entityType,
      surface,
    ],
  );

  const openCamera = useCallback(() => {
    surface.open(IMAGE_CAMERA_SURFACE_ID, {
      entityType,
      entityClientId,
      captureFlow,
      latestImageUrl: imagesRef.current.at(-1)?.imageUrl,
      onCapture: uploadImage,
      onEditCapturedImage:
        captureFlow === "camera-to-editor"
          ? openEditorForCapturedImage
          : undefined,
      onViewLatest: () => {
        const latest = imagesRef.current.at(-1);
        if (!latest) return;
        openViewerRef.current(latest.clientId);
      },
    } satisfies ImageCameraSurfaceProps);
  }, [
    captureFlow,
    entityClientId,
    entityType,
    openEditorForCapturedImage,
    surface,
    uploadImage,
  ]);

  const openMetadataSheet = useCallback(
    (imageClientId: string) => {
      const image = images.find((entry) => entry.clientId === imageClientId);
      if (!image) {
        return;
      }

      surface.open(IMAGE_METADATA_SURFACE_ID, {
        image,
        entityType,
        entityClientId,
        mode: viewerMode,
        onDelete: viewerMode === "preview-edit" ? deleteImage : undefined,
      } satisfies ImageMetadataSurfaceProps);
    },
    [deleteImage, entityClientId, entityType, images, surface, viewerMode],
  );

  return {
    images,
    isPending,
    isError,
    uploadImage,
    retryImageUpload,
    deleteImage,
    reorderImages,
    openCamera,
    openViewer,
    openMetadataSheet,
    isUploading: optimisticImages.some((image) =>
      isUploadingState(image.uploadState),
    ),
    hasFailedUploads: optimisticImages.some(
      (image) => image.uploadState === "failed",
    ),
    isDeleting: unlinkAction.isPending || deleteAction.isPending,
    isReordering: reorderAction.isPending,
  };
}

export type ImageEntityController = ReturnType<
  typeof useEntityImagesController
>;
export type EntityImagesController = ImageEntityController;
