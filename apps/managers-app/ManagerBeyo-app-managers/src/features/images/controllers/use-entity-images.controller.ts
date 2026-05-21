import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useEntityImagesQuery } from '../api/use-entity-images';
import { imageKeys } from '../api/image-keys';
import { runImageUploadPipeline } from '../lib/image-upload-pipeline';
import { buildEntityKey, useImagesStore } from '../store/images.store';
import { useDeleteImage } from '../actions/use-delete-image';
import { useReorderImages } from '../actions/use-reorder-images';
import { useUnlinkImage } from '../actions/use-unlink-image';
import type { Image, ImageLinkEntityType, ImageUploadState, ImageViewModel } from '../types';
import { toImageViewModel } from '../types';
import { useSurface } from '@/hooks/use-surface';
import { generateClientId } from '@/lib/client-id';

export const IMAGE_CAMERA_SURFACE_ID = 'image-camera';
export const IMAGE_VIEWER_SURFACE_ID = 'image-viewer';
export const IMAGE_METADATA_SURFACE_ID = 'image-metadata';
export const IMAGE_EDITOR_SURFACE_ID = 'image-editor';

export type ImageViewerMode = 'preview-only' | 'preview-edit';

export type UseEntityImagesControllerInput = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  viewerMode?: ImageViewerMode;
};

export type ImageCameraSurfaceProps = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  latestImageUrl?: string;
  onCapture: (rawBlob: Blob) => void;
};

export type ImageViewerSurfaceProps = {
  images: ImageViewModel[];
  initialImageClientId: string;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  mode: ImageViewerMode;
  onDelete?: (imageClientId: string) => void;
};

export type ImageMetadataSurfaceProps = {
  image: ImageViewModel;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  mode: ImageViewerMode;
  onDelete?: (imageClientId: string) => void;
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
    annotation: image.image_annotation
      ? {
          clientId: image.image_annotation.client_id,
          annotationType: image.image_annotation.annotation_type,
          data: image.image_annotation.data ?? null,
          accuracy: image.image_annotation.accuracy ?? null,
          createdAt: image.image_annotation.created_at,
        }
      : null,
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

export function useEntityImagesController(
  input: UseEntityImagesControllerInput,
) {
  const { entityType, entityClientId, viewerMode = 'preview-edit' } = input;
  const entityKey = buildEntityKey(entityType, entityClientId);
  const queryClient = useQueryClient();
  const surface = useSurface();

  const { data: serverImages = [], isPending, isError } = useEntityImagesQuery({
    entity_type: entityType,
    entity_client_id: entityClientId,
  });

  const optimisticImages = useImagesStore((state) => state.optimisticImages[entityKey] ?? []);
  const insertOptimisticImage = useImagesStore((state) => state.insertOptimisticImage);
  const patchOptimisticImage = useImagesStore((state) => state.patchOptimisticImage);
  const removeOptimisticImage = useImagesStore((state) => state.removeOptimisticImage);

  const unlinkAction = useUnlinkImage();
  const deleteAction = useDeleteImage();
  const reorderAction = useReorderImages();

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
    const confirmedIds = new Set(serverImages.map((image) => image.image.client_id));

    optimisticImages.forEach((image) => {
      if (confirmedIds.has(image.clientId) && image.localObjectUrl === null) {
        removeOptimisticImage(entityKey, image.clientId);
      }
    });
  }, [entityKey, optimisticImages, removeOptimisticImage, serverImages]);

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
      });

      void runImageUploadPipeline({
        rawBlob,
        entityType,
        entityClientId,
        onProgress: (progressState) => {
          patchOptimisticImage(entityKey, optimisticClientId, {
            uploadState: progressState,
          });
        },
      })
        .then(async (confirmedImage) => {
          const currentImage = useImagesStore
            .getState()
            .optimisticImages[entityKey]?.find((image) => image.clientId === optimisticClientId);

          if (currentImage?.uploadState === 'delete_requested') {
            URL.revokeObjectURL(localObjectUrl);
            removeOptimisticImage(entityKey, optimisticClientId);
            void unlinkAction.unlinkImageAsync({
              image_client_id: confirmedImage.client_id,
              entity_type: entityType,
              entity_client_id: entityClientId,
            });
            return;
          }

          URL.revokeObjectURL(localObjectUrl);
          patchOptimisticImage(
            entityKey,
            optimisticClientId,
            toConfirmedOptimisticViewModel(
              confirmedImage,
              entityType,
              entityClientId,
              currentImage?.displayOrder ?? maxDisplayOrder + 1,
            ),
          );

          await queryClient.invalidateQueries({
            queryKey: imageKeys.list({
              entity_type: entityType,
              entity_client_id: entityClientId,
            }),
          });
        })
        .catch((error: unknown) => {
          const currentImage = useImagesStore
            .getState()
            .optimisticImages[entityKey]?.find((image) => image.clientId === optimisticClientId);

          if (currentImage?.uploadState === 'delete_requested') {
            URL.revokeObjectURL(localObjectUrl);
            removeOptimisticImage(entityKey, optimisticClientId);
            return;
          }

          patchOptimisticImage(entityKey, optimisticClientId, {
            uploadState: 'failed',
            uploadError: error instanceof Error ? error.message : 'Upload failed.',
          });
        });
    },
    [
      entityClientId,
      entityKey,
      entityType,
      images,
      insertOptimisticImage,
      patchOptimisticImage,
      queryClient,
      removeOptimisticImage,
      unlinkAction,
    ],
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

        if (optimisticImage.localObjectUrl !== null) {
          URL.revokeObjectURL(optimisticImage.localObjectUrl);
        }

        removeOptimisticImage(entityKey, imageClientId);

        if (optimisticImage.uploadState !== 'completed') {
          return;
        }
      }

      void unlinkAction.unlinkImageAsync({
        image_client_id: imageClientId,
        entity_type: entityType,
        entity_client_id: entityClientId,
      });
    },
    [
      entityClientId,
      entityKey,
      entityType,
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

  const openCamera = useCallback(() => {
    const latestImageUrl = images.at(-1)?.imageUrl;

    surface.open(IMAGE_CAMERA_SURFACE_ID, {
      entityType,
      entityClientId,
      latestImageUrl,
      onCapture: uploadImage,
    } satisfies ImageCameraSurfaceProps);
  }, [entityClientId, entityType, images, surface, uploadImage]);

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
    deleteImage,
    reorderImages,
    openCamera,
    openViewer,
    openMetadataSheet,
    isUploading: optimisticImages.some((image) => isUploadingState(image.uploadState)),
    isDeleting: unlinkAction.isPending || deleteAction.isPending,
    isReordering: reorderAction.isPending,
  };
}

export type ImageEntityController = ReturnType<typeof useEntityImagesController>;
export type EntityImagesController = ImageEntityController;
