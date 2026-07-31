import { VerticalScrollArea } from '@beyo/ui';
import { AutoReturnFooter } from '../result/AutoReturnFooter';
import { SummaryHeader } from './SummaryHeader';
import { WorkedTodayPlate } from './WorkedTodayPlate';
import {
  ItemsCompletedCarousel,
  type CompletedItem,
} from './ItemsCompletedCarousel';
import { WeekBarChart, type WeekDay } from './WeekBarChart';
import { RateTile } from './RateTile';
import { InsightRow, type InsightDelta } from './InsightRow';

export type SummaryInsight = {
  key?: string;
  text: string;
  delta: InsightDelta;
};

type Props = {
  /** e.g. "Shift complete, Dana" */
  title: string;
  /** e.g. "Pick & Pack · Wednesday 29 July" */
  subtitle: string;
  name: string;
  avatarUrl: string | null;
  /** The dark hero. Null never happens on the analytics path (degraded → plain ResultScreen instead). */
  worked: { worked: string; in: string; out: string };
  /** GAP adapters — every one of these renders only when non-null/non-empty. */
  items: { items: CompletedItem[]; totalUnits: number; lineCount: number } | null;
  week: { days: WeekDay[]; targetSeconds: number; loggedSeconds: number } | null;
  rate: { unitsPerHour: number; baseline: number | null; baselineDays: number } | null;
  insights: SummaryInsight[];
  /** e.g. "2 active tasks were stopped" (transitioned_steps > 0). */
  notice?: string | null;
  countdownSeconds: number;
  onDone: () => void;
};

/**
 * The rich clock-out summary (Phase 6). Renders whatever data exists and
 * stays balanced as adapter-gated sections drop out; with all adapters empty
 * it is hero + insights (+ notice). Section order per the design readme:
 * phone → hours, insights, items, week/rate; sm+ → hours, items, week+rate
 * side by side, insights.
 */
export function SummaryScreen({
  title,
  subtitle,
  name,
  avatarUrl,
  worked,
  items,
  week,
  rate,
  insights,
  notice,
  countdownSeconds,
  onDone,
}: Props): React.JSX.Element {
  const hasWeekOrRate = week !== null || rate !== null;

  return (
    <VerticalScrollArea
      data-testid="summary-screen"
      className="overscroll-contain"
      style={{ flex: '1 1 0%', minHeight: 0 }}
      thumbClassName="bg-kiosk-tertiary/40"
      trackClassName="bg-kiosk-key"
    >
      <div className="flex min-h-full flex-col py-5 sm:py-6">
      <SummaryHeader
        avatarUrl={avatarUrl}
        name={name}
        subtitle={subtitle}
        title={title}
      />

      <div className="mt-5 flex flex-col gap-5 sm:mt-6">
        <div className="order-1">
          <WorkedTodayPlate
            autoReturnSeconds={countdownSeconds}
            in={worked.in}
            out={worked.out}
            worked={worked.worked}
          />
          {notice ? (
            <p
              className="mt-4 rounded-full bg-kiosk-key px-5 py-3 text-center text-[14px] font-medium text-kiosk-secondary"
              data-testid="summary-notice"
            >
              {notice}
            </p>
          ) : null}
        </div>

        {items ? (
          <div className="order-3 sm:order-2">
            <ItemsCompletedCarousel
              items={items.items}
              lineCount={items.lineCount}
              totalUnits={items.totalUnits}
            />
          </div>
        ) : null}

        {hasWeekOrRate ? (
          <div className="order-4 grid gap-4 sm:order-3 sm:grid-cols-[3fr_2fr]">
            {week ? (
              <WeekBarChart
                days={week.days}
                loggedSeconds={week.loggedSeconds}
                targetSeconds={week.targetSeconds}
              />
            ) : null}
            {rate ? (
              <RateTile
                baseline={rate.baseline}
                baselineDays={rate.baselineDays}
                unitsPerHour={rate.unitsPerHour}
              />
            ) : null}
          </div>
        ) : null}

        {insights.length > 0 ? (
          <div className="order-2 flex flex-col gap-3 sm:order-4">
            {insights.map((insight) => (
              <InsightRow
                key={insight.key ?? insight.text}
                delta={insight.delta}
                text={insight.text}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-auto pt-7">
        <AutoReturnFooter
          label="Done · See you tomorrow"
          onDone={onDone}
          secondsLeft={countdownSeconds}
          variant="accent"
        />
      </div>
      </div>
    </VerticalScrollArea>
  );
}
