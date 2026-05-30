import { useQuery } from "@tanstack/react-query";

import { caseKeys } from "./case-keys";
import { getGlobalUnreadCount } from "./get-global-unread-count";

export function useGlobalCaseUnreadCountQuery() {
  return useQuery({
    queryKey: caseKeys.globalUnreadCount(),
    queryFn: getGlobalUnreadCount,
    staleTime: 30_000,
  });
}
