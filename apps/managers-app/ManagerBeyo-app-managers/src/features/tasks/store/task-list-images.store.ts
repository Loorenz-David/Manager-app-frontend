import { create } from 'zustand';

import type { ImageViewModel } from '@/features/images/types';

type TaskListImagesStoreState = {
  imagesByItemId: Record<string, ImageViewModel[]>;
  setForItem: (itemId: string, images: ImageViewModel[]) => void;
  patchImage: (itemId: string, imageClientId: string, patch: Partial<ImageViewModel>) => void;
  removeForItem: (itemId: string) => void;
};

export const useTaskListImagesStore = create<TaskListImagesStoreState>((set) => ({
  imagesByItemId: {},
  setForItem: (itemId, images) =>
    set((state) => ({
      imagesByItemId: { ...state.imagesByItemId, [itemId]: images },
    })),
  patchImage: (itemId, imageClientId, patch) =>
    set((state) => {
      const images = state.imagesByItemId[itemId];
      if (!images) {
        return state;
      }
      return {
        imagesByItemId: {
          ...state.imagesByItemId,
          [itemId]: images.map((image) =>
            image.clientId === imageClientId ? { ...image, ...patch } : image,
          ),
        },
      };
    }),
  removeForItem: (itemId) =>
    set((state) => {
      const { [itemId]: _removed, ...rest } = state.imagesByItemId;
      return { imagesByItemId: rest };
    }),
}));
