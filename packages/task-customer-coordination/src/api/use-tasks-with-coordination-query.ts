import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { customerCoordinationKeys } from "./customer-coordination-keys";
import { getTasksWithCoordination } from "./get-tasks-with-coordination";
import type { ListTasksWithCoordinationParams } from "../types";

const PAGE_LIMIT = 25;

export function useTasksWithCoordinationQuery(
  params: Omit<ListTasksWithCoordinationParams, "limit" | "offset">,
) {
  const query = useInfiniteQuery({
    queryKey: customerCoordinationKeys.taskList({
      ...params,
      limit: PAGE_LIMIT,
    }),
    queryFn: ({ pageParam }) =>
      getTasksWithCoordination({
        ...params,
        limit: PAGE_LIMIT,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
    placeholderData: keepPreviousData,
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
