import { Fragment, useEffect, useRef } from "react";
import { AlertTriangle, Check } from "lucide-react";

import { cn } from "@beyo/lib";

import { useStagedFormContext } from "./StagedFormContext";
import {
  connectorVariants,
  stepIndicatorVariants,
  stepLabelVariants,
} from "./staged-form.variants";
import type { StepStatus } from "./staged-form.types";

/**
 * Titles longer than this are dropped from the timeline — the step keeps its
 * numbered badge only, so a wordy title can never squeeze the row.
 */
const MAX_TIMELINE_LABEL_CHARS = 12;

function resolveStepStatus(
  step: { id: string; index: number },
  activeIndex: number,
  stepStatusMap: Record<string, StepStatus>,
): StepStatus {
  if (step.index === activeIndex) return "active";
  // An explicit status always wins; otherwise position decides — everything
  // behind the active step has been passed through, so it reads as done. That
  // keeps a step from blinking back to pending during the optimistic window
  // between a drag committing and the consumer marking it completed.
  return (
    stepStatusMap[step.id] ??
    (step.index < activeIndex ? "completed" : "pending")
  );
}

export function StagedFormTimeline(): React.JSX.Element {
  const {
    steps,
    timelineStepId,
    navigationMode,
    stepStatusMap,
    onNavigate,
    isTimelineCompact,
    isTimelineStatic,
  } = useStagedFormContext();
  const stepRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeStepIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === timelineStepId),
  );
  const compact = !isTimelineStatic && isTimelineCompact;

  // Centers the active chip by scrolling the timeline's own horizontal
  // scroller directly — never scrollIntoView, which also scrolls every
  // scrollable ANCESTOR to bring the chip into view. The timeline sits at the
  // top of the form's shared vertical scroll container, so on a scrolled-down
  // step, scrollIntoView smooth-scrolled the whole form back to the top the
  // instant a drag committed — the visible "content scrolls up" glitch during
  // step transitions.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const chip = stepRefs.current[timelineStepId];
    if (!scroller || !chip) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    const chipLeftInContent =
      chipRect.left - scrollerRect.left + scroller.scrollLeft;
    scroller.scrollTo({
      left: chipLeftInContent - (scroller.clientWidth - chipRect.width) / 2,
      behavior: "smooth",
    });
  }, [timelineStepId]);

  return (
    <div
      ref={scrollerRef}
      className="overflow-x-auto scroll-px-6 scrollbar-none"
      data-compact={compact ? "true" : "false"}
      data-testid="staged-form-timeline"
      style={
        isTimelineStatic
          ? undefined
          : {
              opacity: "calc(1 - var(--scroll-hide-progress, 0))",
              transform:
                "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
              transition:
                "opacity var(--scroll-snap-duration, 0ms) ease-out, transform var(--scroll-snap-duration, 0ms) ease-out",
            }
      }
    >
      {/* The timeline is a full-bleed header affordance. Step panes own their
          content padding; adding it here makes the horizontally scrolled row
          get clipped before it reaches the panel edges. */}
      <div className="w-full">
        {/*
          grid-template-rows: 0fr -> 1fr is the CSS-native way to animate height: auto.
          The inner div needs overflow-hidden + min-h-0 so the grid cell can collapse fully.
          Opacity is driven by --scroll-hide-progress on the outer div instead.
        */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
            compact ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center py-1">
              <span aria-hidden="true" className="w-6 shrink-0" />
              {steps.map((step, index) => {
                const isActive = index === activeStepIndex;
                const resolvedStatus = resolveStepStatus(
                  { id: step.id, index },
                  activeStepIndex,
                  stepStatusMap,
                );
                const isInteractive =
                  navigationMode === "free" && resolvedStatus !== "locked";
                const showAlert =
                  resolvedStatus === "error" || resolvedStatus === "warning";
                const showLabel = step.title.length <= MAX_TIMELINE_LABEL_CHARS;

                const badgeContent = showAlert ? (
                  <AlertTriangle className="size-3.5" />
                ) : resolvedStatus === "completed" ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : (
                  index + 1
                );

                const stepContent = (
                  <>
                    <span
                      className={stepIndicatorVariants({
                        status: resolvedStatus,
                        interactive: isInteractive,
                      })}
                    >
                      {badgeContent}
                    </span>
                    {showLabel ? (
                      <span
                        className={stepLabelVariants({
                          status: resolvedStatus,
                        })}
                        data-testid={`staged-form-step-${step.id}-label`}
                      >
                        {step.title}
                      </span>
                    ) : (
                      <span className="sr-only">{step.title}</span>
                    )}
                  </>
                );

                const sharedProps = {
                  "aria-current": isActive ? ("step" as const) : undefined,
                  "data-status": resolvedStatus,
                  "data-testid": `staged-form-step-${step.id}-indicator`,
                  className: cn(
                    "flex shrink-0 items-center rounded-full",
                    showLabel && "gap-2 pr-1",
                  ),
                  title: showLabel ? undefined : step.title,
                } as const;

                return (
                  <Fragment key={step.id}>
                    {index > 0 && (
                      <div
                        className="mx-2 h-0.5 min-w-3 flex-1 overflow-hidden rounded-full bg-border"
                        data-testid={`staged-form-connector-${step.id}`}
                      >
                        <div
                          className={connectorVariants({
                            filled: index <= activeStepIndex,
                          })}
                        />
                      </div>
                    )}
                    {isInteractive ? (
                      <button
                        {...sharedProps}
                        ref={(node) => {
                          stepRefs.current[step.id] = node;
                        }}
                        className={cn(
                          sharedProps.className,
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                        )}
                        type="button"
                        onClick={() => onNavigate(step.id)}
                      >
                        {stepContent}
                      </button>
                    ) : (
                      <div
                        {...sharedProps}
                        ref={(node) => {
                          stepRefs.current[step.id] = node;
                        }}
                      >
                        {stepContent}
                      </div>
                    )}
                  </Fragment>
                );
              })}
              <span aria-hidden="true" className="w-6 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
