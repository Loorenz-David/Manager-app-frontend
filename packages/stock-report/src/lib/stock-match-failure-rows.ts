import type { StockMatchFailure } from "../api/stock-report-api";
import { formatStockPropertyValues } from "../stock-report.types";

/**
 * The em dash a cell shows when there is genuinely nothing to put in it. It is
 * a value, not a placeholder for one the client failed to read.
 */
export const STOCK_MATCH_NO_VALUE = "—";

const INVALID_CRITERION = "Invalid criterion";

/** One failed criterion, ready to render as Property · Asked · Item. */
export type StockMatchFailureRow = {
  /** The criterion key — React key and testid suffix, never shown. */
  key: string;
  /** The criterion, in the user's words: `Wood group`. */
  label: string;
  /** What the stock need accepts: `Light / Dark`. */
  asked: string;
  /** What the item brought: `Teak`. */
  item: string;
  /** Carried through for test ids and anything a11y needs to distinguish. */
  reason: string;
};

/**
 * `wood_group` → `Wood group`. Sentence case, not the board tags' title case:
 * the label sits in a column of its own here rather than in front of a colon,
 * and `Wood Group` beside a plain `Teak` reads like a proper noun.
 */
function toLabel(key: string): string {
  const words = key.replaceAll("_", " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function askedColumn(failure: StockMatchFailure): string {
  // The criterion itself is malformed, so there is no set of accepted values to
  // report. Saying so beats rendering an empty list as "accepts nothing".
  if (failure.reason === "criterion_not_understood") return INVALID_CRITERION;
  return failure.accepted_values.length > 0
    ? formatStockPropertyValues(failure.accepted_values)
    : STOCK_MATCH_NO_VALUE;
}

function itemColumn(failure: StockMatchFailure): string {
  if (failure.reason === "criterion_not_understood") return STOCK_MATCH_NO_VALUE;
  if (failure.item_values.length === 0) return STOCK_MATCH_NO_VALUE;
  const values = formatStockPropertyValues(failure.item_values);
  // No derived group exists for what the item holds, so the raw value is all
  // there is — labelled, or it would read as a group that simply did not match.
  return failure.reason === "no_group_for_value"
    ? `No known group: ${values}`
    : values;
}

/**
 * Turns the backend's failed criteria into comparison rows.
 *
 * Only failures arrive and only failures are shown — a criterion that matched
 * is not the user's problem. Both columns speak the criterion's own vocabulary
 * because the backend already mapped the item's value into it; nothing here
 * improves a value, only formats it. An unrecognised `reason` still renders its
 * two columns rather than blanking the row.
 */
export function toStockMatchFailureRows(
  failures: readonly StockMatchFailure[],
): StockMatchFailureRow[] {
  return failures.map((failure) => ({
    key: failure.key,
    label: toLabel(failure.key),
    asked: askedColumn(failure),
    item: itemColumn(failure),
    reason: failure.reason,
  }));
}
