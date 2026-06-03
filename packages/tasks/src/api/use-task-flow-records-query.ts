import { useQuery } from "@tanstack/react-query";

import { listTaskFlowRecords } from "./list-task-flow-records";
import { taskFlowRecordKeys } from "./task-flow-record-keys";

/** @deprecated Use useTaskFlowRecordsInfiniteQuery for paginated loading. */
export function useTaskFlowRecordsQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId
      ? taskFlowRecordKeys.byTask(taskId)
      : taskFlowRecordKeys.missing(),
    queryFn: () => {
      if (!taskId) {
        throw new Error("taskId is required");
      }

      return listTaskFlowRecords(taskId);
    },
    enabled: Boolean(taskId),
  });
}
