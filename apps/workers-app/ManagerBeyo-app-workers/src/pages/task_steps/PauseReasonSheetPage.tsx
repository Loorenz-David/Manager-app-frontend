import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { usePauseReasonsQuery, PauseReasonPicker, type PauseReason } from "@beyo/pause-reasons";
import { tabVariants, transitions } from "@beyo/lib";
import { useTransitionStepState } from "@/features/task_steps/actions/use-transition-step-state";
import type { PauseReasonSheetSurfaceProps } from "@/features/task_steps/surface-ids";
import { resolvePauseReasonTransition } from "@/features/task_steps/lib/pause-reason-transition";

function PauseReasonPickerSkeleton(): React.JSX.Element {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-2 gap-2"
      data-testid="pause-reason-loading"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          aria-hidden="true"
          className="skeleton-shimmer h-28 rounded-xl"
          key={index}
        />
      ))}
    </div>
  );
}

export function PauseReasonSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const { stepId, taskId, workingSectionId } =
    useSurfaceProps<PauseReasonSheetSurfaceProps>();
  const {
    data: pauseReasonsData,
    isPending: isReasonsPending,
    isError: isReasonsError,
  } = usePauseReasonsQuery({});
  const { transitionStepState, isPending: isTransitionPending } =
    useTransitionStepState();

  const [view, setView] = useState<0 | 1>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedReason, setSelectedReason] = useState<PauseReason | null>(
    null,
  );
  const [description, setDescription] = useState("");
  const [pickerViewHeightPx, setPickerViewHeightPx] = useState<number | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pickerViewRef = useRef<HTMLDivElement | null>(null);

  const resolvedStepId =
    stepId ?? ("" as PauseReasonSheetSurfaceProps["stepId"]);
  const resolvedTaskId =
    taskId ?? ("" as PauseReasonSheetSurfaceProps["taskId"]);
  const resolvedWorkingSectionId =
    workingSectionId ??
    ("" as PauseReasonSheetSurfaceProps["workingSectionId"]);
  const reasons = pauseReasonsData?.pause_reasons ?? [];

  useEffect(() => {
    header?.setTitle("Pause reason");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    const element = pickerViewRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      setPickerViewHeightPx(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [view]);

  function closeSheet() {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  function handleOptionSelect(reason: PauseReason) {
    if (isTransitionPending) {
      return;
    }

    setSelectedReason(reason);
    const transition = resolvePauseReasonTransition(reason);

    if (transition.requiresDescription) {
      setDescription("");
      setDirection(1);
      setView(1);
      return;
    }

    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: transition.newState,
      pause_reason_id: reason.client_id,
      working_section_id: resolvedWorkingSectionId,
    });
    closeSheet();
  }

  function handlePauseWithDescription() {
    const trimmedDescription = description.trim();
    if (
      isTransitionPending ||
      !selectedReason ||
      trimmedDescription.length === 0
    ) {
      return;
    }

    const transition = resolvePauseReasonTransition(selectedReason);
    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: transition.newState,
      pause_reason_id: selectedReason.client_id,
      description: trimmedDescription,
      working_section_id: resolvedWorkingSectionId,
    });
    closeSheet();
  }

  return (
    <div
      className="relative min-h-80 bg-background"
      data-testid="pause-reason-sheet"
      style={
        pickerViewHeightPx !== null
          ? { minHeight: `${pickerViewHeightPx}px` }
          : undefined
      }
    >
      <AnimatePresence custom={direction} initial={false} mode="wait">
        {view === 0 ? (
          <m.div
            key="pause-reason-picker-view"
            animate="center"
            className="px-4 pb-4 pt-2"
            custom={direction}
            exit="exit"
            initial="enter"
            ref={pickerViewRef}
            transition={transitions.tab}
            variants={tabVariants}
          >
            <div className="mb-3 text-sm font-medium text-foreground">
              Why are you pausing this task?
            </div>

            {isReasonsPending ? <PauseReasonPickerSkeleton /> : null}
            {!isReasonsPending && isReasonsError ? (
              <div
                className="rounded-xl border border-border p-4 text-sm text-muted-foreground"
                data-testid="pause-reason-error"
              >
                Pause reasons could not be loaded.
              </div>
            ) : null}
            {!isReasonsPending && !isReasonsError && reasons.length === 0 ? (
              <div
                className="rounded-xl border border-border p-4 text-sm text-muted-foreground"
                data-testid="pause-reason-empty"
              >
                No pause reasons are available.
              </div>
            ) : null}
            {!isReasonsPending && !isReasonsError && reasons.length > 0 ? (
              <PauseReasonPicker
                data-testid="pause-reason-picker"
                disabled={isTransitionPending}
                onSelect={handleOptionSelect}
                reasons={reasons}
              />
            ) : null}
          </m.div>
        ) : (
          <m.div
            key="pause-reason-description-view"
            animate="center"
            className="flex flex-col gap-3 px-4 pb-4 pt-2"
            custom={direction}
            exit="exit"
            initial="enter"
            transition={transitions.tab}
            variants={tabVariants}
            style={
              pickerViewHeightPx !== null
                ? { minHeight: `${pickerViewHeightPx}px` }
                : undefined
            }
            onAnimationComplete={() => {
              textareaRef.current?.focus();
            }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Back"
                className="rounded-lg border border-border p-2 text-foreground"
                data-testid="pause-reason-back-button"
                onClick={() => {
                  setDirection(-1);
                  setView(0);
                }}
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="text-sm font-medium text-muted-foreground">
                {selectedReason?.name ?? "Pause details"}
              </span>
            </div>

            <textarea
              ref={textareaRef}
              aria-label="Pause description"
              className="h-36 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:border-primary"
              data-testid="pause-reason-description-input"
              placeholder="Describe the reason..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <button
              type="button"
              className="mt-auto w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
              data-testid="pause-reason-submit-button"
              disabled={
                isTransitionPending || description.trim().length === 0
              }
              onClick={handlePauseWithDescription}
            >
              Pause task
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
