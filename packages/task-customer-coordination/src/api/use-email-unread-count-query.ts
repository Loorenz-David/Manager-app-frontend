import { useQuery } from "@tanstack/react-query";

import { customerCoordinationEmailKeys } from "./customer-coordination-email-keys";
import { getEmailUnreadCount } from "./get-email-unread-count";

export function useEmailUnreadCountQuery() {
  return useQuery({
    queryKey: customerCoordinationEmailKeys.unreadCount(),
    queryFn: getEmailUnreadCount,
  });
}
