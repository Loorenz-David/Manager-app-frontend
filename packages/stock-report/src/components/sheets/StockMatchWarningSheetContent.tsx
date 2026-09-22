import { AlertTriangle, Ban } from "lucide-react";

import {
  STOCK_MATCH_NO_VALUE,
  type StockMatchFailureRow,
} from "../../lib/stock-match-failure-rows";
import { MATCH_WARNING_BANNER_CLASS } from "../../lib/stock-report-theme";

type StockMatchWarningSheetCommonProps = {
  /**
   * The identifier resolved to an item that is already registered, so the
   * backend judged that stored item rather than what the form sent
   * (`values_source: "stored"` — intention §8.5). Saying so keeps a user who
   * changed the category or quantity from being misled.
   */
  checkedAgainstStoredItem?: boolean;
  /** Clears the identifier and everything the lookup filled in (§12A A7). */
  onChangeItem: () => void;
};

export type StockMatchWarningSheetContentProps =
  | (StockMatchWarningSheetCommonProps & {
      kind: "blocked";
      /** Ready-made message for the refusal reason. No codes are mapped here. */
      reasonText: string;
    })
  | (StockMatchWarningSheetCommonProps & {
      kind: "warning";
      failures: readonly StockMatchFailureRow[];
      /** The user's explicit override, armed for the first create call. */
      onContinue: () => void;
    });

const BUTTON_BASE =
  "flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-semibold";

/**
 * Property wider than the two value columns: a criterion name is the longest
 * text in the row and the one the eye lands on first.
 */
const COMPARISON_GRID = "grid grid-cols-[1.1fr_1fr_1fr] gap-x-3";
const CELL_BASE = "min-w-0 break-words text-sm";

/**
 * One value. An empty cell is an answer — the item has nothing here — so it
 * says so rather than leaving the reader to wonder whether the check failed.
 */
function ValueCell({
  className,
  testId,
  value,
}: {
  className: string;
  testId: string;
  value: string;
}): React.JSX.Element {
  const isAbsent = value === STOCK_MATCH_NO_VALUE;
  return (
    <span
      aria-label={isAbsent ? "No value" : undefined}
      className={`${CELL_BASE} ${className}`}
      data-testid={testId}
    >
      {value}
    </span>
  );
}

/**
 * What the compatibility check has to say about the item being added.
 *
 * Two views, one component: a **block**, whose only way out is changing the
 * item, and a **soft warning**, which lists what does not match and asks for an
 * explicit *Continue*.
 *
 * The warning does not explain a mismatch in prose. It shows, per failed
 * criterion, what the stock need asked for beside what the item actually has,
 * and leaves the judgement to the person who can see both.
 *
 * It renders no close affordance on purpose — the sheet is opened locked and
 * the user must choose (§12A A6); its buttons are the visible way out that
 * `33_vaul_drawer.md` requires. All copy arrives ready-made: refusal reasons
 * come mapped, and the rows come from `toStockMatchFailureRows`.
 */
export function StockMatchWarningSheetContent(
  props: StockMatchWarningSheetContentProps,
): React.JSX.Element {
  const storedNote = (inkClass: string) =>
    props.checkedAgainstStoredItem ? (
      <p
        className={`text-xs font-medium ${inkClass}`}
        data-testid="stock-match-stored-note"
      >
        Checked against the item already registered.
      </p>
    ) : null;

  if (props.kind === "blocked") {
    return (
      <div
        className="flex flex-col gap-4 px-4 pb-2"
        data-testid="stock-match-warning-blocked"
      >
        <div className="flex items-start gap-3">
          <Ban
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-destructive"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              This item cannot be added
            </p>
            <p className="text-sm text-muted-foreground">{props.reasonText}</p>
            {storedNote("text-muted-foreground")}
          </div>
        </div>

        <button
          className={`${BUTTON_BASE} bg-primary text-card`}
          data-testid="stock-match-change-item"
          type="button"
          onClick={props.onChangeItem}
        >
          Change item
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 px-4 pb-2"
      data-testid="stock-match-warning-warning"
    >
      <div
        className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${MATCH_WARNING_BANNER_CLASS}`}
        data-testid="stock-match-warning-banner"
      >
        {/* No colour of its own — it inherits the banner's amber ink. */}
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm font-semibold">This item does not fully match</p>
          {storedNote("text-warning")}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-border bg-soft-container"
        data-testid="stock-match-warning-failures"
      >
        <div
          className={`${COMPARISON_GRID} border-b border-border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`}
        >
          <span>Property</span>
          <span>Asked</span>
          <span>Item</span>
        </div>

        <ul className="divide-y divide-border">
          {props.failures.map((row) => (
            <li
              key={row.key}
              className={`${COMPARISON_GRID} px-3.5 py-3`}
              data-testid={`stock-match-failure-row-${row.key}`}
            >
              <span className={`${CELL_BASE} font-semibold text-foreground`}>
                {row.label}
              </span>
              <ValueCell
                className="text-muted-foreground"
                testId={`stock-match-failure-asked-${row.key}`}
                value={row.asked}
              />
              <ValueCell
                className="font-medium text-foreground"
                testId={`stock-match-failure-item-${row.key}`}
                value={row.item}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <button
          className={`${BUTTON_BASE} border border-border bg-card text-foreground`}
          data-testid="stock-match-change-item"
          type="button"
          onClick={props.onChangeItem}
        >
          Change item
        </button>
        <button
          className={`${BUTTON_BASE} bg-primary text-card`}
          data-testid="stock-match-continue"
          type="button"
          onClick={props.onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
