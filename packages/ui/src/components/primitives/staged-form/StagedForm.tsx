import { AnimatePresence, m } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { ScrollVisibilityContext } from "../scroll-visibility/ScrollVisibilityContext";
import { useScrollVisibility } from "../scroll-visibility";
import { cn } from "@beyo/lib";

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
  footer,
  navigationMode = "sequential",
  stepStatusMap = {},
  direction = 1,
  className,
  children,
  "data-testid": testId,
}: StagedFormProps): React.JSX.Element {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineHeight, setTimelineHeight] = useState(0);
  const {
    scrollRef,
    isHidden: isCompact,
    reset,
    suspend,
  } = useScrollVisibility({
    threshold: 56,
    hysteresis: 8,
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const onScroll = () => {
      const nextIsScrolled = element.scrollTop > 0;

      if (isScrolledRef.current === nextIsScrolled) {
        return;
      }

      isScrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };

    element.addEventListener("scroll", onScroll, { passive: true });

    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }

    isScrolledRef.current = false;
    setIsScrolled(false);
    reset();
  }, [activeStepId, reset, scrollRef]);

  useLayoutEffect(() => {
    if (!timelineRef.current) {
      return;
    }

    setTimelineHeight(timelineRef.current.getBoundingClientRect().height);
  }, []);

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

  return (
    <StagedFormContext.Provider value={contextValue}>
      <div
        className={cn("relative flex h-full flex-col", className)}
        data-testid={testId}
      >
        <div ref={timelineRef} className="absolute inset-x-0 top-0 z-10">
          <StagedFormTimeline />
        </div>

        <ScrollVisibilityContext.Provider
          value={{ isHidden: isCompact, reset, suspend }}
        >
          <div
            ref={scrollRef}
            className="relative flex-1 overflow-x-hidden overflow-y-auto"
            data-testid="staged-form-scroll-container"
          >
            {/* h-10 -mb-10 keeps the sticky fade inside the scroll container without pushing content down. */}
            <m.div
              animate={{ opacity: isScrolled ? 1 : 0 }}
              className="pointer-events-none sticky top-0 z-20 h-10 -mb-10 bg-gradient-to-b from-background to-transparent [mask-image:linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
              initial={false}
              transition={{ duration: 0.15, ease: "easeOut" }}
            />

            <div style={{ paddingTop: timelineHeight }}>
              <AnimatePresence custom={direction} mode="wait">
                {getActiveStepChild(children, activeStepId)}
              </AnimatePresence>
            </div>
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
