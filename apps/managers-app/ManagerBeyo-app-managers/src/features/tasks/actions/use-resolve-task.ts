import { useMutation, useQueryClient } from '@tanstack/react-query';

import { resolveTask } from '../api/resolve-task';
import { taskKeys } from '../api/task-keys';

export function useResolveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resolveTask,
    onSettled: (_data, _error, taskId) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
