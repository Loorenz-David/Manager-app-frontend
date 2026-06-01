import { useQuery } from "@tanstack/react-query";

import { fetchItemIssues } from "./fetch-item-issues";
import { itemIssueKeys } from "./item-issues-keys";

export function useItemIssuesQuery(itemId: string | null | undefined) {
  return useQuery({
    queryKey: itemId ? itemIssueKeys.byItem(itemId) : itemIssueKeys.missing(),
    queryFn: () => {
      if (!itemId) {
        throw new Error("itemId is required");
      }

      return fetchItemIssues(itemId);
    },
    enabled: Boolean(itemId),
  });
}
