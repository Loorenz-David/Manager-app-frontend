import type {
  TypicalStrategyDetailRow,
  TypicalStrategyViewModel,
} from "../../lib/typical-strategy";
import { TYPICAL_STRATEGY_PILL_CLASS } from "./typical-strategy-tone";
import { cn } from "@beyo/lib";

export type TypicalStrategySheetContentProps = {
  strategy: TypicalStrategyViewModel;
};

function DetailRows({
  rows,
  testId,
}: {
  rows: TypicalStrategyDetailRow[];
  testId: string;
}): React.JSX.Element {
  return (
    <dl className="flex flex-col gap-2" data-testid={testId}>
      {rows.map((row) => (
        <div
          className="flex items-baseline justify-between gap-4"
          key={`${row.label}-${row.value}`}
        >
          <dt className="shrink-0 text-sm text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 text-right text-sm font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * The full disclosure behind the pill.
 *
 * The closing note is the point of the whole surface: the same selection that
 * produced these numbers produced the budget split, so a reader who disagrees
 * with the strategy is disagreeing with their stage allowances too — not just
 * with a label.
 */
export function TypicalStrategySheetContent({
  strategy,
}: TypicalStrategySheetContentProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-6 px-6 pb-8 pt-2"
      data-testid="typical-strategy-sheet"
    >
      <div className="flex flex-col gap-3">
        <span
          className={cn(
            "self-start rounded-full px-3 py-1 text-xs font-medium",
            TYPICAL_STRATEGY_PILL_CLASS[strategy.tone],
          )}
          data-testid="typical-strategy-sheet-basis"
        >
          {strategy.pillLabel}
        </span>
        <p className="text-sm text-foreground" data-testid="typical-strategy-summary">
          {strategy.summary}
        </p>
      </div>

      {strategy.filters.length > 0 ? (
        <Section title="Matched on">
          <DetailRows rows={strategy.filters} testId="typical-strategy-filters" />
        </Section>
      ) : null}

      {strategy.breakdownLabel ? (
        <Section title="By stage">
          <p className="text-sm text-muted-foreground">
            {strategy.breakdownLabel}
          </p>
          <DetailRows
            rows={strategy.breakdown}
            testId="typical-strategy-breakdown"
          />
        </Section>
      ) : null}

      <Section title="How it is measured">
        <DetailRows rows={strategy.method} testId="typical-strategy-method" />
      </Section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        The same match sets each stage&rsquo;s share of the time budget, so a
        closer match changes the allowances as well as the typical shown.
      </p>
    </div>
  );
}
