import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { ArchiveRestore } from "lucide-react";

import { cn, durations, easings } from "@beyo/lib";

type TaskDetailBottomActionsProps = {
  isHidden?: boolean;
  shouldRenderAssignStages?: boolean;
  onOpenWorkingSections: () => void;
  /** A deleted task's only action; takes the place of Assign Stages. */
  shouldRenderRestore?: boolean;
  isRestorePending?: boolean;
  onRestore?: () => void;
};

/**
 * Floating call to action: Restore task for a deleted task, otherwise Assign
 * Stages. There is no Close & Back bar: the page is dismissed with the
 * surface's slide-to-close gesture (and the surface header's back arrow on
 * desktop).
 */
export function TaskDetailBottomActions({
  isHidden = false,
  shouldRenderAssignStages = false,
  onOpenWorkingSections,
  shouldRenderRestore = false,
  isRestorePending = false,
  onRestore,
}: TaskDetailBottomActionsProps): React.JSX.Element | null {
  const cta = shouldRenderRestore
    ? "restore"
    : shouldRenderAssignStages
      ? "assign-stages"
      : null;
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    if (!cta) {
      setShowCta(false);
      return;
    }

    setShowCta(false);
    const timeout = window.setTimeout(() => {
      setShowCta(true);
    }, durations.slide * 1000);

    return () => window.clearTimeout(timeout);
  }, [cta]);

  if (!cta) {
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
          animate={showCta ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          className="pointer-events-auto"
          data-visible={showCta ? "true" : "false"}
          data-testid={`task-detail-${cta}-layer`}
          initial={false}
          transition={{ duration: durations.slow, ease: easings.slideIn }}
        >
          {cta === "restore" ? (
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-primary) px-5 py-3.5 text-center text-md font-semibold text-card shadow-sm disabled:opacity-60"
              data-testid="task-detail-restore-button"
              disabled={isRestorePending}
              type="button"
              onClick={onRestore}
            >
              <ArchiveRestore className="size-5 shrink-0" />
              {isRestorePending ? "Restoring..." : "Restore task"}
            </button>
          ) : (
            <button
              className="w-full rounded-xl bg-(--color-primary) px-5 py-3.5 text-center text-md font-semibold text-card shadow-sm"
              data-testid="task-detail-assign-stages-button"
              type="button"
              onClick={onOpenWorkingSections}
            >
              Assign Stages
            </button>
          )}
        </m.div>
      </div>
    </div>
  );
}
