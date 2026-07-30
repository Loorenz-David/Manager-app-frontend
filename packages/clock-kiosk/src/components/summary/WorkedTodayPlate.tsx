import { useState } from 'react';

type Props = {
  /** Pre-formatted wall-clock span, e.g. "8h 12m". */
  worked: string;
  /** Clock-in time, e.g. "06:58". */
  in: string;
  /** Clock-out time, e.g. "15:00". */
  out: string;
  /**
   * Auto-return window in seconds. When set, a smooth depleting border runs
   * around the plate for that duration — the visual countdown back to the
   * keypad. First value seen = animation duration; hidden under
   * prefers-reduced-motion (the textual countdown returns via
   * AutoReturnFooter).
   */
  autoReturnSeconds?: number | null;
};

/**
 * The summary's dark hero: hours worked as the screen's single most
 * important number, with the in/out pair on the right. Mono numerals.
 */
export function WorkedTodayPlate({
  worked,
  in: inTime,
  out,
  autoReturnSeconds = null,
}: Props): React.JSX.Element {
  const [ringSeconds] = useState(autoReturnSeconds);

  return (
    <div className="relative" data-testid="worked-today-plate">
      {ringSeconds && ringSeconds > 0 ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          data-testid="auto-return-ring"
          fill="none"
        >
          {/* Stroke straddles the plate edge (1.5px in / 1.5px out) — a
              running border ON the container, no calc() (invalid in SVG
              geometry attributes). */}
          <rect
            className="kiosk-ring stroke-kiosk-accent"
            height="100%"
            pathLength={100}
            rx="24"
            strokeWidth="3"
            style={{ animationDuration: `${ringSeconds}s` }}
            width="100%"
          />
        </svg>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-[24px] bg-kiosk-plate px-6 py-6 sm:px-8 sm:py-7">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-plate-label">
            Worked today
          </p>
          <p
            className="mt-2 font-kiosk-mono text-[40px] font-medium leading-none text-white sm:text-[58px]"
            data-testid="worked-today-value"
          >
            {worked}
          </p>
        </div>
        <div className="flex shrink-0 gap-7 pb-1 text-right">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-plate-label">
              In
            </p>
            <p className="mt-2 font-kiosk-mono text-[17px] leading-none text-white sm:text-[19px]">
              {inTime}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-plate-label">
              Out
            </p>
            <p className="mt-2 font-kiosk-mono text-[17px] leading-none text-white sm:text-[19px]">
              {out}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
