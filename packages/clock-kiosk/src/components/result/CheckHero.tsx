import { useState } from 'react';
import { cn } from '@beyo/lib';

type Props = {
  /** success = clock-in green · accent = clock-out blue. */
  tone?: 'success' | 'accent';
  /**
   * Auto-return window in seconds. When set, a smooth depleting ring runs
   * around the circle for that duration — the visual countdown back to the
   * keypad. The FIRST value seen is the animation duration; later ticks are
   * ignored (the CSS animation runs on its own clock). Under
   * prefers-reduced-motion the ring hides (the textual countdown returns via
   * AutoReturnFooter).
   */
  autoReturnSeconds?: number | null;
};

/** The circular check mark that opens both result screens. */
export function CheckHero({
  tone = 'success',
  autoReturnSeconds = null,
}: Props): React.JSX.Element {
  // Capture the first non-null value: the ring's total duration.
  const [ringSeconds] = useState(autoReturnSeconds);

  return (
    <div className="relative" data-testid="check-hero">
      {ringSeconds && ringSeconds > 0 ? (
        <svg
          aria-hidden="true"
          className="absolute -inset-1.5 size-[calc(100%+12px)] -rotate-90"
          data-testid="auto-return-ring"
          viewBox="0 0 100 100"
        >
          <circle
            className={cn(
              'kiosk-ring fill-none stroke-2',
              // Ring color signals in vs out; both tokens live in
              // @beyo/styles (--color-kiosk-timer-in / -out).
              tone === 'success'
                ? 'stroke-kiosk-timer-in'
                : 'stroke-kiosk-timer-out',
            )}
            cx="50"
            cy="50"
            pathLength="100"
            r="48.5"
            style={{ animationDuration: `${ringSeconds}s` }}
          />
        </svg>
      ) : null}
      <div
        className={cn(
          'grid size-24 place-items-center rounded-full sm:size-28',
          tone === 'success' ? 'bg-kiosk-success-soft' : 'bg-kiosk-accent/10',
        )}
      >
        <svg
          aria-hidden="true"
          className={cn(
            'size-10 sm:size-11',
            tone === 'success' ? 'text-kiosk-success' : 'text-kiosk-accent',
          )}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
          viewBox="0 0 24 24"
        >
          <path d="m4.5 12.5 5 5 10-11" />
        </svg>
      </div>
    </div>
  );
}
