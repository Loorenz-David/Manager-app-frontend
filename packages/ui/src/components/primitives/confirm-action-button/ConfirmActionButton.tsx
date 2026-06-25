import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@beyo/lib';

export type ConfirmActionButtonProps = {
  label: string;
  confirmLabel: string;
  confirmDurationMs?: number;
  backgroundColor?: string;
  fillColor?: string;
  textColor?: string;
  confirmTextColor?: string;
  borderColor?: string;
  className?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  'data-testid'?: string;
};

export function ConfirmActionButton({
  label,
  confirmLabel,
  confirmDurationMs = 3000,
  backgroundColor = 'var(--color-card)',
  fillColor = 'var(--color-destructive)',
  textColor,
  confirmTextColor = 'white',
  borderColor,
  className,
  icon,
  onConfirm,
  disabled = false,
  'data-testid': testId,
}: ConfirmActionButtonProps): React.JSX.Element {
  const [isPending, setIsPending] = useState(false);
  const [fillWidth, setFillWidth] = useState('0%');
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setFillWidth('0%');
    setIsPending(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) {
      return;
    }

    if (!isPending) {
      setFillWidth('0%');
      setIsPending(true);
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setFillWidth('100%');
        animationFrameRef.current = null;
      });
      timerRef.current = window.setTimeout(() => {
        reset();
      }, confirmDurationMs);
      return;
    }

    reset();
    onConfirm();
  }, [confirmDurationMs, disabled, isPending, onConfirm, reset]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const currentLabel = isPending ? confirmLabel : label;

  return (
    <button
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      data-testid={testId}
      disabled={disabled}
      style={{
        backgroundColor,
        borderColor,
        color: textColor,
      }}
      type="button"
      onClick={handleClick}
    >
      {isPending ? (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0"
            style={{
              width: fillWidth,
              backgroundColor: fillColor,
              transition: `width ${confirmDurationMs}ms linear`,
            }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 z-10 flex items-center justify-center px-4 py-3 text-sm font-medium"
            style={{
              color: confirmTextColor,
              clipPath: fillWidth === '100%' ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
              transition: `clip-path ${confirmDurationMs}ms linear`,
            }}
          >
            {currentLabel}
          </span>
        </>
      ) : null}
      <span className={cn('relative z-0', icon && 'flex items-center gap-3')}>
        {icon}
        {currentLabel}
      </span>
    </button>
  );
}
