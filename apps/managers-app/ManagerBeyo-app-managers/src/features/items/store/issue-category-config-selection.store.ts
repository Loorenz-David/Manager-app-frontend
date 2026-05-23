import { create } from 'zustand';

import type { IssueCategoryConfig } from '../types';

type IssueCategoryConfigSelectionState = {
  configsByCategory: Record<string, IssueCategoryConfig[]>;
  setConfigsForCategory: (categoryId: string, configs: IssueCategoryConfig[]) => void;
  clear: () => void;
};

export const useIssueCategoryConfigSelectionStore =
  create<IssueCategoryConfigSelectionState>()((set) => ({
    configsByCategory: {},
    setConfigsForCategory: (categoryId, configs) =>
      set((state) => ({
        configsByCategory: {
          ...state.configsByCategory,
          [categoryId]: configs,
        },
      })),
    clear: () => set({ configsByCategory: {} }),
  }));
