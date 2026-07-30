import type { ReactNode } from 'react';
import { VerticalScrollArea } from '@beyo/ui';
import { AutoReturnFooter } from './AutoReturnFooter';
import { CheckHero } from './CheckHero';
import { DarkTimePlate } from './DarkTimePlate';

type Props = {
  /** in = clock-in success (green) · out = plain clock-out success (accent). */
  variant: 'in' | 'out';
  /** e.g. "Good afternoon, Marco" / "Shift complete, Dana". */
  greeting: string;
  /** e.g. "You're clocked in for today's shift". */
  subtitle: string;
  /**
   * The dark plate content; null renders no plate (degraded clock-out where
   * nothing is known beyond success).
   */
  plate: { label: string; time: string; right?: { label: string; value: string } | null } | null;
  /** e.g. "2 active tasks were stopped" (clock-out transitioned_steps > 0). */
  notice?: string | null;
  /**
   * "TODAY ON THE FLOOR" announcements section — Phase 6 adapter content.
   * Render nothing while empty; the layout stays balanced without it.
   */
  announcementsSlot?: ReactNode;
  countdownSeconds: number;
  onDone: () => void;
  /** Override the Done label (clock-out summary: "Done · See you tomorrow"). */
  doneLabel?: string;
};

/**
 * The clock-in result and the plain clock-out success. Opens as a rise
 * surface; every path out of it lands on the keypad.
 */
export function ResultScreen({
  variant,
  greeting,
  subtitle,
  plate,
  notice,
  announcementsSlot,
  countdownSeconds,
  onDone,
  doneLabel,
}: Props): React.JSX.Element {
  return (
    <VerticalScrollArea
      data-testid={`result-screen-${variant}`}
      className="overscroll-contain"
      style={{ flex: '1 1 0%', minHeight: 0 }}
      thumbClassName="bg-kiosk-tertiary/40"
      trackClassName="bg-kiosk-key"
    >
      <div className="flex min-h-full flex-col py-6 sm:py-8">
      <div className="flex flex-col items-center pt-4 text-center sm:pt-8">
        <CheckHero
          autoReturnSeconds={countdownSeconds}
          tone={variant === 'in' ? 'success' : 'accent'}
        />
        <h1
          className="mt-7 text-[34px] font-bold leading-tight tracking-tight text-kiosk-ink sm:text-[44px]"
          data-testid="result-greeting"
        >
          {greeting}
        </h1>
        <p className="mt-2 text-[15px] text-kiosk-secondary sm:text-[17px]">
          {subtitle}
        </p>
      </div>

      <div className="mx-auto mt-8 w-full max-w-[640px] sm:mt-10">
        {plate ? (
          <DarkTimePlate
            label={plate.label}
            right={plate.right}
            time={plate.time}
          />
        ) : null}
        {notice ? (
          <p
            className="mt-4 rounded-full bg-kiosk-key px-5 py-3 text-center text-[14px] font-medium text-kiosk-secondary"
            data-testid="result-notice"
          >
            {notice}
          </p>
        ) : null}
        {announcementsSlot}
      </div>

      <div className="mx-auto mt-auto w-full max-w-[640px] pt-8">
        <AutoReturnFooter
          label={doneLabel}
          onDone={onDone}
          secondsLeft={countdownSeconds}
        />
      </div>
      </div>
    </VerticalScrollArea>
  );
}
