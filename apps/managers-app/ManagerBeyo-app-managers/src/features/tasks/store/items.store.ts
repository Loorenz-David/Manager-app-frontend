import { create } from 'zustand';

import type { TaskListItemRaw } from '../types';

type ItemRecord = NonNullable<TaskListItemRaw['primary_item']>;

type ItemsStoreState = {
  itemsById: Record<string, ItemRecord>;
  setMany: (items: ItemRecord[]) => void;
  patch: (itemId: string, patch: Partial<ItemRecord>) => void;
};

export const useItemsStore = create<ItemsStoreState>((set) => ({
  itemsById: {},
  setMany: (items) =>
    set((state) => {
      const next = { ...state.itemsById };
      for (const item of items) {
        next[item.client_id] = item;
      }
      return { itemsById: next };
    }),
  patch: (itemId, patch) =>
    set((state) => {
      const existing = state.itemsById[itemId];
      if (!existing) {
        return state;
      }
      return {
        itemsById: {
          ...state.itemsById,
          [itemId]: { ...existing, ...patch },
        },
      };
    }),
}));
