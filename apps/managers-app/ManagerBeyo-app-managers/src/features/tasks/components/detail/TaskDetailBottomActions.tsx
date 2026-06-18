import { useEffect, useState } from "react";
import { m } from "framer-motion";

import { durations, easings } from "@/lib/animation";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { cn } from "@/lib/utils";

import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

type TaskDetailBottomActionsProps = {
  isHidden?: boolean;
};

export function TaskDetailBottomActions({
  isHidden = false,
}: TaskDetailBottomActionsProps): React.JSX.Element {
  const { openEditTask, openWorkingSectionsSlide, taskDetail } =
    useTaskDetailContext();
  const header = useSurfaceHeader();
  const [showAssignStagesCta, setShowAssignStagesCta] = useState(false);

  const shouldRenderAssignStages =
    taskDetail?.task.state === "pending" &&
    (taskDetail.task_steps.length ?? 0) === 0;

  useEffect(() => {
    if (!shouldRenderAssignStages) {
      setShowAssignStagesCta(false);
      return;
    }

    setShowAssignStagesCta(false);
    const timeout = window.setTimeout(() => {
      setShowAssignStagesCta(true);
    }, durations.slide * 1000);

    return () => window.clearTimeout(timeout);
  }, [shouldRenderAssignStages]);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isHidden ? "pointer-events-none translate-y-full" : "translate-y-0",
      )}
    >
      {shouldRenderAssignStages ? (
        <div className="pointer-events-none px-4 pb-3">
          <m.div
            animate={
              showAssignStagesCta ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }
            }
            className="pointer-events-auto"
            data-visible={showAssignStagesCta ? "true" : "false"}
            data-testid="task-detail-assign-stages-layer"
            initial={false}
            transition={{ duration: durations.slow, ease: easings.slideIn }}
          >
            <button
              className="w-full rounded-xl bg-(--color-primary) px-5 py-3.5 text-center text-md font-semibold text-card shadow-sm"
              data-testid="task-detail-assign-stages-button"
              type="button"
              onClick={openWorkingSectionsSlide}
            >
              Assign Stages
            </button>
          </m.div>
        </div>
      ) : null}

      <div
        className="flex gap-3 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]"
        data-testid="task-detail-bottom-actions"
      >
        <button
          className="flex-1 rounded-2xl bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm border border-between-border"
          type="button"
          onClick={() => header?.requestClose()}
        >
          Close & Back
        </button>
        <button
          type="button"
          className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm"
          onClick={openEditTask}
        >
          Edit
        </button>
      </div>
    </div>
  );
}
