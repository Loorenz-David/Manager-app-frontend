import { create } from 'zustand';

import type { TaskListItemRaw } from '../types';

type TaskRecord = TaskListItemRaw['task'];

type TasksStoreState = {
  tasksById: Record<string, TaskRecord>;
  taskIdToItemId: Record<string, string>;
  setMany: (tasks: TaskRecord[]) => void;
  setTaskItemRelation: (taskId: string, itemId: string) => void;
  patch: (taskId: string, patch: Partial<TaskRecord>) => void;
};

export const useTasksStore = create<TasksStoreState>((set) => ({
  tasksById: {},
  taskIdToItemId: {},
  setMany: (tasks) =>
    set((state) => {
      const next = { ...state.tasksById };
      for (const task of tasks) {
        next[task.client_id] = task;
      }
      return { tasksById: next };
    }),
  setTaskItemRelation: (taskId, itemId) =>
    set((state) => ({
      taskIdToItemId: { ...state.taskIdToItemId, [taskId]: itemId },
    })),
  patch: (taskId, patch) =>
    set((state) => {
      const existing = state.tasksById[taskId];
      if (!existing) {
        return state;
      }
      return {
        tasksById: {
          ...state.tasksById,
          [taskId]: { ...existing, ...patch },
        },
      };
    }),
}));
