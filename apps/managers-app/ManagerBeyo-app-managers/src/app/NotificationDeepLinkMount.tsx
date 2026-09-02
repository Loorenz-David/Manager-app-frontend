import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useMarkNotificationsRead,
  type NotificationId,
} from "@beyo/notifications";
import {
  TASK_DETAIL_SURFACE_ID,
  type TaskDetailSurfaceProps,
} from "@/features/tasks/surfaces";
import { buildCaseConversationRoute, ROUTES } from "@/lib/routes";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

const NOTIFICATION_PARAM_KEYS = ["notif_type", "notif_id", "notif_cid"];

function stripNotificationParams(search: string): string {
  const params = new URLSearchParams(search);
  NOTIFICATION_PARAM_KEYS.forEach((key) => params.delete(key));
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
}

export function NotificationDeepLinkMount(): null {
  const location = useLocation();
  const navigate = useNavigate();
  const { markRead } = useMarkNotificationsRead();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notifType = params.get("notif_type");
    const notifId = params.get("notif_id");
    const notifCid = params.get("notif_cid");

    if (!notifType) return;

    if (notifCid) {
      markRead({
        notification_client_ids: [notifCid as NotificationId],
        mark_all_read: false,
      });
    }

    switch (notifType) {
      case "task":
      case "task_step": {
        navigate(
          {
            pathname: location.pathname,
            search: stripNotificationParams(location.search),
          },
          { replace: true },
        );

        if (notifId) {
          useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
            taskId: notifId,
          } satisfies TaskDetailSurfaceProps);
        }
        break;
      }
      case "case":
        if (notifId) {
          navigate(buildCaseConversationRoute(notifId), { replace: true });
        }
        break;
      case "upholstery":
        navigate(ROUTES.upholsteryInventory, { replace: true });
        break;
      default:
        break;
    }
  }, [location.pathname, location.search, markRead, navigate]);

  return null;
}
