type Props = {
  /** e.g. "CLOCKED IN AT" — rendered uppercase, letterspaced. */
  label: string;
  /** The single most important number on the screen, e.g. "15:15". Mono. */
  time: string;
  /**
   * Optional right column, e.g. { label: "SCHEDULED", value: "07:00 – 15:30" }.
   * Fed by the scheduled-shift adapter — omitted while the backend gap is open.
   */
  right?: { label: string; value: string } | null;
};

/**
 * The dark plate — reserved for the single most important number on a screen
 * (design rule). Ink ground, mono numerals.
 */
export function DarkTimePlate({
  label,
  time,
  right,
}: Props): React.JSX.Element {
  return (
    <div
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-[24px] bg-kiosk-plate px-6 py-6 sm:px-8 sm:py-7"
      data-testid="dark-time-plate"
    >
      <div className="min-w-0">
        <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-plate-label">
          {label}
        </p>
        <p
          className="mt-2 font-kiosk-mono text-[40px] font-medium leading-none text-white sm:text-[64px]"
          data-testid="plate-time"
        >
          {time}
        </p>
      </div>
      {right ? (
        <div className="shrink-0 pb-1 text-right" data-testid="plate-right">
          <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-plate-label">
            {right.label}
          </p>
          <p className="mt-2 font-kiosk-mono text-[17px] leading-none text-white sm:text-[19px]">
            {right.value}
          </p>
        </div>
      ) : null}
    </div>
  );
}
