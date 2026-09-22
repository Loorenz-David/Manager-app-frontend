import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import type { TaskId, TaskStepId } from "@beyo/lib";
import {
  useMarkNotificationsRead,
  type NotificationId,
} from "@beyo/notifications";
import { fetchTaskStep } from "@/features/task_steps/api/fetch-task-step";
import { taskStepKeys } from "@/features/task_steps/api/task-step-keys";
import {
  TASK_STEP_DETAIL_SURFACE_ID,
  type TaskStepDetailSurfaceProps,
} from "@/features/task_steps/surface-ids";
import { buildCaseConversationRoute, ROUTES } from "@/lib/routes";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

const NOTIFICATION_PARAM_KEYS = [
  "notif_type",
  "notif_id",
  "notif_task_id",
  "notif_cid",
];

function stripNotificationParams(search: string): string {
  const params = new URLSearchParams(search);
  NOTIFICATION_PARAM_KEYS.forEach((key) => params.delete(key));
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
}

export function NotificationDeepLinkMount(): null {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { markRead } = useMarkNotificationsRead();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notifType = params.get("notif_type");
    const notifId = params.get("notif_id");
    const notifTaskId = params.get("notif_task_id");
    const notifCid = params.get("notif_cid");

    if (!notifType) return;

    if (notifCid) {
      markRead({
        notification_client_ids: [notifCid as NotificationId],
        mark_all_read: false,
      });
    }

    if (notifType === "case") {
      if (notifId) {
        navigate(buildCaseConversationRoute(notifId), { replace: true });
      } else {
        navigate(ROUTES.cases, { replace: true });
      }
      return;
    }

    if (notifType === "upholstery") {
      navigate(ROUTES.home, { replace: true });
      return;
    }

    if (notifType !== "task_step") return;

    if (!notifId || !notifTaskId) {
      navigate(
        {
          pathname: location.pathname,
          search: stripNotificationParams(location.search),
        },
        { replace: true },
      );
      return;
    }

    let cancelled = false;

    const stepId = notifId as TaskStepId;

    // Fetched through the cache so the detail entry is seeded fresh before the
    // surface reads it.
    queryClient
      .fetchQuery({
        queryKey: taskStepKeys.detail(stepId),
        queryFn: () => fetchTaskStep(stepId),
      })
      .then((step) => {
        if (cancelled) return;

        navigate(
          {
            pathname: location.pathname,
            search: stripNotificationParams(location.search),
          },
          { replace: true },
        );

        useSurfaceStore.getState().open(TASK_STEP_DETAIL_SURFACE_ID, {
          stepId,
          taskId: notifTaskId as TaskId,
          workingSectionId: step.working_section_id,
          initialStep: step,
        } satisfies TaskStepDetailSurfaceProps);
      })
      .catch((error: unknown) => {
        console.error("Failed to resolve notification task step link", error);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, markRead, navigate, queryClient]);

  return null;
}
