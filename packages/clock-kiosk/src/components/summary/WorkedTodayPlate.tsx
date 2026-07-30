type Props = {
  /** Pre-formatted wall-clock span, e.g. "8h 12m". */
  worked: string;
  /** Clock-in time, e.g. "06:58". */
  in: string;
  /** Clock-out time, e.g. "15:00". */
  out: string;
};

/**
 * The summary's dark hero: hours worked as the screen's single most
 * important number, with the in/out pair on the right. Mono numerals.
 */
export function WorkedTodayPlate({
  worked,
  in: inTime,
  out,
}: Props): React.JSX.Element {
  return (
    <div
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-[24px] bg-kiosk-plate px-6 py-6 sm:px-8 sm:py-7"
      data-testid="worked-today-plate"
    >
      <div className="min-w-0">
        <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-plate-label">
          Worked today
        </p>
        <p
          className="mt-2 font-kiosk-mono text-[40px] font-medium leading-none text-white sm:text-[58px]"
          data-testid="worked-today-value"
        >
          {worked}
        </p>
      </div>
      <div className="flex shrink-0 gap-7 pb-1 text-right">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-plate-label">
            In
          </p>
          <p className="mt-2 font-kiosk-mono text-[17px] leading-none text-white sm:text-[19px]">
            {inTime}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-plate-label">
            Out
          </p>
          <p className="mt-2 font-kiosk-mono text-[17px] leading-none text-white sm:text-[19px]">
            {out}
          </p>
        </div>
      </div>
    </div>
  );
}
