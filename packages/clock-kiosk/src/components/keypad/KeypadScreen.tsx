import { cn } from '@beyo/lib';
import { CodeCells } from './CodeCells';
import { Keypad } from './Keypad';
import { KioskButton } from '../shared/KioskButton';

export type KeypadMode = 'code' | 'email';

type Props = {
  /** Current code digits (never rendered — cells show dots). */
  code: string;
  /** No-match / validation error state; one generic message for both modes. */
  error: boolean;
  /** Generic error copy, e.g. "No worker matches this code or email". */
  errorMessage?: string;
  mode: KeypadMode;
  emailValue: string;
  /** Pending = a match is being resolved / current-state fetch in flight. */
  pending?: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  onModeChange: (mode: KeypadMode) => void;
  onEmailChange: (value: string) => void;
  onEmailSubmit: () => void;
};

const CODE_LENGTH = 4;

/**
 * The kiosk idle screen: "Start your shift", 4 code cells, the keypad, and
 * the "Clock with email" fallback mode (master decision #4). Pure
 * presentational — matching, auto-submit-on-4th, and physical-keyboard
 * wiring live in the flow controller.
 */
export function KeypadScreen({
  code,
  error,
  errorMessage = 'No worker matches this code or email',
  mode,
  emailValue,
  pending = false,
  onDigit,
  onDelete,
  onSubmit,
  onModeChange,
  onEmailChange,
  onEmailSubmit,
}: Props): React.JSX.Element {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto py-6 sm:py-8 lg:py-5"
      data-testid="keypad-screen"
    >
      <div className="text-center">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight text-kiosk-ink sm:text-[42px]">
          Start your shift
        </h1>
        <p className="mt-2 text-[15px] text-kiosk-secondary sm:text-[17px]">
          {mode === 'code'
            ? 'Enter your 4-digit code to clock in or out'
            : 'Enter your working email to clock in or out'}
        </p>
      </div>

      {mode === 'code' ? (
        <>
          <div className="mt-8 sm:mt-10 lg:mt-6">
            <CodeCells error={error} length={CODE_LENGTH} value={code} />
          </div>
          <p
            aria-live="polite"
            className={cn(
              'mt-3 h-5 text-[14px] text-kiosk-error transition-opacity',
              error ? 'opacity-100' : 'opacity-0',
            )}
            data-testid="keypad-error"
          >
            {errorMessage}
          </p>
          <div className={cn('mt-4 sm:mt-6 lg:mt-4', pending && 'pointer-events-none opacity-60')}>
            <Keypad onDelete={onDelete} onDigit={onDigit} onSubmit={onSubmit} />
          </div>
          <button
            className="mt-7 min-h-11 rounded-full border border-kiosk-accent/35 px-6 py-2.5 text-[15px] font-medium text-kiosk-accent transition-colors active:bg-kiosk-accent/5 sm:mt-9 lg:mt-5"
            data-testid="clock-with-email"
            onClick={() => onModeChange('email')}
            type="button"
          >
            Clock with email
          </button>
        </>
      ) : (
        <div className="mt-9 flex w-full max-w-[420px] flex-col items-center sm:mt-12">
          <input
            autoComplete="off"
            className={cn(
              'h-16 w-full rounded-[18px] border bg-kiosk-card px-5 text-center text-[18px] text-kiosk-ink outline-none transition-colors placeholder:text-kiosk-tertiary focus:border-kiosk-accent/60',
              error ? 'border-kiosk-error/60' : 'border-kiosk-line',
            )}
            data-testid="email-input"
            inputMode="email"
            onChange={(event) => onEmailChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onEmailSubmit();
            }}
            placeholder="name@company.com"
            type="email"
            value={emailValue}
          />
          <p
            aria-live="polite"
            className={cn(
              'mt-3 h-5 text-[14px] text-kiosk-error transition-opacity',
              error ? 'opacity-100' : 'opacity-0',
            )}
            data-testid="keypad-error"
          >
            {errorMessage}
          </p>
          <div className="mt-5 w-full">
            <KioskButton
              data-testid="email-submit"
              disabled={pending || emailValue.trim().length === 0}
              onClick={onEmailSubmit}
              size="md"
              variant="accent"
            >
              Continue
            </KioskButton>
          </div>
          <button
            className="mt-6 min-h-11 px-4 text-[15px] font-medium text-kiosk-secondary transition-colors active:text-kiosk-ink"
            data-testid="back-to-code"
            onClick={() => onModeChange('code')}
            type="button"
          >
            Use my 4-digit code instead
          </button>
        </div>
      )}
    </div>
  );
}
