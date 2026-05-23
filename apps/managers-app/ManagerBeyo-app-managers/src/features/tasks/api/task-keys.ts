import type { TaskId } from '@/types/common';
import type { ListTasksFullParams } from '@/features/tasks/types';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params: ListTasksFullParams = {}) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: TaskId) => [...taskKeys.details(), id] as const,
};
