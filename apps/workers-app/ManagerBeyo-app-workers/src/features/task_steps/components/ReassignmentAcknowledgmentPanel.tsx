import { memo, useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Check } from "lucide-react";
import {
  ImageAnnotationSvgLayer,
  type ImageAnnotationViewModel,
} from "@beyo/images";
import { BackendImage, ImagePlaceholder, useScrollVisibilityContext } from "@beyo/ui";
import type { TaskStepId } from "@beyo/lib";
import { transitions } from "@/lib/animation";
import { useReassignmentAcknowledgmentsContext } from "../providers/ReassignmentAcknowledgmentsProvider";
import type { ReassignmentAckViewModel, ReassignmentStep } from "../types";

// Fixed, uniform row height — the three-row cap and framer height-collapse both depend on it.
const ROW_HEIGHT_PX = 72;

type RowProps = {
  vm: ReassignmentAckViewModel;
  isAcknowledging: boolean;
  onAcknowledge: (stepId: TaskStepId) => void;
  onOpenDetail: (step: ReassignmentStep) => void;
  onOpenImage: (step: ReassignmentStep) => void;
};

const ReassignmentAckRow = memo(function ReassignmentAckRow({
  vm,
  isAcknowledging,
  onAcknowledge,
  onOpenDetail,
  onOpenImage,
}: RowProps): React.JSX.Element {
  const annotations: ImageAnnotationViewModel[] = vm.firstImageAnnotations;

  return (
    <m.div
      key={vm.stepId}
      animate={{ opacity: 1, height: ROW_HEIGHT_PX }}
      exit={{ opacity: 0, height: 0 }}
      initial={{ opacity: 0, height: 0 }}
      transition={transitions.base}
      className="overflow-hidden border-t border-card/15 first:border-t-0"
    >
      <div
        className="flex h-18 items-stretch"
        data-testid={`reassignment-ack-row-${vm.stepId}`}
        role="button"
        tabIndex={0}
        onClick={() => onOpenDetail(vm.step)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetail(vm.step);
          }
        }}
      >
        {/* Item image — opens the full image viewer */}
        <button
          aria-label="View item image"
          className="relative aspect-square h-full shrink-0 overflow-hidden bg-primary-foreground/10"
          data-testid={`reassignment-ack-row-${vm.stepId}-image`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenImage(vm.step);
          }}
        >
          <BackendImage
            className="size-full object-cover"
            fallback={
              <ImagePlaceholder iconClassName="size-5 text-primary-foreground/50" />
            }
            loading="eager"
            src={vm.firstImageUrl}
          />
          <ImageAnnotationSvgLayer
            annotations={annotations}
            coverMode
            heightPx={vm.firstImageHeightPx}
            widthPx={vm.firstImageWidthPx}
          />
          {vm.quantityPillLabel ? (
            <span className="absolute bottom-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {vm.quantityPillLabel}
            </span>
          ) : null}
        </button>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3">
          <span
            className="truncate text-md font-semibold text-current"
            data-testid={`reassignment-ack-row-${vm.stepId}-label`}
          >
            {vm.articleLabel}
          </span>
          <span
            className="truncate text-sm text-current opacity-80"
            data-testid={`reassignment-ack-row-${vm.stepId}-reason`}
          >
            {vm.reason ?? "Reassigned to you"}
          </span>
        </div>

        {/* Acknowledge */}
        <div className="flex items-center pr-3">
          <button
            aria-label="Acknowledge"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-opacity disabled:opacity-60"
            data-testid={`reassignment-ack-row-${vm.stepId}-acknowledge`}
            disabled={isAcknowledging}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAcknowledge(vm.stepId);
            }}
          >
            <Check aria-hidden="true" className="size-5 shrink-0" />
          </button>
        </div>
      </div>
    </m.div>
  );
});

export const ReassignmentAcknowledgmentPanel = memo(
  function ReassignmentAcknowledgmentPanel({
    forceHidden = false,
  }: {
    forceHidden?: boolean;
  }): React.JSX.Element | null {
    const {
      vms,
      count,
      hasCards,
      isAcknowledging,
      pendingStepIds,
      acknowledge,
      acknowledgeAll,
      markVisibleSeen,
      handleOpenDetail,
      handleOpenImageViewer,
    } = useReassignmentAcknowledgmentsContext();
    const { isHidden } = useScrollVisibilityContext();

    // Passive read receipt: fire /seen for unseen obligations once the panel is truly visible.
    useEffect(() => {
      if (hasCards && !forceHidden && !isHidden) {
        markVisibleSeen();
      }
    }, [hasCards, forceHidden, isHidden, markVisibleSeen]);

    if (!hasCards) {
      return null;
    }

    return (
      <div
        className="pointer-events-none fixed left-2 right-2 z-49 bottom-[calc(var(--safe-bottom,0)+3.75rem+5.5rem)] will-change-[transform,opacity]"
        style={{
          transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
          opacity: "calc(1 - var(--scroll-hide-progress, 0))",
          transition:
            "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
          display: forceHidden ? "none" : undefined,
          ["--ack-row-height" as string]: `${ROW_HEIGHT_PX}px`,
        }}
        aria-hidden={isHidden || forceHidden}
        data-testid="reassignment-ack-panel"
      >
        <div className="pointer-events-auto overflow-hidden rounded-2xl border border-light-border bg-[#374B6F] text-card shadow-md">
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2.5"
            data-testid="reassignment-ack-panel-header"
          >
            <div className="flex items-center gap-2">
              {count > 1 ? (
                <span
                  aria-label={`${count} reassignments`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-[#374B6F]"
                  data-testid="reassignment-ack-panel-count"
                >
                  {count}
                </span>
              ) : null}
              <span className="text-xs font-semibold uppercase tracking-wide text-current opacity-70">
                Reassignments
              </span>
            </div>
            {count > 1 ? (
              <button
                className="text-sm font-semibold text-current transition-opacity disabled:opacity-60"
                data-testid="reassignment-ack-panel-acknowledge-all"
                disabled={isAcknowledging}
                type="button"
                onClick={acknowledgeAll}
              >
                Acknowledge all
              </button>
            ) : null}
          </div>

          {/* Scrollable row list — capped at three rows */}
          <div className="max-h-[calc(3*var(--ack-row-height))] overflow-y-auto overscroll-y-contain">
            <AnimatePresence initial={false}>
              {vms.map((vm) => (
                <ReassignmentAckRow
                  key={vm.stepId}
                  isAcknowledging={
                    isAcknowledging && (pendingStepIds?.has(vm.stepId) ?? false)
                  }
                  vm={vm}
                  onAcknowledge={acknowledge}
                  onOpenDetail={handleOpenDetail}
                  onOpenImage={handleOpenImageViewer}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  },
);
