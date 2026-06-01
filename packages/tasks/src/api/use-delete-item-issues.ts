import { useMutation, useQueryClient } from "@tanstack/react-query";

import { itemIssueKeys } from "./item-issues-keys";
import { deleteItemIssues } from "./delete-item-issues";

export function useDeleteItemIssues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteItemIssues,
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: itemIssueKeys.byItem(variables.itemId),
      });
    },
  });
}
