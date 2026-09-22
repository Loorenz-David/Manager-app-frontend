import { PullToRefresh } from "@beyo/ui";

import type {
  FulfilmentQuantities,
  StockReportAssignmentCardData,
  StockReportLoadStatus,
} from "../../stock-report.types";
import { StockReportAddItemButton } from "./StockReportAddItemButton";
import { StockReportAssignmentList } from "./StockReportAssignmentList";
import {
  StockReportAssignmentListSkeleton,
  StockReportAssignmentsEmptyState,
  StockReportDetailErrorState,
  StockReportMissingNotice,
} from "./StockReportDetailStates";
import { StockNeedSummaryCard } from "./StockNeedSummaryCard";

export type StockReportDetailViewProps = {
  /** The category name. Used for the picture's alt text, never as a title. */
  title: string;
  imageUrl: string | null;
  propertyTags: readonly string[];
  quantities: FulfilmentQuantities;

  assignments: readonly StockReportAssignmentCardData[];
  status: StockReportLoadStatus;
  errorMessage?: string;
  onRetry?: () => void;
  onRefresh: () => Promise<void> | void;

  /** Gates the Add-item button. Sellers cannot assign; workers: wood only. */
  canAssign: boolean;
  onAddItem: () => void;

  onTapCard?: (taskId: string) => void;
  onTapImage?: (taskId: string) => void;
  onTapActions?: (taskId: string, itemId: string | null) => void;

  /** The stock need disappeared while this page was open (intention §6.2). */
  isMissing?: boolean;
};

/**
 * The detail page's body.
 *
 * There is **no back-arrow header bar**: the slide surface supplies its own
 * header and its own back/close gestures, and the title is set on it at
 * runtime by the controller (intention §6.3, §12B B19). The summary card and
 * everything below it scroll as one document.
 */
export function StockReportDetailView({
  title,
  imageUrl,
  propertyTags,
  quantities,
  assignments,
  status,
  errorMessage,
  onRetry,
  onRefresh,
  canAssign,
  onAddItem,
  onTapCard,
  onTapImage,
  onTapActions,
  isMissing = false,
}: StockReportDetailViewProps): React.JSX.Element {
  if (isMissing) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-testid="stock-report-detail"
      >
        <StockReportMissingNotice />
      </div>
    );
  }

  return (
    <div
      className="relative h-full min-h-0 flex-1"
      data-testid="stock-report-detail"
    >
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        onRefresh={onRefresh}
      >
        <div className="pb-[calc(var(--safe-bottom,0px)+1.5rem)]">
          <div className="px-4 ">
            <StockNeedSummaryCard
              imageUrl={imageUrl}
              propertyTags={propertyTags}
              quantities={quantities}
              title={title}
            />

            {canAssign ? (
              <div className="mt-3">
                <StockReportAddItemButton onPress={onAddItem} />
              </div>
            ) : null}
          </div>

          <div
            aria-hidden="true"
            className="mt-4 h-px w-full bg-between-border"
          />

          {status === "loading" ? (
            <StockReportAssignmentListSkeleton />
          ) : status === "error" ? (
            <StockReportDetailErrorState
              message={errorMessage}
              onRetry={onRetry}
            />
          ) : (
            // The list carries the top padding the section header used to
            // provide, so the first card still clears the divider.
            <div className="pt-4">
              {assignments.length === 0 ? (
                <StockReportAssignmentsEmptyState />
              ) : (
                <StockReportAssignmentList
                  assignments={assignments}
                  onTapActions={onTapActions}
                  onTapCard={onTapCard}
                  onTapImage={onTapImage}
                />
              )}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
