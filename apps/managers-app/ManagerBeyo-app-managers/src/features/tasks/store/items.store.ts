import { create } from 'zustand';

import type { TaskListItemRaw } from '../types';

type ItemRecord = NonNullable<TaskListItemRaw['primary_item']>;

type ItemsStoreState = {
  itemsById: Record<string, ItemRecord>;
  setOne: (item: ItemRecord) => void;
  setMany: (items: ItemRecord[]) => void;
  patch: (itemId: string, patch: Partial<ItemRecord>) => void;
  remove: (itemId: string) => void;
};

export const useItemsStore = create<ItemsStoreState>((set) => ({
  itemsById: {},
  setOne: (item) =>
    set((state) => ({
      itemsById: { ...state.itemsById, [item.client_id]: item },
    })),
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
  remove: (itemId) =>
    set((state) => {
      const { [itemId]: _removed, ...rest } = state.itemsById;
      return { itemsById: rest };
    }),
}));
