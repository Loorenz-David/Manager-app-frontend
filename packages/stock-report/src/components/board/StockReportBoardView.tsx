import { cn } from "@beyo/lib";
import type { ReactNode } from "react";
import { PullToRefresh } from "@beyo/ui";

import type {
  StockNeedCardData,
  StockReportBoardBucket,
  StockReportLoadStatus,
} from "../../stock-report.types";
import { StockNeedSortableList } from "./StockNeedSortableList";
import { StockReportBoardFab } from "./StockReportBoardFab";
import {
  StockReportBoardEmptyState,
  StockReportBoardErrorState,
  StockReportBoardSkeleton,
} from "./StockReportBoardStates";
import { StockReportBucketPicker } from "./StockReportBucketPicker";
import { StockReportSearchRow } from "./StockReportSearchRow";

export type StockReportBoardViewProps = {
  /**
   * Rendered at the top of the scroll content, above the picker, so a back
   * row scrolls away with the board instead of sitting over it (owner,
   * 2026-09-26).
   */
  header?: ReactNode;
  /**
   * Classes for the bucket-picker / search block, e.g. a top inset. The
   * shared view carries none: a tab page adds its own (owner, 2026-09-26),
   * and the slide pages' in-scroll header row already spaces it.
   */
  controlsClassName?: string;
  buckets: readonly StockReportBoardBucket[];
  bucket: StockReportBoardBucket;
  onBucketChange: (bucket: StockReportBoardBucket) => void;

  searchValue: string;
  onSearchChange: (value: string) => void;
  activeFilterCount: number;
  onFilterPress: () => void;

  cards: readonly StockNeedCardData[];
  status: StockReportLoadStatus;
  errorMessage?: string;
  onRetry?: () => void;
  onRefresh: () => Promise<void> | void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onShowMore?: () => Promise<void> | void;

  onCardPress: (stockNeedId: string) => void;

  /**
   * Whether this role may reorganise at all. Necessary for the FAB but not
   * sufficient — the Unset bucket has no order to express, so it shows none.
   */
  canReorganise: boolean;
  isReorganiseMode: boolean;
  onToggleReorganise: () => void;
  onSetPriority: (stockNeedId: string) => void;
  /** "Put this row where that one is" — see `StockNeedSortableList`. */
  onReorder: (stockNeedId: string, targetStockNeedId: string) => void;
  /** Drag off while a reorder is in flight (§12B B16). */
  reorderDisabled?: boolean;
};

export function StockReportBoardView({
  header,
  controlsClassName,
  buckets,
  bucket,
  onBucketChange,
  searchValue,
  onSearchChange,
  activeFilterCount,
  onFilterPress,
  cards,
  status,
  errorMessage,
  onRetry,
  onRefresh,
  hasMore = false,
  isLoadingMore = false,
  onShowMore,
  onCardPress,
  canReorganise,
  isReorganiseMode,
  onToggleReorganise,
  onSetPriority,
  onReorder,
  reorderDisabled = false,
}: StockReportBoardViewProps): React.JSX.Element {
  // Unprioritised rows have no order to express: there is nothing to drag and
  // so nothing to enter a mode for. Their one action — giving the row a
  // priority — is offered on every card outright, and the FAB is not rendered
  // at all (owner, 2026-09-22). The All bucket mixes every group, so a drop
  // there names no position either.
  const isSortableBucket = bucket !== "unset" && bucket !== "all";
  const showFab = canReorganise && isSortableBucket;

  return (
    <div className="relative min-h-0 flex-1" data-testid="stock-report-board">
      <PullToRefresh
        className="absolute inset-0"
        // No `scrollRef`: PullToRefresh then owns the scroll container and
        // registers it for scroll visibility, which is the only package-legal
        // way for a tab page to do so (§12B B10).
        //
        // Pull is off while reorganise mode is on, so pulling and dragging
        // never compete for the same gesture.
        disabled={isReorganiseMode}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        onRefresh={onRefresh}
      >
        <div>
          {header}
          <div className={cn("flex flex-col gap-3.5 px-4", controlsClassName)}>
            <StockReportBucketPicker
              buckets={buckets}
              value={bucket}
              onChange={onBucketChange}
            />
            <StockReportSearchRow
              activeFilterCount={activeFilterCount}
              value={searchValue}
              onChange={onSearchChange}
              onFilterPress={onFilterPress}
            />
          </div>

          <div className="px-4 pb-[calc(var(--safe-bottom,0px)+7rem)] pt-5">
            {status === "loading" ? <StockReportBoardSkeleton /> : null}

            {status === "error" ? (
              <StockReportBoardErrorState
                message={errorMessage}
                onRetry={onRetry}
              />
            ) : null}

            {/* The list stays mounted at zero cards. The last row's exit plays
             * inside it, and unmounting the list would cut that animation off —
             * the empty state arrives beside the leaving row, not instead of
             * it. */}
            {status === "ready" ? (
              <StockNeedSortableList
                cards={cards}
                disabled={reorderDisabled}
                isReorganiseMode={isReorganiseMode}
                sortable={isSortableBucket}
                onCardPress={onCardPress}
                onReorder={onReorder}
                onSetPriority={onSetPriority}
              />
            ) : null}

            {/* This control deliberately sits outside StockNeedSortableList's
             * DndContext. It cannot become a drop target or participate in the
             * sortable item geometry while a row is being dragged. */}
            {status === "ready" && hasMore ? (
              <button
                className="mt-4 w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground disabled:opacity-50"
                data-testid="stock-report-board-show-more"
                disabled={isLoadingMore}
                type="button"
                onClick={() => void onShowMore?.()}
              >
                {isLoadingMore ? "Loading…" : "Show more"}
              </button>
            ) : null}

            {status === "ready" && cards.length === 0 ? (
              <StockReportBoardEmptyState />
            ) : null}
          </div>
        </div>
      </PullToRefresh>

      {showFab ? (
        <StockReportBoardFab
          isReorganiseMode={isReorganiseMode}
          onToggleReorganise={onToggleReorganise}
        />
      ) : null}
    </div>
  );
}
