import { useQuery } from "@tanstack/react-query";

import { getPostHandlingCounts } from "./get-post-handling-counts";
import { taskKeys } from "./task-keys";

export function usePostHandlingCountsQuery(postHandlingStates?: string) {
  return useQuery({
    queryKey: taskKeys.postHandlingCounts(postHandlingStates),
    queryFn: () =>
      getPostHandlingCounts({
        post_handling_states: postHandlingStates,
      }),
  });
}
