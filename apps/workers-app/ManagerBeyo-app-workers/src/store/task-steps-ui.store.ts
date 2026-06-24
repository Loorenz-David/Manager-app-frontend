import { create } from "zustand";

type TaskStepsUiState = {
  search: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;
};

export const useTaskStepsUiStore = create<TaskStepsUiState>((set) => ({
  search: "",
  setSearch: (value) => set({ search: value }),
  clearSearch: () => set({ search: "" }),
}));

export const selectSearch = (state: TaskStepsUiState) => state.search;
export const selectSetSearch = (state: TaskStepsUiState) => state.setSearch;
export const selectClearSearch = (state: TaskStepsUiState) => state.clearSearch;
