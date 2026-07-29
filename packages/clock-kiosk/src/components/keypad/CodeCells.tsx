import { useEffect, useRef, useState } from 'react';
import { cn } from '@beyo/lib';

type Props = {
  /** Number of code cells; the kiosk design uses 4. */
  length: number;
  /** The typed digits — each filled cell displays its digit (user decision 2026-07-29). */
  value: string;
  /**
   * Error signal: on every false→true transition the row plays the shake
   * animation once (the parent clears the code itself). Toggle off and on
   * again — or leave it true and re-toggle — to replay on consecutive misses.
   */
  error: boolean;
};

/** The 4 code cells above the keypad; each shows its typed digit. */
export function CodeCells({ length, value, error }: Props): React.JSX.Element {
  const [shaking, setShaking] = useState(false);
  const prevError = useRef(error);

  useEffect(() => {
    if (error && !prevError.current) {
      setShaking(true);
    }
    prevError.current = error;
  }, [error]);

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 sm:gap-4',
        shaking && 'kiosk-shake',
      )}
      data-testid="code-cells"
      onAnimationEnd={() => setShaking(false)}
    >
      {Array.from({ length }, (_, index) => {
        const digit = value[index];
        return (
          <div
            key={index}
            className={cn(
              'grid size-16 place-items-center rounded-[16px] border bg-kiosk-card transition-colors sm:size-[84px] sm:rounded-[20px]',
              error
                ? 'border-kiosk-error/60'
                : digit
                  ? 'border-kiosk-tertiary/50'
                  : 'border-kiosk-line',
            )}
            data-filled={Boolean(digit) || undefined}
            data-testid="code-cell"
          >
            {digit ? (
              <span className="text-[26px] font-semibold text-kiosk-ink sm:text-[32px]">
                {digit}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
