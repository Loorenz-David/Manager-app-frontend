import { useEffect, useMemo } from "react";
import { Pin, RotateCcw } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
  TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID,
  type TaskWorkingSectionsReassignSlideSurfaceProps,
  type TaskWorkingSectionsSurfaceOpeners,
} from "@beyo/task-working-sections";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
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
  const workingSectionSurfaceOpeners =
    useMemo<TaskWorkingSectionsSurfaceOpeners>(
      () => ({
        closeSlide: () =>
          useSurfaceStore
            .getState()
            .close(TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID),
        closeDiscardSheet: () =>
          useSurfaceStore
            .getState()
            .close(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID),
        openDiscardChangesSheet: (props) =>
          surface.open(TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID, props),
        reopenSlideAfterError: (props) =>
          useSurfaceStore.getState().open(
            TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID,
            {
              ...props,
              hideShortcuts: false,
            } satisfies TaskWorkingSectionsReassignSlideSurfaceProps,
          ),
      }),
      [surface],
    );

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
        data-testid="task-step-actions-reassign-section"
        disabled={!taskId}
        onClick={() => {
          if (!taskId) {
            return;
          }

          surface.open(TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID, {
            taskId,
            hideShortcuts: false,
            surfaceOpeners: workingSectionSurfaceOpeners,
          } satisfies TaskWorkingSectionsReassignSlideSurfaceProps);
        }}
      >
        <RotateCcw className="size-4" />
        Re-assign section
      </button>

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
