import { useQuery } from "@tanstack/react-query";
import { fetchUnreadCount } from "./fetch-unread-count";
import { notificationKeys } from "./notification-keys";

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
  });
}
