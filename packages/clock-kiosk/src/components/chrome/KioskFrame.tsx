import type { ReactNode } from 'react';
import { cn } from '@beyo/lib';

type Props = {
  /** The KioskHeader (or any header content). Stays mounted on every screen. */
  header: ReactNode;
  /** The screen body — owns its own scrolling if it needs any. */
  children: ReactNode;
  /** Optional bottom-pinned action area (primary buttons live here). */
  footer?: ReactNode;
  className?: string;
};

/**
 * The kiosk page skeleton: canvas fill → centred paper column with rounded
 * corners → header slot / flexible middle / bottom-pinned action slot.
 * iPad portrait is the primary target; the column caps at 760px and centres
 * on desktop / iPad landscape; full-bleed with tighter padding on phone.
 */
export function KioskFrame({
  header,
  children,
  footer,
  className,
}: Props): React.JSX.Element {
  return (
    <div
      className="h-full bg-kiosk-canvas p-2 font-kiosk-sans text-kiosk-ink sm:p-3"
      data-testid="kiosk-frame"
    >
      <div
        className={cn(
          'mx-auto flex h-full w-full max-w-[760px] flex-col overflow-hidden rounded-[24px] bg-kiosk-surface shadow-[0_1px_2px_rgba(30,27,23,0.04),0_10px_28px_rgba(30,27,23,0.06)] sm:rounded-[32px]',
          className,
        )}
      >
        <div className="shrink-0 px-5 pt-[calc(var(--safe-top)+1.25rem)] sm:px-9 sm:pt-[calc(var(--safe-top)+1.75rem)]">
          {header}
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-5 sm:px-9">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 px-5 pb-[calc(var(--safe-bottom)+1.25rem)] pt-3 sm:px-9 sm:pb-[calc(var(--safe-bottom)+1.75rem)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
