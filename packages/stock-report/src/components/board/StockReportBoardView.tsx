import { PullToRefresh } from "@beyo/ui";

import type {
  StockNeedBucket,
  StockNeedCardData,
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
  buckets: readonly StockNeedBucket[];
  bucket: StockNeedBucket;
  onBucketChange: (bucket: StockNeedBucket) => void;

  searchValue: string;
  onSearchChange: (value: string) => void;

  cards: readonly StockNeedCardData[];
  status: StockReportLoadStatus;
  errorMessage?: string;
  onRetry?: () => void;
  onRefresh: () => Promise<void> | void;

  onCardPress: (stockNeedId: string) => void;

  /**
   * Whether this role may reorganise at all. Necessary for the FAB but not
   * sufficient — the Unset bucket has no order to express, so it shows none.
   */
  canReorganise: boolean;
  isReorganiseMode: boolean;
  onToggleReorganise: () => void;
  onSetPriority: (stockNeedId: string) => void;
  /** `toIndex` is a 0-based array index — see `StockNeedSortableList`. */
  onReorder: (stockNeedId: string, toIndex: number) => void;
  /** Drag off while a reorder is in flight (§12B B16). */
  reorderDisabled?: boolean;
};

export function StockReportBoardView({
  buckets,
  bucket,
  onBucketChange,
  searchValue,
  onSearchChange,
  cards,
  status,
  errorMessage,
  onRetry,
  onRefresh,
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
  // at all (owner, 2026-09-22).
  const isUnsetBucket = bucket === "unset";
  const showFab = canReorganise && !isUnsetBucket;
  // A row with no priority is having one set; a row already in a bucket is
  // having it changed.
  const priorityActionLabel = isUnsetBucket ? "Set priority" : "Change priority";

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
          <div className="flex flex-col gap-3.5 px-4 pt-4.5">
            <StockReportBucketPicker
              buckets={buckets}
              value={bucket}
              onChange={onBucketChange}
            />
            <StockReportSearchRow
              value={searchValue}
              onChange={onSearchChange}
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

            {status === "ready" && cards.length === 0 ? (
              <StockReportBoardEmptyState />
            ) : null}

            {status === "ready" && cards.length > 0 ? (
              <StockNeedSortableList
                cards={cards}
                disabled={reorderDisabled}
                isReorganiseMode={isReorganiseMode}
                priorityActionLabel={priorityActionLabel}
                sortable={!isUnsetBucket}
                onCardPress={onCardPress}
                onReorder={onReorder}
                onSetPriority={onSetPriority}
              />
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
