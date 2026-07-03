import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { listTasks } from "./list-tasks";
import { taskKeys } from "./task-keys";
import type { ListTasksFullParams } from "../types";

const PAGE_LIMIT = 25;

export function useListPostHandlingTasksQuery(
  params: Omit<ListTasksFullParams, "limit" | "offset">,
  options?: { enabled?: boolean },
) {
  const query = useInfiniteQuery({
    queryKey: taskKeys.list({ ...params, limit: PAGE_LIMIT }),
    queryFn: ({ pageParam }) =>
      listTasks({
        ...params,
        limit: PAGE_LIMIT,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });

  return {
    query,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
  };
}
