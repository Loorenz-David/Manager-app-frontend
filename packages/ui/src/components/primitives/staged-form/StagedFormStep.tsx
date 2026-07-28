import type { ReactNode } from 'react';

import { cn } from '@beyo/lib';

import { SlideStackPane } from '../slide-stack';

export type StagedFormStepProps = {
  id: string;
  children: ReactNode;
  className?: string;
  /** Injected by StagedForm so the footer shares this pane's lifecycle. */
  footer?: ReactNode;
  /** Forwarded by AnimatePresence (popLayout) to measure the exiting step. */
  ref?: React.Ref<HTMLDivElement>;
};

export function StagedFormStep({
  id,
  children,
  className,
  footer,
  ref,
}: StagedFormStepProps): React.JSX.Element {
  return (
    <SlideStackPane
      id={id}
      ref={ref}
      // Body and footer deliberately share this motion element. The inner
      // wrapper owns consumer padding while the outer pane owns sizing and the
      // slide, so the whole step is handed from ghost to real pane together.
      className="flex grow flex-col"
      data-testid={`staged-form-step-${id}`}
    >
      <div className={cn('grow p-6', className)}>{children}</div>
      {footer ? (
        <div className="mt-auto shrink-0" data-testid="staged-form-footer">
          {footer}
        </div>
      ) : null}
    </SlideStackPane>
  );
}
