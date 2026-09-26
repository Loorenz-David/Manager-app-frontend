import { Suspense, useEffect, useState } from "react";
import { loadStockReportRouteEntryPage } from "@beyo/stock-report";
import { lazyWithPreload, SlideStack, SlideStackPane } from "@beyo/ui";

import { PageSkeleton } from "@/components/ui/PageSkeleton";

import { StockReportBoardBackRow } from "./StockReportBoardBackRow";
import { StockReportHubView } from "./StockReportHubView";

const stockReportBoardEntry = lazyWithPreload(loadStockReportRouteEntryPage);

type StockReportPane = "hub" | "board";

/**
 * The manager's stock report tab: a hub of stock-report capabilities, with the
 * shared board stacked on top of it.
 *
 * Only the back drag is wired. Forward navigation is a hub tap, so a leftward
 * swipe on the hub falls through to the shell's tab stack — and the board is
 * never mounted as a drag ghost, which would run its query and preload effects
 * twice.
 */
export function StockReportManagerStack(): React.JSX.Element {
  const [activePane, setActivePane] = useState<StockReportPane>("hub");

  // The board's chunk is fetched while the hub is showing, so the tap renders
  // it synchronously instead of sliding in a skeleton.
  useEffect(() => {
    void stockReportBoardEntry.preload();
  }, []);

  function handleOpenBoard() {
    setActivePane("board");
  }

  function handleBack() {
    setActivePane("hub");
  }

  return (
    <div className="relative h-full overflow-hidden" data-testid="stock-report-manager-stack">
      <SlideStack activeId={activePane} onBack={handleBack}>
        <SlideStackPane className="h-full overflow-hidden" id="hub">
          <div className="h-full overflow-y-auto">
            <StockReportHubView onOpenBoard={handleOpenBoard} />
          </div>
        </SlideStackPane>

        {/* contain-[paint]: the board's fixed FAB anchors to this pane, so it
         * leaves with the board instead of resolving against the tab pane. */}
        <SlideStackPane className="h-full overflow-hidden contain-[paint]" id="board">
          <div className="flex h-full min-h-0 flex-col">
            <StockReportBoardBackRow onBack={handleBack} />
            <Suspense fallback={<PageSkeleton />}>
              <stockReportBoardEntry.Component />
            </Suspense>
          </div>
        </SlideStackPane>
      </SlideStack>
    </div>
  );
}
