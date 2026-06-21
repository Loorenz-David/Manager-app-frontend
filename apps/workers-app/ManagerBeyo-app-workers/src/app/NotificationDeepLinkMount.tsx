import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";
import {
  useMarkNotificationsRead,
  type NotificationId,
} from "@beyo/notifications";
import { fetchWorkingSectionSteps } from "@/features/task_steps/api/fetch-working-section-steps";
import {
  TASK_STEP_DETAIL_SURFACE_ID,
  type TaskStepDetailSurfaceProps,
} from "@/features/task_steps/surface-ids";
import { fetchWorkerWorkingSections } from "@/features/working_sections/api/fetch-worker-working-sections";
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

async function resolveWorkingSectionIdForStep(
  stepId: string,
): Promise<WorkingSectionId | null> {
  const sections = await fetchWorkerWorkingSections();
  const orderedSections = [...sections].sort((a, b) => {
    const activeA =
      a.task_steps_counts.paused +
      a.task_steps_counts.working +
      a.task_steps_counts.ended_shift;
    const activeB =
      b.task_steps_counts.paused +
      b.task_steps_counts.working +
      b.task_steps_counts.ended_shift;
    return activeB - activeA;
  });

  for (const section of orderedSections) {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await fetchWorkingSectionSteps({
        working_section_id: section.client_id,
        limit: 50,
        offset,
      });

      if (page.items.some((step) => step.client_id === stepId)) {
        return section.client_id;
      }

      hasMore = page.has_more;
      offset += page.limit;
    }
  }

  return null;
}

export function NotificationDeepLinkMount(): null {
  const location = useLocation();
  const navigate = useNavigate();
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

    resolveWorkingSectionIdForStep(notifId)
      .then((workingSectionId) => {
        if (cancelled) return;

        navigate(
          {
            pathname: location.pathname,
            search: stripNotificationParams(location.search),
          },
          { replace: true },
        );

        if (!workingSectionId) return;

        useSurfaceStore.getState().open(TASK_STEP_DETAIL_SURFACE_ID, {
          stepId: notifId as TaskStepId,
          taskId: notifTaskId as TaskId,
          workingSectionId,
        } satisfies TaskStepDetailSurfaceProps);
      })
      .catch((error: unknown) => {
        console.error("Failed to resolve notification task step link", error);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, markRead, navigate]);

  return null;
}
