import { create } from "zustand";

import type { ItemCategoryPickerOption } from "../types/picker";

type ItemCategorySelectionState = {
  options: ItemCategoryPickerOption[];
  setOptions: (options: ItemCategoryPickerOption[]) => void;
  clear: () => void;
};

export const useItemCategorySelectionStore =
  create<ItemCategorySelectionState>()((set) => ({
    options: [],
    setOptions: (options) => set({ options }),
    clear: () => set({ options: [] }),
  }));
