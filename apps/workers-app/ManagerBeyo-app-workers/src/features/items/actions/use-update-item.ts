import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItem, type UpdateItemInput } from "@beyo/items";

import { workerWorkingSectionKeys } from "../../working_sections/api/working-section-keys";
import { taskStepKeys } from "../../task_steps/api/task-step-keys";

export function useUpdateItem(workingSectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateItemInput) => updateItem(input),
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
