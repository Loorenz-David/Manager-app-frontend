import type { HTMLAttributes, ReactNode } from 'react';

type Props = {
  workspaceName: string;
  /** e.g. "TERMINAL 04 · BAY B" — device-local config, already formatted. */
  terminalLabel: string;
  /** Pre-formatted time string in the workspace time zone, e.g. "15:14". */
  time: string;
  /** Pre-formatted date string, e.g. "Wednesday 29 July". */
  date: string;
  /** Custom workspace mark; falls back to the default dark mark. */
  logo?: ReactNode;
  /**
   * Spread onto the identity block (logo + names). The host attaches its
   * long-press handlers here to open device settings — the component itself
   * has no tap/press behavior.
   */
  identitySlotProps?: HTMLAttributes<HTMLDivElement>;
};

function DefaultLogoMark(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex size-11 items-center justify-center rounded-[14px] bg-kiosk-ink"
    >
      <div className="size-3.5 rounded-[5px] bg-kiosk-accent" />
    </div>
  );
}

/**
 * Persistent kiosk header: workspace identity on the left, live clock + date
 * on the right. Rendered inside KioskFrame's header slot on every screen —
 * it never unmounts.
 */
export function KioskHeader({
  workspaceName,
  terminalLabel,
  time,
  date,
  logo,
  identitySlotProps,
}: Props): React.JSX.Element {
  return (
    <header
      className="flex items-start justify-between gap-4"
      data-testid="kiosk-header"
    >
      <div
        {...identitySlotProps}
        className="flex select-none items-center gap-3"
        data-testid="kiosk-header-identity"
      >
        {logo ?? <DefaultLogoMark />}
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold leading-tight text-kiosk-ink">
            {workspaceName}
          </p>
          <p className="truncate text-[11px] font-medium uppercase leading-snug tracking-[0.18em] text-kiosk-tertiary">
            {terminalLabel}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p
          className="text-[27px] font-semibold leading-none tracking-tight tabular-nums text-kiosk-ink sm:text-[30px]"
          data-testid="kiosk-header-time"
        >
          {time}
        </p>
        <p className="mt-1 text-[13px] leading-none text-kiosk-tertiary">
          {date}
        </p>
      </div>
    </header>
  );
}
