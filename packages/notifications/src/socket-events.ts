import type { SocketEventHandlers } from "@beyo/realtime";
import { notificationKeys } from "./api/notification-keys";

export const notificationSocketEvents: SocketEventHandlers = {
  "notification:new": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: notificationKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: notificationKeys.unreadCount(),
      refetchType: "active",
    });
  },
};
