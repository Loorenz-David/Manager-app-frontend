import type { TaskId, TaskStepId } from '@/types/common';

export const taskStepKeys = {
  all: ['task-steps'] as const,
  lists: () => [...taskStepKeys.all, 'list'] as const,
  list: (taskId: TaskId) => [...taskStepKeys.lists(), { taskId }] as const,
  details: () => [...taskStepKeys.all, 'detail'] as const,
  detail: (id: TaskStepId) => [...taskStepKeys.details(), id] as const,
};
