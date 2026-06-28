import { AnimatePresence } from "framer-motion";
import { Children, isValidElement, useCallback, useEffect, useRef, useState } from "react";

import { ScrollVisibilityContext } from "../scroll-visibility/ScrollVisibilityContext";
import { useScrollHide } from "../scroll-visibility";
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

const FOOTER_STYLE: React.CSSProperties = {
  transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

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
    hideProgressContainerRef,
    isHidden: isCompact,
    reset,
    suspend,
  } = useScrollHide();

  // Measure the absolute-positioned footer so the scroll container can pad itself.
  const footerObserverRef = useRef<ResizeObserver | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  const footerCallbackRef = useCallback((el: HTMLDivElement | null) => {
    footerObserverRef.current?.disconnect();
    footerObserverRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setFooterHeight(entry.contentRect.height);
    });
    observer.observe(el);
    footerObserverRef.current = observer;
  }, []);

  useEffect(() => {
    return () => {
      footerObserverRef.current?.disconnect();
    };
  }, []);

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

  const hasFooter = Boolean(footer) || showNavigation;

  return (
    <StagedFormContext.Provider value={contextValue}>
      <div
        ref={hideProgressContainerRef}
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
              "relative flex-1 overflow-x-hidden overflow-y-auto overscroll-y-none",
              STAGED_FORM_TIMELINE_OFFSET_CLASS,
            )}
            style={{
              paddingBottom: hasFooter
                ? `calc(${footerHeight}px + var(--safe-bottom, 0px) + var(--keyboard-inset, 0px))`
                : "calc(var(--safe-bottom, 0px) + var(--keyboard-inset, 0px))",
            }}
            data-testid="staged-form-scroll-container"
          >
            {enableKeyboardAccessory ? (
              <KeyboardAccessoryBar>{stepContent}</KeyboardAccessoryBar>
            ) : (
              stepContent
            )}
          </div>

          {footer ? (
            <div
              ref={footerCallbackRef}
              className={cn(
                "absolute bottom-0 left-0 right-0 z-10 will-change-transform",
                isCompact ? "pointer-events-none" : null,
              )}
              style={FOOTER_STYLE}
            >
              {footer}
            </div>
          ) : showNavigation ? (
            <div
              ref={footerCallbackRef}
              className={cn(
                "absolute bottom-0 left-0 right-0 z-10 will-change-transform",
                isCompact ? "pointer-events-none" : null,
              )}
              style={FOOTER_STYLE}
            >
              <StagedFormNavigation />
            </div>
          ) : null}
        </ScrollVisibilityContext.Provider>
      </div>
    </StagedFormContext.Provider>
  );
}
