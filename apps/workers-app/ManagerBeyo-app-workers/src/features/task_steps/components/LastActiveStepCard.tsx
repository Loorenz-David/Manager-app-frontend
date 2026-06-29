import { memo, useMemo } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Pause, Play } from "lucide-react";
import {
  ImageAnnotationSvgLayer,
  type ImageAnnotationViewModel,
} from "@beyo/images";
import {
  ImagePlaceholder,
  TickingTimer,
  useScrollVisibilityContext,
} from "@beyo/ui";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { cn } from "@beyo/lib";
import { usePreloadSurface } from "@beyo/hooks";
import { preloadPauseReasonSheetSurface } from "../surfaces";
import { transitions } from "@/lib/animation";
import { formatSecondsHHMMSS } from "../domain/formatSecondsHHMMSS";
import { getTaskTypeIcon, getTaskTypeLabel } from "../domain/task-type-meta";
import { useLastActiveStepCardContext } from "../providers/LastActiveStepCardProvider";
import {
  getBatchTransitionItems,
  STEP_QUICK_TRANSITION,
  type StepState,
  type TaskStepCardViewModel,
  type TaskStep,
} from "../types";

// ─── Single-step card subcomponents ──────────────────────────────────────────

type CardThumbnailProps = {
  stepId: TaskStepId;
  src: string | null;
  annotations: ImageAnnotationViewModel[];
  widthPx: number | null;
  heightPx: number | null;
  quantityPillLabel: string | null;
  onTap: () => void;
};

const CardThumbnail = memo(function CardThumbnail({
  stepId,
  src,
  annotations,
  widthPx,
  heightPx,
  quantityPillLabel,
  onTap,
}: CardThumbnailProps): React.JSX.Element {
  return (
    <button
      aria-label="View item image"
      className="relative aspect-square w-18 shrink-0 overflow-hidden rounded-tl-2xl bg-primary-foreground/10"
      data-testid={`last-active-card-image-${stepId}`}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onTap();
      }}
    >
      {src ? (
        <img
          alt=""
          className="size-full object-cover"
          decoding="async"
          draggable={false}
          loading="eager"
          src={src}
        />
      ) : (
        <ImagePlaceholder iconClassName="size-5 text-primary-foreground/50" />
      )}
      <ImageAnnotationSvgLayer
        annotations={annotations}
        coverMode
        heightPx={heightPx}
        widthPx={widthPx}
      />
      {quantityPillLabel ? (
        <span className="absolute bottom-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {quantityPillLabel}
        </span>
      ) : null}
    </button>
  );
});

type CardActionButtonProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  state: StepState;
  isTransitioning: boolean;
  onTransition: (
    stepId: TaskStepId,
    taskId: TaskId,
    nextState: StepState,
  ) => void;
};

function CardActionButton({
  stepId,
  taskId,
  state,
  isTransitioning,
  onTransition,
}: CardActionButtonProps): React.JSX.Element | null {
  const nextState = STEP_QUICK_TRANSITION[state];
  usePreloadSurface(preloadPauseReasonSheetSurface);

  if (nextState === undefined) {
    return null;
  }

  const isWorking = state === "working";
  const Icon = isWorking ? Pause : Play;
  const label = isWorking ? "Pause" : "Resume";

  return (
    <button
      aria-label={label}
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-opacity disabled:opacity-60"
      data-testid={`last-active-card-action-${stepId}`}
      disabled={isTransitioning}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onTransition(stepId, taskId, nextState);
      }}
    >
      <Icon
        aria-hidden="true"
        className="size-6 shrink-0 fill-current stroke-none"
      />
    </button>
  );
}

// ─── Batch card subcomponent ──────────────────────────────────────────────────

function buildBatchSubline(vms: TaskStepCardViewModel[]): string {
  const counts: Partial<Record<string, number>> = {};
  for (const vm of vms) {
    counts[vm.state] = (counts[vm.state] ?? 0) + 1;
  }
  const parts = Object.entries(counts).map(
    ([state, count]) => `${count} ${state.replace("_", " ")}`,
  );
  return parts.join(" · ");
}

