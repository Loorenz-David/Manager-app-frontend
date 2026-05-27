import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useEntityImagesQuery } from '../api/use-entity-images';
import { imageKeys } from '../api/image-keys';
import { runImageUploadPipeline } from '../lib/image-upload-pipeline';
import { buildEntityKey, EMPTY_OPTIMISTIC_IMAGES, useImagesStore } from '../store/images.store';
import { useDeleteImage } from '../actions/use-delete-image';
import { useReorderImages } from '../actions/use-reorder-images';
import { useUnlinkImage } from '../actions/use-unlink-image';
import type { Image, ImageLinkEntityType, ImageUploadState, ImageViewModel } from '../types';
import {
  toImageAnnotationViewModel,
  toImageAnnotationViewModels,
  toImageViewModel,
} from '../types';
import { useSurface } from '@/hooks/use-surface';
import { generateClientId } from '@/lib/client-id';
import {
  IMAGE_CAMERA_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_METADATA_SURFACE_ID,
  IMAGE_VIEWER_SURFACE_ID,
} from '../surfaces';

export {
  IMAGE_CAMERA_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_METADATA_SURFACE_ID,
  IMAGE_VIEWER_SURFACE_ID,
};

export type ImageViewerMode = 'preview-only' | 'preview-edit';

export type UseEntityImagesControllerInput = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  viewerMode?: ImageViewerMode;
  onImagesChanged?: () => void;
};

