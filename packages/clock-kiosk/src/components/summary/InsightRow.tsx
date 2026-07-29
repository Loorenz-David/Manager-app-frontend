import { cn } from '@beyo/lib';

export type InsightDelta = {
  /** Pre-formatted signed value, e.g. "+12m", "+9%", "−0.1h". */
  value: string;
  polarity: 'positive' | 'negative' | 'neutral';
};

type Props = {
  /** Factual statement, e.g. "142 units completed vs 5-day average of 130". */
  text: string;
  delta: InsightDelta;
};

const DELTA_COLOR: Record<InsightDelta['polarity'], string> = {
  positive: 'text-kiosk-success',
  negative: 'text-kiosk-error',
  neutral: 'text-kiosk-secondary',
};

/**
 * One factual insight: statement left, signed mono delta right. Copy is
 * deliberately factual, never motivational (design rule).
 */
export function InsightRow({ text, delta }: Props): React.JSX.Element {
  return (
    <div
      className="flex min-h-[56px] items-center justify-between gap-5 rounded-[18px] bg-kiosk-card px-5 py-3.5 shadow-[0_1px_2px_rgba(30,27,23,0.04)]"
      data-testid="insight-row"
    >
      <p className="text-[14.5px] leading-snug text-kiosk-ink">{text}</p>
      <span
        className={cn(
          'shrink-0 font-kiosk-mono text-[14px] font-medium',
          DELTA_COLOR[delta.polarity],
        )}
        data-polarity={delta.polarity}
      >
        {delta.value}
      </span>
    </div>
  );
}
