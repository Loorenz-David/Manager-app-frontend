import type { ReactNode } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@beyo/lib';

type KeyProps = {
  onPress: () => void;
  children: ReactNode;
  'aria-label'?: string;
  'data-testid'?: string;
  variant?: 'plain' | 'accent';
};

function KeypadKey({
  onPress,
  children,
  variant = 'plain',
  'aria-label': ariaLabel,
  'data-testid': testId,
}: KeyProps): React.JSX.Element {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        // lg (desktop + iPad landscape) steps back down so the idle screen fits
        // a 900px-tall viewport without scrolling; tablet portrait (768–1023px
        // wide) keeps the full 120px design size.
        'grid size-[72px] select-none place-items-center rounded-full text-[26px] font-medium transition-[filter,background-color] duration-100 active:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kiosk-accent sm:size-[104px] sm:text-[30px] md:size-[120px] lg:size-[100px] lg:text-[28px]',
        variant === 'accent'
          ? 'bg-kiosk-accent text-white'
          : 'bg-kiosk-key text-kiosk-ink',
      )}
      data-testid={testId}
      onClick={onPress}
      type="button"
    >
      {children}
    </button>
  );
}

type Props = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
};

function SubmitGlyph(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="size-7 sm:size-8"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

/**
 * The 3×4 kiosk keypad: 1–9, then submit · 0 · delete. The bottom row follows
 * the familiar phone/PIN-pad convention (delete bottom-right); the submit key
 * is the accent circle. Circles are 120px on iPad, scaling to 72px on phone.
 * Pure presentational — validation/auto-submit live in the flow controller.
 */
export function Keypad({
  onDigit,
  onDelete,
  onSubmit,
}: Props): React.JSX.Element {
  return (
    <div
      className="grid grid-cols-3 justify-items-center gap-3 sm:gap-5 lg:gap-4"
      data-testid="keypad"
    >
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <KeypadKey
          key={digit}
          data-testid={`keypad-key-${digit}`}
          onPress={() => onDigit(digit)}
        >
          {digit}
        </KeypadKey>
      ))}
      <KeypadKey
        aria-label="Submit code"
        data-testid="keypad-submit"
        onPress={onSubmit}
        variant="accent"
      >
        <SubmitGlyph />
      </KeypadKey>
      <KeypadKey data-testid="keypad-key-0" onPress={() => onDigit('0')}>
        0
      </KeypadKey>
      <KeypadKey
        aria-label="Delete last digit"
        data-testid="keypad-delete"
        onPress={onDelete}
      >
        <Delete aria-hidden="true" className="size-7 sm:size-8" strokeWidth={1.8} />
      </KeypadKey>
    </div>
  );
}
