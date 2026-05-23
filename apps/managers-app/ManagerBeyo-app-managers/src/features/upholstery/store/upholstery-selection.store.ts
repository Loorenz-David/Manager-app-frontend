import { create } from 'zustand';

import type { UpholsteryPickerRecord } from '../types';

type UpholsterySelectionState = {
  options: UpholsteryPickerRecord[];
  setOptions: (options: UpholsteryPickerRecord[]) => void;
  clear: () => void;
};

export const useUpholsterySelectionStore = create<UpholsterySelectionState>()((set) => ({
  options: [],
  setOptions: (options) => set({ options }),
  clear: () => set({ options: [] }),
}));
