import { cn } from '@beyo/lib';

export type WeekDay = {
  /** Short label, e.g. "Mon". */
  label: string;
  workedSeconds: number;
  isToday: boolean;
};

type Props = {
  days: WeekDay[];
  /** Weekly target, e.g. 40h → 144000. */
  targetSeconds: number;
  /** Total logged this week. */
  loggedSeconds: number;
};

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}h`;
}

/**
 * "THIS WEEK" — daily-hours CSS bars against the weekly target. Today is
 * accent-filled; other days key-grey. GAP-fed via SummaryExtrasAdapter.week.
 */
export function WeekBarChart({
  days,
  targetSeconds,
  loggedSeconds,
}: Props): React.JSX.Element {
  const dailyTarget = targetSeconds / Math.max(days.length, 1);
  const scaleMax = Math.max(dailyTarget, ...days.map((d) => d.workedSeconds));

  return (
    <section
      className="rounded-[20px] bg-kiosk-card p-5 shadow-[0_1px_2px_rgba(30,27,23,0.04)]"
      data-testid="week-bar-chart"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-tertiary">
          This week
        </h2>
        <p className="font-kiosk-mono text-[13px] text-kiosk-ink">
          {formatHours(loggedSeconds)}{' '}
          <span className="text-kiosk-tertiary">/ {formatHours(targetSeconds)}</span>
        </p>
      </div>
      <div className="mt-4 flex h-[104px] items-end gap-2.5">
        {days.map((day) => {
          const ratio = scaleMax > 0 ? day.workedSeconds / scaleMax : 0;
          return (
            <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className={cn(
                  'w-full rounded-[8px]',
                  day.isToday ? 'bg-kiosk-accent' : 'bg-kiosk-key',
                )}
                data-testid={day.isToday ? 'week-bar-today' : 'week-bar'}
                style={{ height: `${Math.max(Math.round(ratio * 88), 6)}px` }}
              />
              <span
                className={cn(
                  'text-[12px]',
                  day.isToday
                    ? 'font-semibold text-kiosk-ink'
                    : 'text-kiosk-tertiary',
                )}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
