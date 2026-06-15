import { Fragment, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

import { cn } from '@beyo/lib';

import { useStagedFormContext } from './StagedFormContext';
import type { StepStatus } from './staged-form.types';

function resolveStepStatus(
  stepId: string,
  activeStepId: string,
  stepStatusMap: Record<string, StepStatus>,
): StepStatus {
  if (stepId === activeStepId) return 'active';
  return stepStatusMap[stepId] ?? 'pending';
}

export function StagedFormTimeline(): React.JSX.Element {
  const {
    steps,
    activeStepId,
    navigationMode,
    stepStatusMap,
    onNavigate,
    isTimelineCompact,
  } = useStagedFormContext();
  const stepRefs = useRef<Record<string, HTMLElement | null>>({});
  const activeStepIndex = Math.max(0, steps.findIndex((s) => s.id === activeStepId));
  const progressPercent = steps.length > 1 ? (activeStepIndex / (steps.length - 1)) * 100 : 0;

  useEffect(() => {
    stepRefs.current[activeStepId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeStepId]);

  return (
    <div
      className="overflow-x-auto scrollbar-none"
      data-compact={isTimelineCompact ? 'true' : 'false'}
      data-testid="staged-form-timeline"
    >
      <div className="px-6">
        {/*
          grid-template-rows: 0fr -> 1fr is the CSS-native way to animate height: auto.
          The inner div needs overflow-hidden + min-h-0 so the grid cell can collapse fully.
          Both opacity and grid-template-rows run off the JS thread, with no per-frame JS work.
        */}
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
            isTimelineCompact ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center">
              {steps.map((step, index) => {
                const isActive = step.id === activeStepId;
                const resolvedStatus = resolveStepStatus(step.id, activeStepId, stepStatusMap);
                const isInteractive = navigationMode === 'free' && resolvedStatus !== 'locked';
                const showAlert = resolvedStatus === 'error' || resolvedStatus === 'warning';

                const labelContent = (
                  <span className="inline-flex items-center gap-1">
                    {showAlert && (
                      <AlertTriangle className="size-2.5 shrink-0 text-destructive" />
                    )}
                    <span
                      className={cn(
                        'text-xs',
                        isActive && 'font-semibold text-foreground',
                        !isActive && resolvedStatus === 'completed' && 'font-medium text-foreground',
                        !isActive &&
                          (resolvedStatus === 'pending' || resolvedStatus === 'locked') &&
                          'font-medium text-muted-foreground',
                        showAlert && 'font-medium text-destructive',
                      )}
                      data-testid={`staged-form-step-${step.id}-label`}
                    >
                      {step.title}
                    </span>
                  </span>
                );

                const sharedProps = {
                  'aria-current': isActive ? ('step' as const) : undefined,
                  'data-status': resolvedStatus,
                  'data-testid': `staged-form-step-${step.id}-indicator`,
                } as const;

                return (
                  <Fragment key={step.id}>
                    {index > 0 && (
                      <div className="flex flex-1 items-center justify-center">
                        <span className="text-sm text-icon">›</span>
                      </div>
                    )}
                    <div className="shrink-0">
                      {isInteractive ? (
                        <button
                          {...sharedProps}
                          ref={(node) => {
                            stepRefs.current[step.id] = node;
                          }}
                          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                          type="button"
                          onClick={() => onNavigate(step.id)}
                        >
                          {labelContent}
                        </button>
                      ) : (
                        <div
                          {...sharedProps}
                          ref={(node) => {
                            stepRefs.current[step.id] = node;
                          }}
                        >
                          {labelContent}
                        </div>
                      )}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'relative h-0.5 w-full overflow-hidden rounded-full bg-border',
            'transition-[margin-top] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
            isTimelineCompact ? 'mt-0' : 'mt-3',
          )}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
