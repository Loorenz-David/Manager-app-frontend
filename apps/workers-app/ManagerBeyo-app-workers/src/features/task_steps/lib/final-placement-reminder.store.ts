import { create } from "zustand";

export type FinalPlacementReminderItem = {
  itemLabel: string;
  assortment: string | null;
};

type FinalPlacementReminderState = {
  items: FinalPlacementReminderItem[];
  show: (items: FinalPlacementReminderItem[]) => void;
  dismiss: () => void;
};

export const useFinalPlacementReminderStore =
  create<FinalPlacementReminderState>((set) => ({
    items: [],
    show: (items) => set({ items }),
    dismiss: () => set({ items: [] }),
  }));

export const selectFinalPlacementReminderItems = (
  state: FinalPlacementReminderState,
) => state.items;
export const selectShowFinalPlacementReminder = (
  state: FinalPlacementReminderState,
) => state.show;
export const selectDismissFinalPlacementReminder = (
  state: FinalPlacementReminderState,
) => state.dismiss;
