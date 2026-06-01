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
import { usePreloadSurface } from "@beyo/hooks";
import { preloadPauseReasonSheetSurface } from "../surfaces";
import { transitions } from "@/lib/animation";
import { cn } from "@beyo/lib";
import { getTaskTypeIcon, getTaskTypeLabel } from "../domain/task-type-meta";
import { useLastActiveStepCardContext } from "../providers/LastActiveStepCardProvider";
import { STEP_QUICK_TRANSITION, type StepState } from "../types";

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
      <Icon aria-hidden="true" className="size-6 shrink-0" />
    </button>
  );
}

export const LastActiveStepCard = memo(
  function LastActiveStepCard(): React.JSX.Element {
    const {
      step,
      vm,
      isTransitioning,
      handleTransition,
      handleOpenDetail,
      handleOpenImageViewer,
    } = useLastActiveStepCardContext();
    const { isHidden } = useScrollVisibilityContext();

    const hasCard = Boolean(step && vm);
    const isWorking = vm?.state === "working";
    const TypeIcon = vm ? getTaskTypeIcon(vm.task.task_type) : null;
    const taskTypeLabel = vm ? getTaskTypeLabel(vm.task.task_type) : "";

    // Annotations are tied to the image, not to step state. Keying on
    // firstImageUrl keeps the array reference stable across state transitions
    // and server refetches that return the same image, preventing CardThumbnail
    // from re-rendering and ImageAnnotationSvgLayer from flickering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stableAnnotations = useMemo(
      () => vm?.firstImageAnnotations ?? [],
      [vm?.firstImageUrl],
    );

    return (
      <AnimatePresence initial={false}>
        {hasCard && step && vm ? (
          <m.div
            key="last-active-step-card"
            className={cn(
              "fixed bottom-[60px] left-0 right-0 z-[49]",
              "flex items-stretch overflow-hidden",
              "rounded-tl-2xl rounded-tr-2xl bg-primary border border-[color:var(--color-light-border)] shadow-md",
              "transition-transform duration-200 ease-out",
              isHidden && "translate-y-full",
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
                className="truncate text-md font-semibold text-card"
                data-testid="last-active-card-label"
              >
                {vm.articleLabel}
              </span>
              <span
                className="truncate text-sm capitalize text-card/80"
                data-testid="last-active-card-task-type"
              >
                <span className="inline-flex items-center gap-1.5">
                  {TypeIcon ? (
                    <TypeIcon
                      aria-hidden="true"
                      className="size-3.5 shrink-0"
                    />
                  ) : null}
                  <span className="truncate">{taskTypeLabel}</span>
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 pr-6">
              {isWorking && vm.lastStateRecord ? (
                <TickingTimer
                  className="font-mono text-sm text-card/80"
                  data-testid="last-active-card-timer"
                  startedAtIso={vm.lastStateRecord.entered_at}
                />
              ) : null}
              <CardActionButton
                isTransitioning={isTransitioning}
                state={vm.state}
                stepId={vm.stepId}
                taskId={vm.taskId}
                onTransition={handleTransition}
              />
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    );
  },
);
