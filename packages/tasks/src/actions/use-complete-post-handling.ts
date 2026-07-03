import { useMutation, useQueryClient } from "@tanstack/react-query";

import { completePostHandling } from "../api/complete-post-handling";
import { taskKeys } from "../api/task-keys";

export function useCompletePostHandling() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: completePostHandling,
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.detail(input.taskId),
      });
      void queryClient.invalidateQueries({
        queryKey: taskKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: taskKeys.postHandling(),
      });
    },
  });

  return {
    ...mutation,
    completePostHandling: mutation.mutateAsync,
  };
}
