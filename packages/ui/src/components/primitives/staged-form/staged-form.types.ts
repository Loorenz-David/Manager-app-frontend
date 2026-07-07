import type { ReactNode } from 'react';

import type { StepConfig, StepStatus, StepStatusMap } from '@beyo/lib';

export type { StepConfig, StepStatus, StepStatusMap };

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
  footer?: ReactNode;
  /**
   * Manual override for the footer's bottom-edge reveal threshold. When omitted,
   * the staged form falls back to the footer's live measured height.
   */
  footerEdgeOffset?: number;
  navigationMode?: 'sequential' | 'free';
  stepStatusMap?: StepStatusMap;
  direction?: 1 | -1;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
};

export type StagedFormContextValue = {
  steps: StepConfig[];
  activeStepId: string;
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
