import { cn } from '@beyo/lib';

type Props = {
  /**
   * confirm = avatar circle + name bar + context row + action bar ·
   * result = check circle + greeting bar + plate block + action bar ·
   * summary = header row + plate block + card blocks + action bar
   */
  variant?: 'confirm' | 'result' | 'summary';
};

function Block({ className }: { className: string }): React.JSX.Element {
  return (
    <div
      className={cn(
        'skeleton-shimmer rounded-[18px] [--skeleton-base:var(--color-kiosk-key)] [--skeleton-highlight:var(--color-kiosk-surface)]',
        className,
      )}
    />
  );
}

/**
 * Loading fallback for kiosk surfaces and data waits — kiosk-paper ground,
 * container shapes matching the real screens (operator finding O2). Meant to
 * render INSIDE the host's kiosk frame (paper + header stay visible), never
 * bare on the rise backdrop.
 */
export function KioskSurfaceSkeleton({
  variant = 'confirm',
}: Props): React.JSX.Element {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center py-6 sm:py-10"
      data-testid="kiosk-surface-skeleton"
    >
      {variant === 'summary' ? (
        <div className="flex w-full max-w-[640px] flex-1 flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <Block className="size-12 rounded-full" />
            <div className="flex flex-col gap-2">
              <Block className="h-5 w-48" />
              <Block className="h-3.5 w-32" />
            </div>
          </div>
          <Block className="h-[120px] w-full rounded-[24px]" />
          <Block className="h-[72px] w-full" />
          <Block className="h-[72px] w-full" />
          <Block className="mt-auto h-[74px] w-full rounded-[22px]" />
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <Block
              className={cn(
                'rounded-full',
                variant === 'confirm' ? 'size-40 sm:size-56' : 'size-24 sm:size-28',
              )}
            />
            <Block className="h-8 w-56 sm:h-10 sm:w-72" />
            <Block className="h-4 w-40" />
          </div>
          <div className="flex w-full max-w-[560px] flex-col gap-4">
            {variant === 'result' ? (
              <Block className="h-[110px] w-full rounded-[24px]" />
            ) : (
              <Block className="h-[56px] w-full" />
            )}
            <Block className="h-[74px] w-full rounded-[22px] sm:h-[88px] sm:rounded-[26px]" />
          </div>
        </>
      )}
    </div>
  );
}
