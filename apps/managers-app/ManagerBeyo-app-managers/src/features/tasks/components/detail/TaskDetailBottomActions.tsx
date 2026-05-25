import { useEffect, useState } from "react";
import { m } from "framer-motion";

import { durations, easings } from "@/lib/animation";
import { useSurfaceHeader } from "@/hooks/use-surface-header";

import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskDetailBottomActions(): React.JSX.Element {
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
    <>
      {shouldRenderAssignStages ? (
        <div className="pointer-events-none fixed bottom-[calc(var(--safe-bottom,0)+5.75rem)] left-0 right-0 z-10 px-4">
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
              className="w-full rounded-xl bg-[var(--color-primary)] px-5 py-3.5 text-center text-sm font-semibold text-[var(--color-card)] shadow-sm"
              data-testid="task-detail-assign-stages-button"
              type="button"
              onClick={openWorkingSectionsSlide}
            >
              Assign Stages
            </button>
          </m.div>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-3 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
        <button
          type="button"
          className="flex-1 rounded-xl bg-[var(--color-card)] py-3.5 text-sm font-semibold text-foreground shadow-sm"
          onClick={openEditTask}
        >
          Edit
        </button>
        <button
          className="flex-1 rounded-xl bg-[var(--color-primary)] py-3.5 text-sm font-semibold text-white shadow-sm"
          type="button"
          onClick={() => header?.requestClose()}
        >
          Close & Back
        </button>
      </div>
    </>
  );
}
