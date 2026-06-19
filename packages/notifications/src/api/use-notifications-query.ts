import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "./fetch-notifications";
import { notificationKeys } from "./notification-keys";
import type { ListNotificationsParams } from "../types";

export function useNotificationsQuery(params: ListNotificationsParams = {}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => fetchNotifications(params),
  });
}
