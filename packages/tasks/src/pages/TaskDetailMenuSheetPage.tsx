import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ConfirmActionButton, useSurfaceStore } from "@beyo/ui";
import { Barcode, Pin, Replace, Trash2 } from "lucide-react";

import { useDeleteTask } from "../actions/use-delete-task";
import {
  ITEM_IDENTITY_SHEET_SURFACE_ID,
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_TYPE_SHEET_SURFACE_ID,
  type ItemIdentitySurfaceProps,
  type PinNotificationsSlideSurfaceProps,
  type TaskActionsSurfaceProps,
  type TaskTypeSheetSurfaceProps,
} from "../surface-ids";

export function TaskDetailMenuSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemId } = useSurfaceProps<TaskActionsSurfaceProps>();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    header?.setTitle("Task actions");
    header?.setActions(null);
  }, [header]);

  // This menu is a launcher, not a stop on the way back: the destination opens
  // on top immediately while the menu plays its own dismiss animation
  // underneath, so closing the destination returns to the task detail.
  function openAndDismiss(
    surfaceId: string,
    props: Record<string, unknown>,
  ): void {
    useSurfaceStore.getState().open(surfaceId, props);
    header?.requestClose();
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground"
        data-testid="task-actions-pin-notifications"
        disabled={!taskId}
        onClick={() => {
          if (!taskId) return;

          openAndDismiss(PIN_NOTIFICATIONS_SLIDE_SURFACE_ID, {
            taskId,
            itemId: itemId ?? null,
          } satisfies PinNotificationsSlideSurfaceProps);
        }}
      >
        <Pin className="size-4" />
        Pin notifications
      </button>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground"
        data-testid="task-actions-change-task-type"
        disabled={!taskId}
        onClick={() => {
          if (!taskId) return;

          openAndDismiss(TASK_TYPE_SHEET_SURFACE_ID, {
            taskId,
          } satisfies TaskTypeSheetSurfaceProps);
        }}
      >
        <Replace className="size-4" />
        Change task type
      </button>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground"
        data-testid="task-actions-change-item-identity"
        disabled={!taskId || !itemId}
        onClick={() => {
          if (!taskId || !itemId) return;

          openAndDismiss(ITEM_IDENTITY_SHEET_SURFACE_ID, {
            taskId,
            itemId,
          } satisfies ItemIdentitySurfaceProps);
        }}
      >
        <Barcode className="size-4" />
        Change article number
      </button>
      <ConfirmActionButton
        backgroundColor="var(--color-card)"
        borderColor="var(--color-border)"
        className="w-full py-3.5 text-left font-semibold"
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
              useSurfaceStore
                .getState()
                .close(TASK_ACTIONS_SHEET_SURFACE_ID);
              useSurfaceStore.getState().close(TASK_DETAIL_SURFACE_ID);
            },
          });
        }}
      />
    </div>
  );
}
