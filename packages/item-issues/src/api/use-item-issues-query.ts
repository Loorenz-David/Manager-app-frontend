import { useQuery } from "@tanstack/react-query";

import type { ListItemIssuesParams } from "../types";
import { fetchItemIssues } from "./fetch-item-issues";
import { itemIssueKeys } from "./item-issue-keys";

export function useItemIssuesQuery(
  itemId: string | null | undefined,
  params: ListItemIssuesParams = {},
) {
  return useQuery({
    queryKey: itemIssueKeys.byItem(itemId ?? "", {
      working_section_id: params.working_section_id,
      item_category_id: params.item_category_id,
    }),
    queryFn: () => fetchItemIssues(itemId!, params),
    staleTime: 60 * 1000,
    enabled: Boolean(itemId),
  });
}
