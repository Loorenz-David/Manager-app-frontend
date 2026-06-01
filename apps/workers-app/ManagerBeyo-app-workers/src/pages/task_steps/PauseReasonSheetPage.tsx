import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { tabVariants, transitions } from "@beyo/lib";
import { BoxPicker, type BoxPickerOptionType } from "@beyo/ui";
import { useTransitionStepState } from "@/features/task_steps/actions/use-transition-step-state";
import type { PauseReasonSheetSurfaceProps } from "@/features/task_steps/surface-ids";
import type { StepTransitionReason } from "@/features/task_steps/types";

const PAUSE_REASON_OPTIONS: BoxPickerOptionType<StepTransitionReason>[] = [
  {
    value: "waiting_for_upholstery",
    label: "Waiting upholstery",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/case_types/no_fabric.webp",
    imageClassName: "size-14",
  },
  {
    value: "pause_lunch_break",
    label: "Lunch break",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/pause_reasons/lunch_break.webp",
    imageClassName: "size-14",
  },
  {
    value: "pause_coffee_break",
    label: "Coffee break",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/pause_reasons/coffee_break.webp",
    imageClassName: "size-14",
  },
  {
    value: "pause_ended_shift",
    label: "Ended shift",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/pause_reasons/ended_shift.webp",
    imageClassName: "size-14",
  },
  {
    value: "pause_meeting",
    label: "Meeting",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/pause_reasons/meeting.webp",
    imageClassName: "size-14",
  },
  {
    value: "pause_other_task_priority",
    label: "Other task",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/pause_reasons/other_task_priority.webp",
    imageClassName: "size-14",
  },
];

export function PauseReasonSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const { stepId, taskId, workingSectionId } =
    useSurfaceProps<PauseReasonSheetSurfaceProps>();
  const { transitionStepState, isPending } = useTransitionStepState();

  const [view, setView] = useState<0 | 1>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [otherDescription, setOtherDescription] = useState("");
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

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [view]);

  function closeSheet() {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  function handleOptionSelect(reason: StepTransitionReason) {
    if (isPending) {
      return;
    }

    if (reason === "pause_other_task_priority") {
      setDirection(1);
      setView(1);
      return;
    }

    const newState = reason === "pause_ended_shift" ? "ended_shift" : "paused";

    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: newState,
      reason,
      working_section_id: resolvedWorkingSectionId,
    });
    closeSheet();
  }

  function handlePauseWithDescription() {
    if (isPending) {
      return;
    }

    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: "paused",
      reason: "pause_other_task_priority",
      description: otherDescription.trim() || undefined,
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

            <div
              className={
                isPending ? "pointer-events-none opacity-60" : undefined
              }
            >
              <BoxPicker
                columns={2}
                data-testid="pause-reason-picker"
                mode="single"
                onValueChange={handleOptionSelect}
                options={PAUSE_REASON_OPTIONS}
                value={null}
              />
            </div>
          </m.div>
        ) : (
          <m.div
            key="pause-reason-other-view"
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
                Other task details
              </span>
            </div>

            <textarea
              ref={textareaRef}
              className="h-36 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:border-primary"
              data-testid="pause-reason-description-input"
              placeholder="Describe the reason..."
              value={otherDescription}
              onChange={(event) => {
                setOtherDescription(event.target.value);
              }}
            />

            <button
              type="button"
              className="mt-auto w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
              data-testid="pause-reason-submit-button"
              disabled={isPending}
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
