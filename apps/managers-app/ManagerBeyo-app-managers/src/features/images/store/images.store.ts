import { create } from 'zustand';

import type { ImageViewModel } from '../types';

export const EMPTY_OPTIMISTIC_IMAGES: ImageViewModel[] = [];

export type OptimisticImagePatch = Partial<
  Pick<
    ImageViewModel,
    | 'annotation'
    | 'annotations'
    | 'clientId'
    | 'createdAt'
    | 'displayOrder'
    | 'entityClientId'
    | 'entityType'
    | 'fileSizeBytes'
    | 'heightPx'
    | 'imageUrl'
    | 'isDeleted'
    | 'isOptimistic'
    | 'linkClientId'
    | 'localObjectUrl'
    | 'pendingUploadClientId'
    | 'uploadError'
    | 'uploadState'
    | 'widthPx'
  >
>;

type ImagesStoreState = {
  optimisticImages: Record<string, ImageViewModel[]>;
  insertOptimisticImage: (entityKey: string, image: ImageViewModel) => void;
  patchOptimisticImage: (
    entityKey: string,
    optimisticClientId: string,
    patch: OptimisticImagePatch,
  ) => void;
  removeOptimisticImage: (entityKey: string, optimisticClientId: string) => void;
  clearOptimisticImages: (entityKey: string) => void;
};

export const useImagesStore = create<ImagesStoreState>((set) => ({
  optimisticImages: {},

  insertOptimisticImage: (entityKey, image) =>
    set((state) => ({
      optimisticImages: {
        ...state.optimisticImages,
        [entityKey]: [...(state.optimisticImages[entityKey] ?? []), image],
      },
    })),

  patchOptimisticImage: (entityKey, optimisticClientId, patch) =>
    set((state) => ({
      optimisticImages: {
        ...state.optimisticImages,
        [entityKey]: (state.optimisticImages[entityKey] ?? []).map((image) =>
          image.clientId === optimisticClientId ? { ...image, ...patch } : image,
        ),
      },
    })),

  removeOptimisticImage: (entityKey, optimisticClientId) =>
    set((state) => {
      const existing = state.optimisticImages[entityKey] ?? [];
      const nextImages = existing.filter((image) => image.clientId !== optimisticClientId);

      return {
        optimisticImages: {
          ...state.optimisticImages,
          [entityKey]: nextImages,
        },
      };
    }),

  clearOptimisticImages: (entityKey) =>
    set((state) => ({
      optimisticImages: {
        ...state.optimisticImages,
        [entityKey]: [],
      },
    })),
}));

export function buildEntityKey(entityType: string, entityClientId: string): string {
  return `${entityType}::${entityClientId}`;
}
