import { create } from 'zustand';

import type { TaskState, TaskTypeFilter } from '../types';

type TasksPageStoreState = {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  setTaskType: (value: TaskTypeFilter) => void;
  setTaskStates: (value: TaskState[]) => void;
  setQ: (value: string) => void;
  reset: () => void;
};

const INITIAL_STATE: Pick<TasksPageStoreState, 'taskType' | 'taskStates' | 'q'> = {
  taskType: 'all',
  taskStates: [],
  q: '',
};

export const useTasksPageStore = create<TasksPageStoreState>((set) => ({
  ...INITIAL_STATE,
  setTaskType: (value) => set({ taskType: value }),
  setTaskStates: (value) => set({ taskStates: value }),
  setQ: (value) => set({ q: value }),
  reset: () => set(INITIAL_STATE),
}));
