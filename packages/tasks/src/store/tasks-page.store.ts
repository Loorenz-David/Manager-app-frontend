import { create } from "zustand";

import {
  readTasksListGroupByUpholstery,
  writeTasksListGroupByUpholstery,
} from "../lib/grouping-preference-storage";
import type { TaskState, TaskTypeFilter } from "../types";

type TasksPageStoreState = {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  itemPosition: string;
  groupByUpholstery: boolean;
  setTaskType: (value: TaskTypeFilter) => void;
  setTaskStates: (value: TaskState[]) => void;
  setQ: (value: string) => void;
  setItemPosition: (value: string) => void;
  setGroupByUpholstery: (value: boolean) => void;
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
  // Persisted view preference — hydrated from localStorage, default OFF.
  groupByUpholstery: readTasksListGroupByUpholstery(),
  setTaskType: (value) => set({ taskType: value }),
  setTaskStates: (value) => set({ taskStates: value }),
  setQ: (value) => set({ q: value }),
  setItemPosition: (value) => set({ itemPosition: value }),
  setGroupByUpholstery: (value) => {
    writeTasksListGroupByUpholstery(value);
    set({ groupByUpholstery: value });
  },
  // reset() intentionally leaves `groupByUpholstery` untouched: it is a
  // persisted view mode, not a per-session filter.
  reset: () => set(INITIAL_STATE),
}));
