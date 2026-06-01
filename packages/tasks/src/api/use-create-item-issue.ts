import { useMutation, useQueryClient } from "@tanstack/react-query";

import { itemIssueKeys } from "./item-issues-keys";
import { createItemIssue } from "./create-item-issue";

export function useCreateItemIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createItemIssue,
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: itemIssueKeys.byItem(variables.itemId),
      });
    },
  });
}
