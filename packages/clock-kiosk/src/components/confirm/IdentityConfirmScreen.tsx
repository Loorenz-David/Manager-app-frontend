import { Avatar } from '@beyo/ui';
import { KioskButton } from '../shared/KioskButton';

export type ConfirmAction = 'clock_in' | 'clock_out';

type Props = {
  user: {
    name: string;
    /** e.g. "Assembly · Line 3" — role name (+ future badge/station, adapter-fed). */
    roleLine: string | null;
    avatarUrl: string | null;
  };
  /**
   * The single context row: clocked-in → { label: "Clocked in at", value: "06:58" };
   * clocked-out → scheduled-shift adapter data, or null (row hidden).
   */
  context: { label: string; value: string } | null;
  /** Which single action the fresh /current state allows. */
  action: ConfirmAction;
  /** True until the fresh current-state fetch resolves / while acting. */
  pending: boolean;
  onAction: () => void;
  onBack: () => void;
};

const ACTION_COPY: Record<ConfirmAction, string> = {
  clock_in: 'Clock in now',
  clock_out: 'Clock out now',
};

/**
 * "Is this you?" — photo, name, role line, one context row, and exactly one
 * primary action (green clock-in or accent clock-out, decided by the fresh
 * server state the controller feeds in). Renders as a rise surface over the
 * keypad.
 */
export function IdentityConfirmScreen({
  user,
  context,
  action,
  pending,
  onAction,
  onBack,
}: Props): React.JSX.Element {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto py-6 sm:py-10"
      data-testid="identity-confirm-screen"
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <Avatar
          className="size-40 bg-kiosk-key text-[44px] font-semibold text-kiosk-secondary sm:size-56"
          data-testid="confirm-avatar"
          imageSrc={user.avatarUrl}
          name={user.name}
        />
        <h1
          className="mt-7 text-center text-[34px] font-bold leading-tight tracking-tight text-kiosk-ink sm:text-[44px]"
          data-testid="confirm-name"
        >
          {user.name}
        </h1>
        {user.roleLine ? (
          <p className="mt-2 text-center text-[16px] text-kiosk-secondary sm:text-[18px]">
            {user.roleLine}
          </p>
        ) : null}
      </div>

      <div className="w-full max-w-[560px]">
        {context ? (
          <div
            className="flex min-h-[56px] items-center justify-between gap-6 rounded-[18px] bg-kiosk-key px-5 py-4"
            data-testid="confirm-context-row"
          >
            <span className="text-[15px] text-kiosk-secondary">
              {context.label}
            </span>
            <span className="font-kiosk-mono text-[16px] text-kiosk-ink">
              {context.value}
            </span>
          </div>
        ) : null}
        <div className="mt-4">
          <KioskButton
            data-testid="confirm-action"
            disabled={pending}
            onClick={onAction}
            variant={action === 'clock_in' ? 'success' : 'accent'}
          >
            {pending ? 'One moment…' : ACTION_COPY[action]}
          </KioskButton>
        </div>
        <div className="mt-2 text-center">
          <button
            className="min-h-11 px-4 text-[15px] font-medium text-kiosk-secondary transition-colors active:text-kiosk-ink"
            data-testid="confirm-not-you"
            onClick={onBack}
            type="button"
          >
            Not you? Go back
          </button>
        </div>
      </div>
    </div>
  );
}
