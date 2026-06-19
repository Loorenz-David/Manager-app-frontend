import { useEffect } from "react";
import { notify } from "@beyo/lib";
import { useNotificationsQuery } from "../api/use-notifications-query";
import type { ListNotificationsParams, NotificationId } from "../types";

const seenNotificationIds = new Set<NotificationId>();
let hasBootstrappedToastSeenIds = false;

export function useNotificationToasts(
  params: ListNotificationsParams = { unread_only: true, limit: 30 },
): void {
  const { data } = useNotificationsQuery(params);

  useEffect(() => {
    if (!data) return;

    if (!hasBootstrappedToastSeenIds) {
      data.notifications.forEach((notification) => {
        seenNotificationIds.add(notification.client_id);
      });
      hasBootstrappedToastSeenIds = true;
      return;
    }

    data.notifications.forEach((notification) => {
      if (seenNotificationIds.has(notification.client_id)) return;

      seenNotificationIds.add(notification.client_id);
      notify.info(notification.title, notification.body);
    });
  }, [data]);
}

export function resetNotificationToastTracking(): void {
  seenNotificationIds.clear();
  hasBootstrappedToastSeenIds = false;
}
