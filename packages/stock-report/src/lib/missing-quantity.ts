import type { StockReportItemSnapshot } from "../stock-report.types";

export type MissingQuantityBounds = {
  /**
   * The most that can be marked missing: what the frozen demand still leaves
   * uncovered once queued, in-progress and fulfilled units are counted (§5.7).
   * The backend refuses anything above it with
   * `STOCK_REPORT_MISSING_EXCEEDS_CEILING`.
   */
  ceiling: number;
  /** Currently registered as missing. */
  missing: number;
  /** Still unregistered: `ceiling − missing`. Zero means nothing left to mark. */
  markable: number;
};

/**
 * The arithmetic behind the detail page's Mark / Unmark missing switch. Uses
 * the snapshot's own `quantity_awaiting` — the wire value that includes the
 * units Scanner already resolved — because that is the number the backend's
 * ceiling is computed from.
 */
export function missingQuantityBounds(
  snapshot: Pick<
    StockReportItemSnapshot,
    | "quantity_requested"
    | "quantity_in_queue"
    | "quantity_in_progress"
    | "quantity_awaiting"
    | "quantity_missing"
  >,
): MissingQuantityBounds {
  const covered =
    snapshot.quantity_in_queue +
    snapshot.quantity_in_progress +
    snapshot.quantity_awaiting;
  const ceiling = Math.max(0, snapshot.quantity_requested - covered);
  const missing = Math.max(0, snapshot.quantity_missing);
  return { ceiling, missing, markable: Math.max(0, ceiling - missing) };
}
