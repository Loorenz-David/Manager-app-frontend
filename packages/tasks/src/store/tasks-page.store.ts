import { create } from "zustand";

import type { TaskState, TaskTypeFilter } from "../types";

type TasksPageStoreState = {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  itemPosition: string;
  setTaskType: (value: TaskTypeFilter) => void;
  setTaskStates: (value: TaskState[]) => void;
  setQ: (value: string) => void;
  setItemPosition: (value: string) => void;
  reset: () => void;
};

const INITIAL_STATE: Pick<
  TasksPageStoreState,
  "taskType" | "taskStates" | "q" | "itemPosition"
> = {
  taskType: "all",
  taskStates: [],
  q: "",
  itemPosition: "",
};

export const useTasksPageStore = create<TasksPageStoreState>((set) => ({
  ...INITIAL_STATE,
  setTaskType: (value) => set({ taskType: value }),
  setTaskStates: (value) => set({ taskStates: value }),
  setQ: (value) => set({ q: value }),
  setItemPosition: (value) => set({ itemPosition: value }),
  reset: () => set(INITIAL_STATE),
}));
