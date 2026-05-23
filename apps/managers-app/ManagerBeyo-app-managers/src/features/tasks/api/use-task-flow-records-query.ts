import { useQuery } from '@tanstack/react-query';

import { listTaskFlowRecords } from './list-task-flow-records';
import { taskKeys } from './task-keys';

export function useTaskFlowRecordsQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId
      ? [...taskKeys.detail(taskId as never), 'flow-records']
      : [...taskKeys.details(), 'missing', 'flow-records'],
    queryFn: () => {
      if (!taskId) {
        throw new Error('Task id is required.');
      }

      return listTaskFlowRecords(taskId);
    },
    enabled: Boolean(taskId),
  });
}
