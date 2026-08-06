import { useEffect, useRef } from "react";
import {
  AnimatedRemovalGroup,
  AnimatedRemovalItem,
  PullToRefresh,
  SlideStack,
  SlideStackPane,
  useCommittedPaneId,
} from "@beyo/ui";

import { useSurfaceHeader } from "@/hooks/use-surface-header";

import { PendingUpholsteryCard } from "../components/PendingUpholsteryCard";
import { PendingUpholsteryEmptyState } from "../components/PendingUpholsteryEmptyState";
import { PendingUpholsteryErrorState } from "../components/PendingUpholsteryErrorState";
import { PendingUpholsteryHeader } from "../components/PendingUpholsteryHeader";
import { PendingUpholsterySkeleton } from "../components/PendingUpholsterySkeleton";
import {
  type PendingUpholsteryController,
  type PendingUpholsteryFilter,
} from "../controllers/use-pending-upholstery.controller";
import {
  PendingUpholsteryProvider,
  usePendingUpholsteryContext,
} from "../providers/PendingUpholsteryProvider";

const BODY_MIN_HEIGHT_CLASS = "min-h-[calc(100dvh-7rem)]";

type PendingUpholsteryPaneProps = {
  filter: PendingUpholsteryFilter;
  controller: PendingUpholsteryController;
};

function PendingUpholsteryPane({
  filter,
  controller,
}: PendingUpholsteryPaneProps): React.JSX.Element {
  const cards = controller.cardsByFilter[filter];
  const isPaginationError = controller.isPaginationErrorByFilter[filter];

  if (controller.isInitialLoadingByFilter[filter]) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <PendingUpholsterySkeleton key={index} />
        ))}
      </div>
    );
  }

  if (controller.isErrorByFilter[filter]) {
    return (
      <PendingUpholsteryErrorState
        onRetry={() => void controller.retryByFilter[filter]()}
      />
    );
  }

  // Keep the removal group mounted when the last row leaves so its exit can
  // finish before the empty state takes over.
  return (
    <div className="flex flex-col gap-3 pt-2">
      <AnimatedRemovalGroup>
        {cards.map((card) => (
          <AnimatedRemovalItem key={card.taskId} gapPx={12}>
            <PendingUpholsteryCard
              card={card}
              onOpenUpholsteryPicker={controller.openUpholsteryPicker}
              onTapActions={controller.openTaskActions}
              onTapCard={controller.openTaskDetail}
              onTapImage={controller.openImageViewer}
            />
          </AnimatedRemovalItem>
        ))}
      </AnimatedRemovalGroup>

      {cards.length === 0 ? (
        <PendingUpholsteryEmptyState
          hasSearch={controller.searchInput.trim().length > 0}
          missingQuantity={filter === "missing_quantity"}
          missingSelection={filter === "missing_selection"}
        />
      ) : controller.hasMoreByFilter[filter] && !isPaginationError ? (
        <div className="flex justify-center pb-6">
          <button
            className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
            disabled={controller.isFetchingMoreByFilter[filter]}
            type="button"
            onClick={controller.loadMoreByFilter[filter]}
          >
            {controller.isFetchingMoreByFilter[filter]
              ? "Loading..."
              : "Load more"}
          </button>
        </div>
      ) : isPaginationError ? (
        <div className="flex justify-center gap-2 pb-6">
          <span className="text-sm text-muted-foreground">
            Failed to load more.
          </span>
          <button
            className="text-sm text-primary"
            type="button"
            onClick={() => void controller.retryByFilter[filter]()}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex justify-center pb-6">
          <span className="text-xs text-muted-foreground">End of list</span>
        </div>
      )}
    </div>
  );
}

function PendingUpholsterySlideContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = usePendingUpholsteryContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  // The header filter pills follow the finger: a committed swipe repaints them
  // at the release, one settle before the filter actually changes.
  const { paneId: displayedFilter, onCommit } = useCommittedPaneId({
    activeId: controller.activeFilter,
    paneIds: controller.filters,
  });
  const shouldDismissInsteadOfGoingBack =
    controller.activeFilter === "missing_quantity" &&
    !controller.isInitialLoadingByFilter.missing_selection &&
    !controller.isErrorByFilter.missing_selection &&
    controller.cardsByFilter.missing_selection.length === 0;

  // The page carries its own back chevron in the header, so the surface header
  // stays hidden on every breakpoint.
  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="pending-upholstery-slide-page"
    >
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        {/* The header and both independent list panes form one scroll body.
         * This positioned wrapper anchors overlapping panes and drag ghosts;
         * PullToRefresh clips their horizontal overflow. The header renders
         * through the stack (still in flow, still scrolling with the body) so
         * a slide whose landing reveals it previews it in the ghost instead
         * of popping it in after the swap. */}
        <div className="relative" data-testid="pending-upholstery-scroll">
          <SlideStack
            activeId={controller.activeFilter}
            header={
              <PendingUpholsteryHeader
                counts={controller.counts}
                countsError={controller.countsError}
                isLoading={controller.isBackgroundLoading}
                missingQuantity={displayedFilter === "missing_quantity"}
                missingSelection={displayedFilter === "missing_selection"}
                searchInput={controller.searchInput}
                onBack={header?.requestClose ?? controller.close}
                onFiltersChange={controller.setFilters}
                onSearchChange={controller.setSearchInput}
              />
            }
            onBack={
              shouldDismissInsteadOfGoingBack
                ? undefined
                : controller.goToPreviousFilter
            }
            onCommit={onCommit}
            onForward={controller.goToNextFilter}
          >
            {controller.filters.map((filter) => (
              <SlideStackPane
                key={filter}
                className={`${BODY_MIN_HEIGHT_CLASS} pb-[calc(var(--safe-bottom,0px)+1.5rem)]`}
                data-testid={`pending-upholstery-body-${filter}`}
                id={filter}
              >
                <PendingUpholsteryPane
                  controller={controller}
                  filter={filter}
                />
              </SlideStackPane>
            ))}
          </SlideStack>
        </div>
      </PullToRefresh>
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
