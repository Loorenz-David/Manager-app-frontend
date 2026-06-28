import { useEffect, useState } from "react";
import { m } from "framer-motion";

import { useSurfaceHeader } from "@beyo/hooks";
import { cn, durations, easings } from "@beyo/lib";

type TaskDetailBottomActionsProps = {
  isHidden?: boolean;
  shouldRenderAssignStages?: boolean;
  onEdit: () => void;
  onOpenWorkingSections: () => void;
};

export function TaskDetailBottomActions({
  isHidden = false,
  shouldRenderAssignStages = false,
  onEdit,
  onOpenWorkingSections,
}: TaskDetailBottomActionsProps): React.JSX.Element {
  const header = useSurfaceHeader();
  const [showAssignStagesCta, setShowAssignStagesCta] = useState(false);

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
        "fixed bottom-0 left-0 right-0 z-20 will-change-transform",
        isHidden ? "pointer-events-none" : null,
      )}
      style={{
        transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress, 0))",
        transition:
          "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
      }}
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
              onClick={onOpenWorkingSections}
            >
              Assign Stages
            </button>
          </m.div>
        </div>
      ) : null}

      <div
        className="bg-background shadow-[0_-1px_0_0_var(--color-border)]"
        data-testid="task-detail-bottom-actions"
      >
        <div className="flex gap-3 px-4 pb-4 pt-3">
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
            onClick={onEdit}
          >
            Edit
          </button>
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}
