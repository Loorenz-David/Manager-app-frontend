import { create } from "zustand";
import type { CelebrationConfig } from "../types";

type CelebrationState = {
  config: CelebrationConfig | null;
  trigger: (config: CelebrationConfig) => void;
  dismiss: () => void;
};

export const useCelebrationStore = create<CelebrationState>((set) => ({
  config: null,
  trigger: (config) => set({ config }),
  dismiss: () => set({ config: null }),
}));

export const selectConfig = (state: CelebrationState) => state.config;
export const selectTrigger = (state: CelebrationState) => state.trigger;
export const selectDismiss = (state: CelebrationState) => state.dismiss;
