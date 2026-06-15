import { AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect } from "react";

import { ScrollVisibilityContext } from "../scroll-visibility/ScrollVisibilityContext";
import { useScrollVisibility } from "../scroll-visibility";
import { cn } from "@beyo/lib";

import { KeyboardAccessoryBar } from "../keyboard-accessory-bar";
import { StagedFormContext } from "./StagedFormContext";
import { StagedFormNavigation } from "./StagedFormNavigation";
import { StagedFormTimeline } from "./StagedFormTimeline";
import type { StagedFormProps } from "./staged-form.types";

function getActiveStepChild(
  children: React.ReactNode,
  activeStepId: string,
): React.ReactNode {
  return (
    Children.toArray(children).find(
      (child) =>
        isValidElement(child) &&
        (child as React.ReactElement<{ id: string }>).props.id === activeStepId,
    ) ?? null
  );
}

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
  footer,
  navigationMode = "sequential",
  stepStatusMap = {},
  direction = 1,
  className,
  children,
  "data-testid": testId,
}: StagedFormProps): React.JSX.Element {
  const {
    scrollRef,
    isHidden: isCompact,
    reset,
    suspend,
  } = useScrollVisibility({
    threshold: 50,
    hysteresis: 55,
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
    isFirstStep,
    isLastStep,
    isAdvancing,
    navigationMode,
    stepStatusMap,
    direction,
    isTimelineCompact: isCompact,
    onAdvance,
    onBack,
    onNavigate,
  } as const;

  const stepContent = (
    <AnimatePresence custom={direction} mode="wait">
      {getActiveStepChild(children, activeStepId)}
    </AnimatePresence>
  );

  return (
    <StagedFormContext.Provider value={contextValue}>
      <div
        className={cn("relative flex h-full flex-col", className)}
        data-testid={testId}
      >
        <div className="absolute inset-x-0 top-0 z-10">
          <StagedFormTimeline />
        </div>

        <ScrollVisibilityContext.Provider
          value={{ isHidden: isCompact, reset, suspend }}
        >
          <div
            ref={scrollRef}
            className={cn(
              "relative flex-1 overflow-x-hidden overflow-y-auto",
              STAGED_FORM_TIMELINE_OFFSET_CLASS,
              "pb-[calc(var(--safe-bottom)+var(--keyboard-inset))]",
            )}
            data-testid="staged-form-scroll-container"
          >
            {enableKeyboardAccessory ? (
              <KeyboardAccessoryBar>{stepContent}</KeyboardAccessoryBar>
            ) : (
              stepContent
            )}
          </div>

          {footer ? (
            <div className="relative z-10 shrink-0">{footer}</div>
          ) : showNavigation ? (
            <div className="relative z-10 shrink-0">
              <StagedFormNavigation />
            </div>
          ) : null}
        </ScrollVisibilityContext.Provider>
      </div>
    </StagedFormContext.Provider>
  );
}