type BatchCardProps = {
  batchSteps: TaskStep[];
  batchVms: TaskStepCardViewModel[];
  isBatchTransitioning: boolean;
  onTransition: (targetState: "working" | "paused") => void;
  onOpenDetail: () => void;
};

function BatchCard({
  batchSteps,
  batchVms,
  isBatchTransitioning,
  onTransition,
  onOpenDetail,
}: BatchCardProps): React.JSX.Element {
  const firstVm = batchVms[0];
  const sectionName = batchSteps[0]?.working_section_name_snapshot ?? "Active batch";

  const batchHasWorking = batchVms.some((vm) => vm.state === "working");
  const batchNextState: "working" | "paused" = batchHasWorking
    ? "paused"
    : "working";
  const BatchActionIcon = batchHasWorking ? Pause : Play;
  const batchActionLabel = batchHasWorking ? "Pause all" : "Resume all";

  const batchActionItems = getBatchTransitionItems(batchSteps, batchNextState);
  const isBatchActionDisabled =
    batchActionItems.length === 0 || isBatchTransitioning;

  const subline = useMemo(() => buildBatchSubline(batchVms), [batchVms]);

  const cardToneClass = batchHasWorking
    ? "bg-[var(--color-soft-container)] text-[var(--color-primary)]"
    : "bg-primary text-[var(--color-card)]";
  const cardBorderClass = batchHasWorking ? "border-border" : "border-light-border";

  return (
    <m.div
      key="last-active-batch-card"
      className={cn(
        "pointer-events-auto flex items-stretch overflow-hidden",
        "rounded-tl-2xl rounded-tr-2xl border shadow-md",
        cardToneClass,
        cardBorderClass,
      )}
      animate={{ opacity: 1, y: 0 }}
      data-testid="last-active-batch-card"
      exit={{ opacity: 0, y: 24 }}
      initial={{ opacity: 0, y: 24 }}
      role="button"
      tabIndex={0}
      transition={transitions.base}
      onClick={onOpenDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetail();
        }
      }}
    >
      {/* Thumbnail of first batch step */}
      {firstVm ? (
        <div className="relative aspect-square w-18 shrink-0 overflow-hidden rounded-tl-2xl bg-primary-foreground/10">
          {firstVm.firstImageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="eager"
              src={firstVm.firstImageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-5 text-primary-foreground/50" />
          )}
        </div>
      ) : null}

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-start px-3 py-3">
        <span
          className="truncate text-md font-semibold text-current"
          data-testid="last-active-batch-card-label"
        >
          {sectionName}
        </span>
        <span
          className="truncate text-sm capitalize text-current opacity-80"
          data-testid="last-active-batch-card-subline"
        >
          {subline}
        </span>
      </div>

      {/* Batch pause/resume action */}
      <div className="flex items-center gap-2 pr-6">
        <button
          aria-label={batchActionLabel}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-opacity disabled:opacity-60"
          data-testid="last-active-batch-card-action"
          disabled={isBatchActionDisabled}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTransition(batchNextState);
          }}
        >
          <BatchActionIcon
            aria-hidden="true"
            className="size-6 shrink-0 fill-current stroke-none"
          />
        </button>
      </div>
    </m.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const LastActiveStepCard = memo(function LastActiveStepCard({
  forceHidden = false,
}: {
  forceHidden?: boolean;
}): React.JSX.Element {
  const {
    step,
    vm,
    batchSteps,
    batchVms,
    isBatchCard,
    isBatchTransitioning,
    isTransitioning,
    handleTransition,
    handleBatchTransition,
    handleOpenDetail,
    handleOpenBatchDetail,
    handleOpenImageViewer,
  } = useLastActiveStepCardContext();
  const { isHidden } = useScrollVisibilityContext();

  const hasCard = isBatchCard
    ? batchVms.length > 0
    : Boolean(step && vm);
  const isWorking = vm?.state === "working";
  const TypeIcon = vm ? getTaskTypeIcon(vm.task.task_type) : null;
  const taskTypeLabel = vm ? getTaskTypeLabel(vm.task.task_type) : "";
  const cardToneClass =
    vm?.state === "working"
      ? "bg-[var(--color-soft-container)] text-[var(--color-primary)]"
      : vm?.state === "paused"
        ? "bg-primary text-[var(--color-card)]"
        : vm?.state === "completed"
          ? "bg-[var(--color-dark-pearl-green)] text-[var(--color-card)]"
          : "bg-primary text-[var(--color-card)]";
  const cardBorderClass =
    vm?.state === "working" ? "border-border" : "border-light-border";

  // Stable annotations ref to prevent CardThumbnail flicker on refetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableAnnotations = useMemo(
    () => vm?.firstImageAnnotations ?? [],
    [vm?.firstImageUrl],
  );

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-49 bottom-[calc(var(--safe-bottom,0)+3.75rem)] will-change-transform"
      style={{
        transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress, 0))",
        transition:
          "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
        display: forceHidden ? "none" : undefined,
      }}
      aria-hidden={isHidden || forceHidden}
    >
      <AnimatePresence initial={false}>
        {hasCard && isBatchCard && batchSteps && batchVms.length > 0 ? (
          <BatchCard
            batchSteps={batchSteps}
            batchVms={batchVms}
            isBatchTransitioning={isBatchTransitioning}
            onOpenDetail={handleOpenBatchDetail}
            onTransition={handleBatchTransition}
          />
        ) : hasCard && step && vm ? (
          <m.div
            key="last-active-step-card"
            className={cn(
              "pointer-events-auto flex items-stretch overflow-hidden",
              "rounded-tl-2xl rounded-tr-2xl border shadow-md",
              cardToneClass,
              cardBorderClass,
            )}
          animate={{ opacity: 1, y: 0 }}
          data-testid="last-active-step-card"
          exit={{ opacity: 0, y: 24 }}
          initial={{ opacity: 0, y: 24 }}
          role="button"
          tabIndex={0}
          transition={transitions.base}
          onClick={handleOpenDetail}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleOpenDetail();
            }
          }}
        >
          <CardThumbnail
            annotations={stableAnnotations}
            heightPx={vm.firstImageHeightPx}
            quantityPillLabel={vm.quantityPillLabel}
            src={vm.firstImageUrl}
            stepId={vm.stepId}
            widthPx={vm.firstImageWidthPx}
            onTap={handleOpenImageViewer}
          />

          <div className="flex min-w-0 flex-1 flex-col justify-start  px-3 py-3">
            <span
              className="truncate text-md font-semibold text-current"
              data-testid="last-active-card-label"
            >
              {vm.articleLabel}
            </span>
            <span
              className="truncate text-sm capitalize text-current opacity-80"
              data-testid="last-active-card-task-type"
            >
              <span className="inline-flex items-center gap-1.5">
                {TypeIcon ? (
                  <TypeIcon aria-hidden="true" className="size-3.5 shrink-0" />
                ) : null}
                <span className="truncate">{taskTypeLabel}</span>
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 pr-6">
            {isWorking && vm.lastStateRecord ? (
              <TickingTimer
                className="font-mono text-sm text-current opacity-80"
                data-testid="last-active-card-timer"
                offsetSeconds={vm.totalWorkingSeconds}
                startedAtIso={vm.lastStateRecord.entered_at}
              />
            ) : vm.state === "paused" || vm.state === "ended_shift" ? (
              <span
                className="font-mono text-sm text-current opacity-80"
                data-testid="last-active-card-timer"
              >
                {vm.totalWorkingSeconds > 0
                  ? formatSecondsHHMMSS(vm.totalWorkingSeconds)
                  : "—"}
              </span>
            ) : null}
            {vm.state === "completed" ? (
              <span
                className="inline-flex h-12 items-center justify-center rounded-full border border-card/30 bg-card/20 px-4 text-sm font-semibold text-card"
                data-testid="last-active-card-completed-pill"
              >
                Completed
              </span>
            ) : (
              <CardActionButton
                isTransitioning={isTransitioning}
                state={vm.state}
                stepId={vm.stepId}
                taskId={vm.taskId}
                onTransition={handleTransition}
              />
            )}
          </div>
        </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
