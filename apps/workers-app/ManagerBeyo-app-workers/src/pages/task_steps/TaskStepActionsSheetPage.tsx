import { useEffect } from "react";
import { Pin } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  type PinNotificationsSlideSurfaceProps,
  type TaskStepActionsSheetSurfaceProps,
} from "@/features/task_steps/surface-ids";

export function TaskStepActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { stepId, taskId, itemId } =
    useSurfaceProps<TaskStepActionsSheetSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div
      className="flex flex-col gap-3 bg-background p-6"
      data-testid="task-step-actions-sheet"
    >
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
        data-testid="task-step-actions-pin-notifications"
        disabled={!taskId}
        onClick={() => {
          if (!taskId) {
            return;
          }

          surface.open(PIN_NOTIFICATIONS_SLIDE_SURFACE_ID, {
            taskId,
            itemId: itemId ?? null,
            originStepId: stepId,
          } satisfies PinNotificationsSlideSurfaceProps);
        }}
      >
        <Pin className="size-4" />
        Pin notifications
      </button>
    </div>
  );
}
