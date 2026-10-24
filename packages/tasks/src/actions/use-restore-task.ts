import { useMutation, useQueryClient } from "@tanstack/react-query";

import { restoreTask } from "../api/restore-task";
import { taskKeys } from "../api/task-keys";

export function useRestoreTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreTask,
    onSettled: (_data, _error, taskId) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}
