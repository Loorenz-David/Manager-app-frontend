import type { ReactNode } from 'react';
import { m } from 'framer-motion';

import { transitions } from '@beyo/lib';
import { cn } from '@beyo/lib';

import { useStagedFormContext } from './StagedFormContext';

type StagedFormStepProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

const stepVariants = {
  enter: (direction: 1 | -1) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({ x: direction > 0 ? '-100%' : '100%', opacity: 0 }),
} as const;

export function StagedFormStep({ id, children, className }: StagedFormStepProps): React.JSX.Element {
  const { direction } = useStagedFormContext();

  return (
    <m.div
      key={id}
      animate="center"
      className={cn('w-full min-h-full p-6', className)}
      custom={direction}
      data-testid={`staged-form-step-${id}`}
      exit="exit"
      initial="enter"
      transition={transitions.slide}
      variants={stepVariants}
    >
      {children}
    </m.div>
  );
}
