import type { ReactNode } from 'react';

import { cn } from '@beyo/lib';

import { SlideStackPane } from '../slide-stack';

type StagedFormStepProps = {
  id: string;
  children: ReactNode;
  className?: string;
  /** Forwarded by AnimatePresence (popLayout) to measure the exiting step. */
  ref?: React.Ref<HTMLDivElement>;
};

export function StagedFormStep({ id, children, className, ref }: StagedFormStepProps): React.JSX.Element {
  return (
    <SlideStackPane
      id={id}
      ref={ref}
      className={cn('min-h-full p-6', className)}
      data-testid={`staged-form-step-${id}`}
    >
      {children}
    </SlideStackPane>
  );
}
