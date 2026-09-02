import type {
  TypicalStrategyCriterionRow,
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
 * The item's criteria under a heading that describes rather than claims.
 *
 * Only the dropped rows are flagged. Marking every row would put "Used" beside
 * five criteria on the common full-match case for no gain; the note above the
 * table carries that case, and the flags carry the one that matters — a
 * criterion the reader can see but the measurement never applied.
 */
function CriterionRows({
  note,
  rows,
}: {
  note: string | null;
  rows: TypicalStrategyCriterionRow[];
}): React.JSX.Element {
  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      data-testid="typical-strategy-criteria"
    >
      <div className="px-4 pb-3 pt-4">
        <h3 className="font-mono text-xs uppercase tracking-wider text-slate-500">
          This item
        </h3>
        {note ? <p className="mt-1.5 text-sm text-slate-500">{note}</p> : null}
      </div>
      <table className="w-full table-fixed border-collapse border-t border-slate-100 text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={`${row.label}-${row.value}`}
              data-status={row.status}
              data-testid={`typical-strategy-criterion-${row.label
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              <th
                className="w-1/2 px-4 py-3 text-left font-normal text-slate-500"
                scope="row"
              >
                {row.label}
              </th>
              <td className="px-4 py-3 text-right">
                <span
                  className={cn(
                    "font-medium",
                    row.status === "not_used"
                      ? "text-slate-400 line-through decoration-slate-300"
                      : "text-slate-950",
                  )}
                >
                  {row.value}
                </span>
                {row.status === "not_used" ? (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    Not used
                  </span>
                ) : null}
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
 * with a label. It is basis-specific, because "a closer match" is empty advice
 * to a reader who was just told they did not get one.
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

      {strategy.criteria.length > 0 ? (
        <CriterionRows note={strategy.criteriaNote} rows={strategy.criteria} />
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

      <p
        className="text-xs leading-relaxed text-muted-foreground"
        data-testid="typical-strategy-budget-note"
      >
        {strategy.budgetNote}
      </p>
    </div>
  );
}
