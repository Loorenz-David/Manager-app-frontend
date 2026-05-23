import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateTask } from '../api/update-task';
import { taskKeys } from '../api/task-keys';

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(input.id) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
