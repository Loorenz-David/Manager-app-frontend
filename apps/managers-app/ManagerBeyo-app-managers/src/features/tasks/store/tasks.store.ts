import { create } from 'zustand';

import type { TaskListItemRaw } from '../types';

type TaskRecord = TaskListItemRaw['task'];

type TasksStoreState = {
  tasksById: Record<string, TaskRecord>;
  taskIdToItemId: Record<string, string>;
  setOne: (task: TaskRecord) => void;
  setMany: (tasks: TaskRecord[]) => void;
  setTaskItemRelation: (taskId: string, itemId: string) => void;
  patch: (taskId: string, patch: Partial<TaskRecord>) => void;
  remove: (taskId: string) => void;
  removeRelation: (taskId: string) => void;
};

export const useTasksStore = create<TasksStoreState>((set) => ({
  tasksById: {},
  taskIdToItemId: {},
  setOne: (task) =>
    set((state) => ({
      tasksById: { ...state.tasksById, [task.client_id]: task },
    })),
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
  remove: (taskId) =>
    set((state) => {
      const { [taskId]: _removed, ...rest } = state.tasksById;
      return { tasksById: rest };
    }),
  removeRelation: (taskId) =>
    set((state) => {
      const { [taskId]: _removed, ...rest } = state.taskIdToItemId;
      return { taskIdToItemId: rest };
    }),
}));
