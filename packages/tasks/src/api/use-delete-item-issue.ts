import { useMutation, useQueryClient } from "@tanstack/react-query";

import { itemIssueKeys } from "./item-issues-keys";
import { deleteItemIssue } from "./delete-item-issue";

export function useDeleteItemIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteItemIssue,
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: itemIssueKeys.byItem(variables.itemId),
      });
    },
  });
}
