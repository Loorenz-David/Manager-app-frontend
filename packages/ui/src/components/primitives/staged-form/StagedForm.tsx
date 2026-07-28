import { Children, cloneElement, isValidElement, useEffect } from "react";

import { ScrollVisibilityContext } from "../scroll-visibility/ScrollVisibilityContext";
import { useScrollHide } from "../scroll-visibility";
import { cn } from "@beyo/lib";

import { KeyboardAccessoryBar } from "../keyboard-accessory-bar";
import { SlideStack, useCommittedPaneId } from "../slide-stack";
import { StagedFormContext } from "./StagedFormContext";
import { StagedFormNavigation } from "./StagedFormNavigation";
import type { StagedFormStepProps } from "./StagedFormStep";
import { StagedFormTimeline } from "./StagedFormTimeline";
import type { StagedFormProps } from "./staged-form.types";

const STAGED_FORM_TIMELINE_OFFSET_CLASS = "pt-14";

export function StagedForm({
  steps,
  activeStepId,
  onAdvance,
  onBack,
  onNavigate,
  isFirstStep,
  isLastStep,
  isAdvancing = false,
  showNavigation = true,
  enableKeyboardAccessory = false,
  header,
  footer,
  navigationMode = "sequential",
  stepStatusMap = {},
  canAdvance,
  canBack,
  direction = 1,
  className,
  children,
  "data-testid": testId,
}: StagedFormProps): React.JSX.Element {
  const hasHeader = Boolean(header);
  const hasFooter = Boolean(footer) || showNavigation;
  const stepIds = steps.map((step) => step.id);

  // Scroll-hide drives only the timeline's compact state. Each footer lives
  // inside its slide pane and needs no separate visibility tracking.
  const {
    scrollRef,
    hideProgressContainerRef,
    isHidden: isCompact,
    reset,
    suspend,
  } = useScrollHide();

  // A committed drag only navigates once its settle animation finishes, so
  // chrome painted from activeStepId would trail the gesture by a whole
  // transition. The stack signals the visual commit at release instead.
  const { paneId: timelineStepId, onCommit: handleDragCommit } =
    useCommittedPaneId({
      activeId: activeStepId,
      paneIds: stepIds,
    });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }

    reset();
  }, [activeStepId, reset, scrollRef]);

  const contextValue = {
    steps,
    activeStepId,
    timelineStepId,
    isFirstStep,
    isLastStep,
    isAdvancing,
    navigationMode,
    stepStatusMap,
    direction,
    isTimelineCompact: isCompact,
    isTimelineStatic: hasHeader,
    onAdvance,
    onBack,
    onNavigate,
  } as const;

  const stepPanes = Children.map(children, (child) => {
    if (!isValidElement<StagedFormStepProps>(child)) {
      return child;
    }

    const stepId = child.props.id;
    const stepIndex = stepIds.indexOf(stepId);
    const stepIsFirst = stepIndex === 0;
    const stepIsLast = stepIndex === stepIds.length - 1;
    const stepContextValue = {
      ...contextValue,
      activeStepId: stepId,
      timelineStepId: stepId,
      isFirstStep: stepIsFirst,
      isLastStep: stepIsLast,
    };
    const stepFooter =
      typeof footer === "function"
        ? footer({
            stepId,
            isFirstStep: stepIsFirst,
            isLastStep: stepIsLast,
          })
        : footer ?? <StagedFormNavigation />;

    return cloneElement(child, {
      footer: hasFooter ? (
        <StagedFormContext.Provider value={stepContextValue}>
          {stepFooter}
        </StagedFormContext.Provider>
      ) : undefined,
    });
  });

  const stepContent = (
    <SlideStack
      activeId={activeStepId}
      animateInitial
      direction={direction}
      canBack={canBack}
      canForward={canAdvance}
      onBack={onBack}
      // Forward drag advances like the Next button (consumer validation runs
      // inside onAdvance); paused while an advance is already in flight.
      onForward={isAdvancing ? undefined : onAdvance}
      onCommit={handleDragCommit}
    >
      {stepPanes}
    </SlideStack>
  );

  return (
    <StagedFormContext.Provider value={contextValue}>
      <div
        ref={hideProgressContainerRef}
        className={cn(
          "relative flex h-full flex-col overflow-hidden",
          className,
        )}
        data-testid={testId}
      >
        {!hasHeader ? (
          <div className="absolute inset-x-0 top-0 z-10">
            <StagedFormTimeline />
          </div>
        ) : null}

        <ScrollVisibilityContext.Provider
          value={{ isHidden: false, reset, suspend }}
        >
          <div
            ref={scrollRef}
            className={cn(
              "relative flex-1 overflow-x-hidden overflow-y-auto overscroll-y-none",
              hasHeader ? null : STAGED_FORM_TIMELINE_OFFSET_CLASS,
            )}
            style={{
              // The footer node carries its own safe-bottom spacer, so only
              // the keyboard inset is padded here when a footer renders.
              paddingBottom: hasFooter
                ? "var(--keyboard-inset, 0px)"
                : "calc(var(--safe-bottom, 0px) + var(--keyboard-inset, 0px))",
            }}
            data-testid="staged-form-scroll-container"
          >
            {/* min-h-full + mt-auto keep the footer at the screen bottom even
             * when a step is shorter than the viewport. */}
            <div className="flex min-h-full flex-col">
              {hasHeader ? (
                <>
                  {header}
                  <StagedFormTimeline />
                </>
              ) : null}
              {/* The accessory bar's wrapper must stay a growing flex column:
               * the step pane fills it, and an opaque full-height pane is what
               * hides the outgoing (popLayout-absolute) step during a
               * transition. An auto-height wrapper leaves a gap below a short
               * step through which the previous, longer step shows. */}
              {enableKeyboardAccessory ? (
                <KeyboardAccessoryBar containerClassName="flex grow flex-col">
                  {stepContent}
                </KeyboardAccessoryBar>
              ) : (
                stepContent
              )}
            </div>
          </div>
        </ScrollVisibilityContext.Provider>
      </div>
    </StagedFormContext.Provider>
  );
}
