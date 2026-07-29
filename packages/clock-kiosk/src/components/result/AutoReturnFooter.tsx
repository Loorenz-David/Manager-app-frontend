import { KioskButton } from '../shared/KioskButton';

type Props = {
  /** Seconds until the flow auto-returns to the keypad (controller-owned). */
  secondsLeft: number;
  onDone: () => void;
  /** Button label; the clock-out summary uses "Done · See you tomorrow". */
  label?: string;
  /** muted = plain results (design's grey Done) · accent = summary's blue Done. */
  variant?: 'muted' | 'accent';
};

/**
 * Bottom of every result screen: the manual Done action plus the auto-return
 * countdown caption. The countdown itself ticks in the flow store — this
 * only renders it.
 */
export function AutoReturnFooter({
  secondsLeft,
  onDone,
  label = 'Done',
  variant = 'muted',
}: Props): React.JSX.Element {
  return (
    <div className="w-full" data-testid="auto-return-footer">
      <KioskButton data-testid="result-done" onClick={onDone} variant={variant}>
        {label}
      </KioskButton>
      <p
        aria-live="off"
        className="mt-3 text-center text-[14px] text-kiosk-tertiary"
        data-testid="auto-return-countdown"
      >
        Returning to the keypad in {secondsLeft}s
      </p>
    </div>
  );
}
