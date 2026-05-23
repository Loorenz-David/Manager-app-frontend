import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';

import { deleteItemIssue } from '../api/delete-item-issue';

export function useDeleteItemIssue(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteItemIssue,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
    },
  });
}
