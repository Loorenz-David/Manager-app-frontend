type Props = {
  unitsPerHour: number;
  /** Null when baselineDays is 0 — not enough recent history yet. */
  baseline: number | null;
  baselineDays: number;
};

function formatRate(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

/**
 * "RATE TODAY" — units/hour against the recent baseline.
 * GAP-fed via SummaryExtrasAdapter.rate.
 */
export function RateTile({
  unitsPerHour,
  baseline,
  baselineDays,
}: Props): React.JSX.Element {
  return (
    <section
      className="flex flex-col rounded-[20px] bg-kiosk-key p-5"
      data-testid="rate-tile"
    >
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-tertiary">
        Rate today
      </h2>
      <p className="mt-3 font-kiosk-mono text-[40px] font-medium leading-none text-kiosk-ink">
        {formatRate(unitsPerHour)}
      </p>
      <p className="mt-1.5 text-[14px] text-kiosk-secondary">units / hour</p>
      <div className="mt-auto border-t border-kiosk-line pt-3">
        <p className="text-[13.5px] text-kiosk-secondary" data-testid="rate-tile-baseline">
          {baseline === null ? (
            'Not enough history yet'
          ) : (
            <>
              {baselineDays}-day average{' '}
              <span className="font-kiosk-mono text-kiosk-ink">
                {formatRate(baseline)}
              </span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
