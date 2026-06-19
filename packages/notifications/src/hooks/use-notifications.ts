import { useMemo } from "react";
import { useMarkNotificationsRead } from "../api/use-mark-read";
import { useNotificationsQuery } from "../api/use-notifications-query";
import { useUnreadCountQuery } from "../api/use-unread-count-query";
import {
  toNotificationViewModel,
  type ListNotificationsParams,
  type NotificationId,
} from "../types";

export function useNotifications(params: ListNotificationsParams = {}) {
  const notificationsQuery = useNotificationsQuery(params);
  const unreadCountQuery = useUnreadCountQuery();
  const markReadAction = useMarkNotificationsRead();

  const notifications = useMemo(
    () =>
      (notificationsQuery.data?.notifications ?? []).map(
        toNotificationViewModel,
      ),
    [notificationsQuery.data?.notifications],
  );

  return {
    notifications,
    hasMore: notificationsQuery.data?.has_more ?? false,
    unreadCount:
      unreadCountQuery.data?.unread_count ??
      notificationsQuery.data?.unread_count ??
      0,
    isLoading: notificationsQuery.isPending || unreadCountQuery.isPending,
    isError: notificationsQuery.isError || unreadCountQuery.isError,
    markRead: (notificationClientIds: NotificationId[]) =>
      markReadAction.markRead({
        notification_client_ids: notificationClientIds,
        mark_all_read: false,
      }),
    markReadAsync: (notificationClientIds: NotificationId[]) =>
      markReadAction.markReadAsync({
        notification_client_ids: notificationClientIds,
        mark_all_read: false,
      }),
    markAllRead: () =>
      markReadAction.markRead({
        notification_client_ids: null,
        mark_all_read: true,
      }),
    markAllReadAsync: () =>
      markReadAction.markReadAsync({
        notification_client_ids: null,
        mark_all_read: true,
      }),
    isMarkingRead: markReadAction.isPending,
    markReadError: markReadAction.error,
  };
}
