import { useInfiniteQuery } from "@tanstack/react-query";

import { listTaskFlowRecords } from "./list-task-flow-records";
import { taskFlowRecordKeys } from "./task-flow-record-keys";

type UseTaskFlowRecordsInfiniteQueryParams = {
  taskId: string | null | undefined;
  pageSize?: number;
  loadMoreSize?: number;
};

export function useTaskFlowRecordsInfiniteQuery({
  taskId,
  pageSize = 10,
  loadMoreSize = 10,
}: UseTaskFlowRecordsInfiniteQueryParams) {
  return useInfiniteQuery({
    queryKey: taskId
      ? taskFlowRecordKeys.byTaskInfinite(taskId)
      : taskFlowRecordKeys.missing(),
    queryFn: ({ pageParam }) => {
      if (!taskId) {
        throw new Error("taskId is required");
      }

      return listTaskFlowRecords(taskId, {
        limit: pageParam === 0 ? pageSize : loadMoreSize,
        offset: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.flow_records_pagination.has_more
        ? lastPage.flow_records_pagination.offset +
          lastPage.flow_records_pagination.limit
        : undefined,
    enabled: Boolean(taskId),
  });
}
