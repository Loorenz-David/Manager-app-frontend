import type { ComponentType } from 'react';

export type StepStatus = 'active' | 'completed' | 'pending' | 'warning' | 'error' | 'locked';

export type StepConfig = {
  id: string;
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
};

export type StepStatusMap = Record<string, StepStatus>;
