import { create } from "zustand";

import type { WorkingSectionOption } from "../types";

type WorkingSectionSelectionState = {
  options: WorkingSectionOption[];
  setOptions: (options: WorkingSectionOption[]) => void;
  clear: () => void;
};

export const useWorkingSectionSelectionStore =
  create<WorkingSectionSelectionState>()((set) => ({
    options: [],
    setOptions: (options) => set({ options }),
    clear: () => set({ options: [] }),
  }));
