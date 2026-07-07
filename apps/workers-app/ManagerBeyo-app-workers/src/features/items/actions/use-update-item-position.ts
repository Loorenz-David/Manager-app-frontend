import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItemPositions } from "@beyo/items";

import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { taskStepKeys } from "../../task_steps/api/task-step-keys";

type UpdateItemPositionInput = {
  id: string;
  item_position: string | null;
  item_zone?: string | null;
};

export function useUpdateItemPosition(workingSectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, item_position, item_zone }: UpdateItemPositionInput) =>
      updateItemPositions([{ client_id: id, item_position, item_zone }]),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(workingSectionId as never),
      });
      void queryClient.invalidateQueries({
        queryKey: workerWorkingSectionKeys.mine(),
      });
    },
  });
}
