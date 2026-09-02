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
  title,
  description,
  rows,
  testId,
}: {
  title: string;
  description?: string | null;
  rows: TypicalStrategyDetailRow[];
  testId: string;
}): React.JSX.Element {
  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      data-testid={testId}
    >
      <div className="px-4 pb-3 pt-4">
        <h3 className="font-mono text-xs uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        {description ? (
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      <table className="w-full table-fixed border-collapse border-t border-slate-100 text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={`${row.label}-${row.value}`}>
              <th
                className="w-1/2 px-4 py-3 text-left font-normal text-slate-500"
                scope="row"
              >
                {row.label}
              </th>
              <td className="px-4 py-3 text-right font-medium text-slate-950">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <DetailRows
          rows={strategy.filters}
          testId="typical-strategy-filters"
          title="Matched on"
        />
      ) : null}

      {strategy.breakdownLabel ? (
        <DetailRows
          description={strategy.breakdownLabel}
          rows={strategy.breakdown}
          testId="typical-strategy-breakdown"
          title="By stage"
        />
      ) : null}

      <DetailRows
        rows={strategy.method}
        testId="typical-strategy-method"
        title="How it is measured"
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        The same match sets each stage&rsquo;s share of the time budget, so a
        closer match changes the allowances as well as the typical shown.
      </p>
    </div>
  );
}
