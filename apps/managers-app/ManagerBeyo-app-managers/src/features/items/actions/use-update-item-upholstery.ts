import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import { upholsteryKeys } from '@/features/upholstery/api/upholstery-keys';
import { useUpholsterySelectionStore } from '@/features/upholstery/store/upholstery-selection.store';

import { updateItemUpholstery } from '../api/update-item-upholstery';

export function useUpdateItemUpholstery(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItemUpholstery,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
      void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
      useUpholsterySelectionStore.getState().clear();
    },
  });
}
