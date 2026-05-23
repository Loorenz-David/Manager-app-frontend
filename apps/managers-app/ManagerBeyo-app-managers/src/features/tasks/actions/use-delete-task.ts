import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTask } from '../api/delete-task';
import { taskKeys } from '../api/task-keys';

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSettled: (_data, _error, taskId) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.removeQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
  });
}
