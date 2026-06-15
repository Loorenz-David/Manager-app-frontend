import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchPendingSeatTasks } from "./fetch-pending-seat-tasks";
import { pendingSeatUpholsteryKeys } from "./pending-seat-keys";
import type { ListPendingSeatTasksParams } from "../types";

export function usePendingSeatTasksQuery(params: ListPendingSeatTasksParams) {
  return useQuery({
    queryKey: pendingSeatUpholsteryKeys.list(params),
    queryFn: () => fetchPendingSeatTasks(params),
    placeholderData: keepPreviousData,
  });
}
