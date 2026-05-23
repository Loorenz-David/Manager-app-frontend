import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type ConfirmActionButtonProps = {
  label: string;
  confirmLabel: string;
  confirmDurationMs?: number;
  fillColor?: string;
  textColor?: string;
  confirmTextColor?: string;
  className?: string;
  onConfirm: () => void;
  disabled?: boolean;
  'data-testid'?: string;
};

export function ConfirmActionButton({
  label,
  confirmLabel,
  confirmDurationMs = 3000,
  fillColor = 'var(--color-destructive)',
  textColor,
  confirmTextColor = 'white',
  className,
  onConfirm,
  disabled = false,
  'data-testid': testId,
}: ConfirmActionButtonProps): React.JSX.Element {
  const [isPending, setIsPending] = useState(false);
  const timerRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPending(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) {
      return;
    }

    if (!isPending) {
      setIsPending(true);
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
    };
  }, []);

  return (
    <button
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      data-testid={testId}
      disabled={disabled}
      style={{ color: isPending ? confirmTextColor : textColor }}
      type="button"
      onClick={handleClick}
    >
      {isPending ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0"
          style={{
            width: '100%',
            backgroundColor: fillColor,
            animation: `confirm-action-fill ${confirmDurationMs}ms linear forwards`,
            transformOrigin: 'left center',
          }}
        />
      ) : null}
      <span className="relative z-10">{isPending ? confirmLabel : label}</span>
    </button>
  );
}
