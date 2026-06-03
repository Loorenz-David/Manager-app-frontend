import { useQuery } from "@tanstack/react-query";

import type { ListIssueTypesParams } from "../types";
import { fetchIssueTypes } from "./fetch-issue-types";
import { issueTypeKeys } from "./issue-type-keys";

export function useIssueTypesQuery(params: ListIssueTypesParams) {
  const { working_section_ids = [], item_category_ids = [] } = params;

  return useQuery({
    queryKey: issueTypeKeys.list({
      working_section_ids,
      item_category_ids,
    }),
    queryFn: () => fetchIssueTypes(params),
    staleTime: 5 * 60 * 1000,
    enabled:
      working_section_ids.length > 0 || item_category_ids.length > 0,
  });
}
