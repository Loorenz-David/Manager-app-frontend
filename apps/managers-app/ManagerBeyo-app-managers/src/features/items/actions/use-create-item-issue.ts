import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';

import { createItemIssue } from '../api/create-item-issue';

export function useCreateItemIssue(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createItemIssue,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
  });
}
