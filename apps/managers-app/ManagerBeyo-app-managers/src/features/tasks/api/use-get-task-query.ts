import { useQuery } from '@tanstack/react-query';

import { getTask } from './get-task';
import { taskKeys } from './task-keys';

export function useGetTaskQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId ? taskKeys.detail(taskId as never) : [...taskKeys.details(), 'missing'],
    queryFn: () => {
      if (!taskId) {
        throw new Error('Task id is required.');
      }

      return getTask(taskId);
    },
    enabled: Boolean(taskId),
  });
}
