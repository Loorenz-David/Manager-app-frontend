import { useEffect } from "react";
import { PullToRefresh, useScrollHide } from "@beyo/ui";

import { useSurfaceHeader } from "@/hooks/use-surface-header";

import { PendingUpholsteryCard } from "../components/PendingUpholsteryCard";
import { PendingUpholsteryEmptyState } from "../components/PendingUpholsteryEmptyState";
import { PendingUpholsteryErrorState } from "../components/PendingUpholsteryErrorState";
import { PendingUpholsteryHeader } from "../components/PendingUpholsteryHeader";
import { PendingUpholsterySkeleton } from "../components/PendingUpholsterySkeleton";
import {
  PendingUpholsteryProvider,
  usePendingUpholsteryContext,
} from "../providers/PendingUpholsteryProvider";

const HEADER_INDICATOR_OFFSET = 120;
const CONTENT_TOP_OFFSET_CLASS = "pt-[122px]";

const FOOTER_STYLE: React.CSSProperties = {
  transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

function PendingUpholsterySlideContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = usePendingUpholsteryContext();
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="pending-upholstery-slide-page"
    >
      <div className="absolute inset-x-0 top-0 z-10">
        <PendingUpholsteryHeader
          counts={controller.counts}
          countsError={controller.countsError}
          isLoading={controller.isBackgroundLoading}
          missingQuantity={controller.missingQuantity}
          missingSelection={controller.missingSelection}
          searchInput={controller.searchInput}
          onBack={controller.close}
          onFiltersChange={controller.setFilters}
          onSearchChange={controller.setSearchInput}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={HEADER_INDICATOR_OFFSET}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div
          className={CONTENT_TOP_OFFSET_CLASS}
          data-testid="pending-upholstery-scroll"
        >
          {controller.isInitialLoading ? (
            <div className="flex flex-col gap-3 px-0 pb-32 pt-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <PendingUpholsterySkeleton key={index} />
              ))}
            </div>
          ) : controller.isError ? (
            <PendingUpholsteryErrorState onRetry={controller.retry} />
          ) : controller.cards.length === 0 ? (
            <PendingUpholsteryEmptyState
              hasSearch={controller.searchInput.trim().length > 0}
              missingQuantity={controller.missingQuantity}
              missingSelection={controller.missingSelection}
            />
          ) : (
            <div className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2">
              {controller.cards.map((card) => (
                <PendingUpholsteryCard
                  key={card.taskId}
                  card={card}
                  onOpenAmountSheet={controller.openAmountSheet}
                  onOpenUpholsteryPicker={controller.openUpholsteryPicker}
                  onTapActions={controller.openTaskActions}
                  onTapCard={controller.openTaskDetail}
                  onTapImage={controller.openImageViewer}
                />
              ))}

              {controller.hasMore && !controller.isPaginationError ? (
                <div className="flex justify-center pb-6">
                  <button
                    className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
                    disabled={controller.isFetchingMore}
                    type="button"
                    onClick={controller.loadMore}
                  >
                    {controller.isFetchingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              ) : controller.isPaginationError ? (
                <div className="flex justify-center gap-2 pb-6">
                  <span className="text-sm text-muted-foreground">
                    Failed to load more.
                  </span>
                  <button
                    className="text-sm text-primary"
                    type="button"
                    onClick={controller.loadMore}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex justify-center pb-6">
                  <span className="text-xs text-muted-foreground">
                    End of list
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Footer — Pattern A: slides down to hide */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 will-change-transform"
        style={{ ...FOOTER_STYLE, pointerEvents: isHidden ? "none" : undefined }}
      >
        <div className="border-t border-border bg-background px-4 py-3.5">
          <button
            className="w-full rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
            type="button"
            onClick={controller.close}
          >
            Close &amp; Back
          </button>
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}

export function PendingUpholsterySlidePage(): React.JSX.Element {
  return (
    <PendingUpholsteryProvider>
      <PendingUpholsterySlideContent />
    </PendingUpholsteryProvider>
  );
}
