import type { ReactNode } from 'react';

import type { StepConfig, StepStatus, StepStatusMap } from '@beyo/lib';

import type { SlideStackCondition } from '../slide-stack';

export type { StepConfig, StepStatus, StepStatusMap };

export type StagedFormFooterRenderProps = {
  /** Pane that owns this footer instance. */
  stepId: string;
  isFirstStep: boolean;
  isLastStep: boolean;
};

export type StagedFormProps = {
  steps: StepConfig[];
  activeStepId: string;
  onAdvance: () => void;
  onBack: () => void;
  onNavigate: (stepId: string) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isAdvancing?: boolean;
  showNavigation?: boolean;
  enableKeyboardAccessory?: boolean;
  header?: ReactNode;
  /**
   * Static content, or a render function for per-step content. The footer is
   * rendered inside every slide pane so it shares the pane's drag and settle.
   */
  footer?:
    | ReactNode
    | ((props: StagedFormFooterRenderProps) => ReactNode);
  navigationMode?: 'sequential' | 'free';
  stepStatusMap?: StepStatusMap;
  /**
   * Gate for the forward slide gesture (e.g. "is the active step valid right
   * now") — when it resolves false, a leftward drag never engages, not even
   * the animation. The Next button is unaffected: its onAdvance still runs
   * and can surface validation errors. Boolean or live-evaluated function.
   */
  canAdvance?: SlideStackCondition;
  /** Gate for the backward slide gesture. Omitted counts as allowed. */
  canBack?: SlideStackCondition;
  direction?: 1 | -1;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
};

export type StagedFormContextValue = {
  steps: StepConfig[];
  activeStepId: string;
  /**
   * Step the timeline paints as active. Equals activeStepId at rest; while a
   * drag's settle animation is still running it is already the step that drag
   * committed to, so the progress line reacts at the release instead of a
   * transition later.
   */
  timelineStepId: string;
  isFirstStep: boolean;
  isLastStep: boolean;
  isAdvancing: boolean;
  navigationMode: 'sequential' | 'free';
  stepStatusMap: StepStatusMap;
  direction: 1 | -1;
  isTimelineCompact: boolean;
  isTimelineStatic: boolean;
  onAdvance: () => void;
  onBack: () => void;
  onNavigate: (stepId: string) => void;
};
