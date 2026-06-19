import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationsRead } from "./mark-notifications-read";
import { notificationKeys } from "./notification-keys";
import type {
  MarkNotificationsReadInput,
  NotificationListResponse,
  UnreadCountResponse,
} from "../types";

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: markNotificationsRead,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
      await queryClient.cancelQueries({
        queryKey: notificationKeys.unreadCount(),
      });

      const previousLists =
        queryClient.getQueriesData<NotificationListResponse>({
          queryKey: notificationKeys.lists(),
        });
      const previousUnreadCount =
        queryClient.getQueryData<UnreadCountResponse>(
          notificationKeys.unreadCount(),
        );

      const readAt = new Date().toISOString();
      const ids = new Set(input.notification_client_ids ?? []);

      // Count how many currently-unread notifications will actually be marked
      // read — used to optimistically decrement the badge count accurately.
      // ids.size would be wrong if any of the targeted notifications are already read.
      let optimisticReadDelta = 0;
      if (!input.mark_all_read) {
        previousLists.forEach(([, data]) => {
          if (!data) return;
          data.notifications.forEach((n) => {
            if (ids.has(n.client_id) && n.read_at === null) optimisticReadDelta += 1;
          });
        });
      }

      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: notificationKeys.lists() },
        (old) => markListRead(old, input, ids, readAt),
      );

      queryClient.setQueryData<UnreadCountResponse>(
        notificationKeys.unreadCount(),
        (old) => {
          if (!old) return old;
          return {
            unread_count: input.mark_all_read
              ? 0
              : Math.max(old.unread_count - optimisticReadDelta, 0),
          };
        },
      );

      return { previousLists, previousUnreadCount };
    },
    onError: (_error, _input, context) => {
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      queryClient.setQueryData(
        notificationKeys.unreadCount(),
        context?.previousUnreadCount,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    },
  });

  return {
    markRead: mutation.mutate,
    markReadAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

function markListRead(
  old: NotificationListResponse | undefined,
  input: MarkNotificationsReadInput,
  ids: Set<string>,
  readAt: string,
): NotificationListResponse | undefined {
  if (!old) return old;

  let unreadDelta = 0;
  const notifications = old.notifications.map((notification) => {
    const shouldMark =
      input.mark_all_read || ids.has(notification.client_id);

    if (!shouldMark || notification.read_at !== null) {
      return notification;
    }

    unreadDelta += 1;
    return { ...notification, read_at: readAt };
  });

  return {
    ...old,
    notifications,
    unread_count: input.mark_all_read
      ? 0
      : Math.max(old.unread_count - unreadDelta, 0),
  };
}

