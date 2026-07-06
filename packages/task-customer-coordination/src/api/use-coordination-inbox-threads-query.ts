import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { customerCoordinationEmailKeys } from "./customer-coordination-email-keys";
import { getCoordinationInboxThreads } from "./get-coordination-inbox-threads";
import type { CoordinationInboxThreadsParams } from "../types";

export function useCoordinationInboxThreadsQuery(
  params: CoordinationInboxThreadsParams,
) {
  return useQuery({
    queryKey: customerCoordinationEmailKeys.inboxThreads(params),
    queryFn: () => getCoordinationInboxThreads(params),
    placeholderData: keepPreviousData,
  });
}
