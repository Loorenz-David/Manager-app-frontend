import type {
  TypicalStrategyCriterionRow,
  TypicalStrategyCriterionStatus,
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

/** The groups, strongest claim first. A group with no rows does not render. */
const CRITERION_GROUPS = [
  { status: "used", title: "Used to measure" },
  { status: "not_used", title: "Not used" },
  { status: "unknown", title: "Not known" },
] as const;

function CriterionGroup({
  rows,
  status,
  title,
}: {
  rows: TypicalStrategyCriterionRow[];
  status: TypicalStrategyCriterionStatus;
  title: string;
}): React.JSX.Element | null {
  if (rows.length === 0) {
    return null;
  }

  const applied = status === "used";

  return (
    <div
      className={cn(
        "border-t border-slate-100",
        applied ? null : "bg-slate-50/80",
      )}
      data-testid={`typical-strategy-criteria-${status}`}
    >
      <h4 className="px-4 pb-1 pt-3 font-mono text-[11px] uppercase tracking-wider text-slate-400">
        {title}
      </h4>
      <table className="w-full table-fixed border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.label}-${row.value}`}
              data-status={row.status}
              data-testid={`typical-strategy-criterion-${row.label
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              <th
                className="w-1/2 px-4 py-2.5 text-left font-normal text-slate-500"
                scope="row"
              >
                {row.label}
              </th>
              <td
                className={cn(
                  "px-4 py-2.5 text-right font-medium",
                  applied ? "text-slate-950" : "text-slate-400",
                )}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The item's criteria under a heading that describes rather than claims.
 *
 * Grouped rather than tagged row by row. A per-row "Not used" chip had to
 * share a fixed half-width cell with the value and wrapped into it; grouping
 * says the same thing once, in a place with room for it, and lets a reader see
 * the split without reading every row.
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
      {CRITERION_GROUPS.map(({ status, title }) => (
        <CriterionGroup
          key={status}
          rows={rows.filter((row) => row.status === status)}
          status={status}
          title={title}
        />
      ))}
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