export type ImageCameraSurfaceProps = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  latestImageUrl?: string;
  onCapture: (rawBlob: Blob) => void;
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
    uploadState: 'completed',
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
    state === 'captured' ||
    state === 'compressing' ||
    state === 'requesting_upload_url' ||
    state === 'uploading' ||
    state === 'confirming'
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
  const { entityType, entityClientId, viewerMode = 'preview-edit', onImagesChanged } = input;
  const entityKey = buildEntityKey(entityType, entityClientId);
  const queryClient = useQueryClient();
  const surface = useSurface();
  const uploadRetrySourcesRef = useRef(new Map<string, Blob>());

  const { data: serverImages = [], isPending, isError } = useEntityImagesQuery({
    entity_type: entityType,
    entity_client_id: entityClientId,
  });

  const optimisticImages = useImagesStore(
    (state) => state.optimisticImages[entityKey] ?? EMPTY_OPTIMISTIC_IMAGES,
  );
  const insertOptimisticImage = useImagesStore((state) => state.insertOptimisticImage);
  const patchOptimisticImage = useImagesStore((state) => state.patchOptimisticImage);
  const removeOptimisticImage = useImagesStore((state) => state.removeOptimisticImage);
  const clearOptimisticImages = useImagesStore((state) => state.clearOptimisticImages);

  const unlinkAction = useUnlinkImage();
  const deleteAction = useDeleteImage();
  const reorderAction = useReorderImages();

  const clearRetrySource = useCallback((imageClientId: string) => {
    uploadRetrySourcesRef.current.delete(imageClientId);
  }, []);

  const confirmedImages = useMemo(
    () => [...serverImages].sort((left, right) => left.display_order - right.display_order),
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
      const currentImages = useImagesStore.getState().optimisticImages[entityKey] ?? [];
      currentImages.forEach((image) => {
        revokeLocalObjectUrl(image);
        clearRetrySource(image.clientId);
      });
      clearOptimisticImages(entityKey);
    };
  }, [clearOptimisticImages, clearRetrySource, entityKey]);

  useEffect(() => {
    const confirmedIds = new Set(serverImages.map((image) => image.image.client_id));

    optimisticImages.forEach((image) => {
      if (confirmedIds.has(image.clientId) && image.localObjectUrl === null) {
        clearRetrySource(image.clientId);
        removeOptimisticImage(entityKey, image.clientId);
      }
    });
  }, [clearRetrySource, entityKey, optimisticImages, removeOptimisticImage, serverImages]);

  const invalidateEntityImages = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: imageKeys.list({
        entity_type: entityType,
        entity_client_id: entityClientId,
      }),
    });
    onImagesChanged?.();
  }, [entityClientId, entityType, onImagesChanged, queryClient]);

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
            .optimisticImages[entityKey]?.find((image) => image.clientId === imageClientId);

          if (currentImage?.uploadState === 'delete_requested') {
            revokeLocalObjectUrl(currentImage);
            clearRetrySource(imageClientId);
            removeOptimisticImage(entityKey, imageClientId);
            void unlinkAction.unlinkImageAsync({
              image_client_id: confirmedImage.client_id,
              entity_type: entityType,
              entity_client_id: entityClientId,
            });
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
            .optimisticImages[entityKey]?.find((image) => image.clientId === imageClientId);

          if (currentImage?.uploadState === 'delete_requested') {
            revokeLocalObjectUrl(currentImage);
            clearRetrySource(imageClientId);
            removeOptimisticImage(entityKey, imageClientId);
            return;
          }

          patchOptimisticImage(entityKey, imageClientId, {
            uploadState: 'failed',
            uploadError: error instanceof Error ? error.message : 'Upload failed.',
          });
        });
    },
    [
      clearRetrySource,
      entityClientId,
      entityKey,
      entityType,
      invalidateEntityImages,
      patchOptimisticImage,
      removeOptimisticImage,
      unlinkAction,
    ],
  );

  const uploadImage = useCallback(
    (rawBlob: Blob) => {
      const optimisticClientId = generateClientId('Image');
      const localObjectUrl = URL.createObjectURL(rawBlob);
      const maxDisplayOrder = images.reduce(
        (maxValue, image) => Math.max(maxValue, image.displayOrder),
        -1,
      );

      insertOptimisticImage(entityKey, {
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
        uploadState: 'captured',
        isOptimistic: true,
        isDeleted: false,
        pendingUploadClientId: null,
        uploadError: null,
        annotation: null,
        annotations: [],
      });
      uploadRetrySourcesRef.current.set(optimisticClientId, rawBlob);
      startUpload({
        imageClientId: optimisticClientId,
        rawBlob,
        fallbackDisplayOrder: maxDisplayOrder + 1,
      });
    },
    [
      images,
      insertOptimisticImage,
      startUpload,
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
        .optimisticImages[entityKey]?.find((image) => image.clientId === imageClientId);

      if (!rawBlob || !currentImage || isUploadingState(currentImage.uploadState)) {
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
        uploadState: 'captured',
      });
      startUpload({
        imageClientId,
        rawBlob,
        fallbackDisplayOrder: currentImage.displayOrder,
      });
    },
    [entityKey, patchOptimisticImage, startUpload],
  );

  const deleteImage = useCallback(
    (imageClientId: string) => {
      const optimisticImage = useImagesStore
        .getState()
        .optimisticImages[entityKey]?.find((image) => image.clientId === imageClientId);

      if (optimisticImage) {
        if (isUploadingState(optimisticImage.uploadState)) {
          patchOptimisticImage(entityKey, imageClientId, {
            isDeleted: true,
            uploadState: 'delete_requested',
          });
          return;
        }

        revokeLocalObjectUrl(optimisticImage);
        clearRetrySource(imageClientId);

        removeOptimisticImage(entityKey, imageClientId);

        if (optimisticImage.uploadState !== 'completed') {
          return;
        }
      }

      void unlinkAction.unlinkImageAsync({
        image_client_id: imageClientId,
        entity_type: entityType,
        entity_client_id: entityClientId,
      }).then(() => onImagesChanged?.());
    },
    [
      clearRetrySource,
      entityClientId,
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
        onDelete: viewerMode === 'preview-edit' ? deleteImage : undefined,
      } satisfies ImageViewerSurfaceProps);
    },
    [deleteImage, entityClientId, entityType, images, surface, viewerMode],
  );

  const imagesRef = useRef(images);
  imagesRef.current = images;

  const openViewerRef = useRef(openViewer);
  openViewerRef.current = openViewer;

  const openCamera = useCallback(() => {
    surface.open(IMAGE_CAMERA_SURFACE_ID, {
      entityType,
      entityClientId,
      latestImageUrl: imagesRef.current.at(-1)?.imageUrl,
      onCapture: uploadImage,
      onViewLatest: () => {
        const latest = imagesRef.current.at(-1);
        if (!latest) return;
        openViewerRef.current(latest.clientId);
      },
    } satisfies ImageCameraSurfaceProps);
  }, [entityClientId, entityType, surface, uploadImage]);

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
        onDelete: viewerMode === 'preview-edit' ? deleteImage : undefined,
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
    isUploading: optimisticImages.some((image) => isUploadingState(image.uploadState)),
    hasFailedUploads: optimisticImages.some((image) => image.uploadState === 'failed'),
    isDeleting: unlinkAction.isPending || deleteAction.isPending,
    isReordering: reorderAction.isPending,
  };
}

export type ImageEntityController = ReturnType<typeof useEntityImagesController>;
export type EntityImagesController = ImageEntityController;
