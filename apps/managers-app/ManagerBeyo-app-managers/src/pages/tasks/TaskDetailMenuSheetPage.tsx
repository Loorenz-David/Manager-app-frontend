import { useEffect } from "react";
import { Pin, Trash2 } from "lucide-react";

import { ConfirmActionButton } from "@/components/primitives";
import { useDeleteTask } from "@/features/tasks/actions/use-delete-task";
import {
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  type PinNotificationsSlideSurfaceProps,
  type TaskActionsSurfaceProps,
} from "@/features/tasks/surfaces";
import { useSurface } from "@/hooks/use-surface";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

export function TaskDetailMenuSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { taskId, itemId } = useSurfaceProps<TaskActionsSurfaceProps>();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    header?.setTitle("Task actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground"
        data-testid="task-actions-pin-notifications"
        disabled={!taskId}
        onClick={() => {
          if (!taskId) return;

          surface.open(PIN_NOTIFICATIONS_SLIDE_SURFACE_ID, {
            taskId,
            itemId: itemId ?? null,
          } satisfies PinNotificationsSlideSurfaceProps);
        }}
      >
        <Pin className="size-4" />
        Pin notifications
      </button>
      <ConfirmActionButton
        backgroundColor="var(--color-card)"
        borderColor="var(--color-border)"
        className="w-full font-semibold py-3.5 text-left"
        confirmLabel="Tap again to delete"
        confirmTextColor="white"
        data-testid="task-delete-button"
        fillColor="var(--color-destructive)"
        icon={<Trash2 className="size-4 shrink-0" />}
        label="Delete task"
        textColor="var(--color-primary)"
        onConfirm={() => {
          if (!taskId) return;
          deleteTask.mutate(taskId, {
            onSuccess: () => {
              surface.close(TASK_ACTIONS_SHEET_SURFACE_ID);
              surface.close(TASK_DETAIL_SURFACE_ID);
            },
          });
        }}
      />
    </div>
  );
}
