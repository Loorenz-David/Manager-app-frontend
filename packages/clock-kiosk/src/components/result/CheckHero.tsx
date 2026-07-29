import { cn } from '@beyo/lib';

type Props = {
  /** success = clock-in green · accent = clock-out blue. */
  tone?: 'success' | 'accent';
};

/** The circular check mark that opens both result screens. */
export function CheckHero({ tone = 'success' }: Props): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid size-24 place-items-center rounded-full sm:size-28',
        tone === 'success' ? 'bg-kiosk-success-soft' : 'bg-kiosk-accent/10',
      )}
      data-testid="check-hero"
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
  );
}
