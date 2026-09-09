import {
  PRODUCTION_TIME_VIEWPORT_ROW_COUNT,
  selectAnchorRowIndex,
  type ProductionTimeRowViewModel,
  type ProductionTimeUnit,
} from "../../lib/production-time-view-model";
import { ProductionTimeRow } from "./ProductionTimeRow";
import { useSnapScroll } from "./use-snap-scroll";

export type ProductionTimeRowsViewportProps = {
  rows: readonly ProductionTimeRowViewModel[];
  /** Passed straight through — the window itself has no figures of its own. */
  unit?: ProductionTimeUnit;
  showTypicalComparison?: boolean;
};

/**
 * The collapsed pipeline: every row is rendered, but only three at a time show
 * through a fixed window that scrolls like a phone clock's time picker — a
 * native scroll container whose mandatory snap clamps every fling to a row
 * top, opened on the anchor row so the live stage never needs hunting for
 * (`useSnapScroll` keeps the window's height and anchor; the platform keeps
 * the physics).
 *
 * The expanded card does not use this — it lays the rows out flat and hands
 * scrolling back to the host page.
 *
 * `overscroll-y-auto` rather than `contain`: at either end of the list the
 * scroll has to chain up to the host page, or the card becomes a dead zone
 * the page cannot be scrolled through. Containing it here would also be
 * redundant — the slide page's own scroller already carries
 * `overscroll-y-none`, so the chain stops there and never reaches the
 * document (no browser pull-to-refresh, no page rubber-band).
 */
export function ProductionTimeRowsViewport({
  rows,
  unit = "total",
  showTypicalComparison = false,
}: ProductionTimeRowsViewportProps): React.JSX.Element {
  const { viewportRef, listRef } = useSnapScroll({
    rowCount: rows.length,
    visibleRowCount: PRODUCTION_TIME_VIEWPORT_ROW_COUNT,
    anchorIndex: selectAnchorRowIndex(rows),
  });

  return (
    <div
      ref={viewportRef}
      aria-label={`Production stages, ${rows.length} total.`}
      className="snap-y snap-mandatory overflow-y-auto overscroll-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      data-testid="production-time-rows-viewport"
      role="group"
      tabIndex={0}
    >
      <div
        ref={listRef}
        className="flex flex-col divide-y divide-border *:snap-start"
      >
        {rows.map((row) => (
          <ProductionTimeRow
            key={row.key}
            row={row}
            showTypicalComparison={showTypicalComparison}
            unit={unit}
          />
        ))}
      </div>
    </div>
  );
}
