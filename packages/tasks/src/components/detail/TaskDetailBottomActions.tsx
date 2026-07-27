import { useEffect, useState } from "react";
import { m } from "framer-motion";

import { cn, durations, easings } from "@beyo/lib";

type TaskDetailBottomActionsProps = {
  isHidden?: boolean;
  shouldRenderAssignStages?: boolean;
  onOpenWorkingSections: () => void;
};

/**
 * Floating Assign Stages call to action. There is no Close & Back bar: the
 * page is dismissed with the surface's slide-to-close gesture (and the
 * surface header's back arrow on desktop).
 */
export function TaskDetailBottomActions({
  isHidden = false,
  shouldRenderAssignStages = false,
  onOpenWorkingSections,
}: TaskDetailBottomActionsProps): React.JSX.Element | null {
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

  if (!shouldRenderAssignStages) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-20 will-change-transform",
        isHidden ? "pointer-events-none" : null,
      )}
      style={{
        transform: "translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress-footer, 0))",
        transition:
          "transform var(--scroll-snap-duration-footer, var(--scroll-snap-duration, 0ms)) ease-out, opacity var(--scroll-snap-duration-footer, var(--scroll-snap-duration, 0ms)) ease-out",
      }}
      data-testid="task-detail-bottom-actions"
    >
      <div className="pointer-events-none px-4 pb-[calc(var(--safe-bottom,0px)+0.75rem)]">
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
    </div>
  );
}
