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

import { OrderCard } from "../components/OrderCard";
import {
  OrderingEmptyState,
  OrderingErrorState,
  OrderingSkeleton,
} from "../components/OrderingStates";
import { ShortageCard } from "../components/ShortageCard";
import { UpholsteryOrderingHeader } from "../components/UpholsteryOrderingHeader";
import {
  type OrderingMode,
  type UpholsteryOrderingController,
} from "../controllers/use-upholstery-ordering.controller";
import {
  UpholsteryOrderingProvider,
  useUpholsteryOrderingContext,
} from "../providers/UpholsteryOrderingProvider";

const BODY_MIN_HEIGHT_CLASS = "min-h-[calc(100dvh-7rem)]";

type OrderingPaneProps = {
  controller: UpholsteryOrderingController;
  mode: OrderingMode;
};

function OrderingPane({
  controller,
  mode,
}: OrderingPaneProps): React.JSX.Element {
  const isNeeds = mode === "needs";
  const hasCards = isNeeds
    ? controller.shortageCards.length > 0
    : controller.orderCards.length > 0;

  if (controller.isInitialLoadingByMode[mode]) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <OrderingSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (controller.isErrorByMode[mode]) {
    return (
      <OrderingErrorState
        onRetry={() => void controller.retryByMode[mode]()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <AnimatedRemovalGroup>
        {isNeeds
          ? controller.shortageCards.map((card) => (
              <AnimatedRemovalItem key={card.upholsteryId} gapPx={12}>
                <ShortageCard
                  card={card}
                  onOpen={controller.openShortageDetail}
                />
              </AnimatedRemovalItem>
            ))
          : controller.orderCards.map((card) => (
              <AnimatedRemovalItem key={card.orderId} gapPx={12}>
                <OrderCard card={card} onOpen={controller.openOrderDetail} />
              </AnimatedRemovalItem>
            ))}
      </AnimatedRemovalGroup>

      {!hasCards ? (
        <OrderingEmptyState
          hasSearch={controller.searchInput.trim().length > 0}
          mode={mode}
        />
      ) : controller.hasMoreByMode[mode] &&
        !controller.isPaginationErrorByMode[mode] ? (
        <div className="flex justify-center pb-6">
          <button
            className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
            disabled={controller.isFetchingMoreByMode[mode]}
            type="button"
            onClick={controller.loadMoreByMode[mode]}
          >
            {controller.isFetchingMoreByMode[mode]
              ? "Loading..."
              : "Load more"}
          </button>
        </div>
      ) : controller.isPaginationErrorByMode[mode] ? (
        <div className="flex justify-center gap-2 pb-6">
          <span className="text-sm text-muted-foreground">
            Failed to load more.
          </span>
          <button
            className="text-sm text-primary"
            type="button"
            onClick={() => void controller.retryByMode[mode]()}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Content(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useUpholsteryOrderingContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  // The header mode pills follow the finger: a committed swipe repaints them
  // at the release, one settle before the mode actually changes.
  const { paneId: displayedMode, onCommit } = useCommittedPaneId({
    activeId: controller.mode,
    paneIds: controller.modes,
  });
  const shouldDismissInsteadOfGoingBack =
    controller.mode === "orders" &&
    !controller.isInitialLoadingByMode.needs &&
    !controller.isErrorByMode.needs &&
    controller.shortageCards.length === 0;

  // The page carries its own back chevron in the header, so the surface header
  // stays hidden on every breakpoint.
  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="upholstery-ordering-slide-page"
    >
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        {/* The header and both independent list panes share one scroll body.
         * This positioned wrapper anchors overlapping panes and drag ghosts;
         * PullToRefresh clips their horizontal overflow. The header renders
         * through the stack (still in flow, still scrolling with the body) so
         * a slide whose landing reveals it previews it in the ghost instead
         * of popping it in after the swap. */}
        <div className="relative" data-testid="upholstery-ordering-scroll">
          <SlideStack
            activeId={controller.mode}
            header={
              <UpholsteryOrderingHeader
                countsError={controller.countsError}
                isLoading={controller.isBackgroundLoading}
                mode={displayedMode}
                needsCount={controller.needsCount}
                ordersCount={controller.ordersCount}
                searchInput={controller.searchInput}
                onBack={header?.requestClose ?? controller.close}
                onModeChange={controller.setMode}
                onSearchChange={controller.setSearchInput}
              />
            }
            onBack={
              shouldDismissInsteadOfGoingBack
                ? undefined
                : controller.goToPreviousMode
            }
            onCommit={onCommit}
            onForward={controller.goToNextMode}
          >
            {controller.modes.map((mode) => (
              <SlideStackPane
                key={mode}
                className={`${BODY_MIN_HEIGHT_CLASS} pb-[calc(var(--safe-bottom,0px)+1.5rem)]`}
                data-testid={`upholstery-ordering-body-${mode}`}
                id={mode}
              >
                <OrderingPane
                  controller={controller}
                  mode={mode}
                />
              </SlideStackPane>
            ))}
          </SlideStack>
        </div>
      </PullToRefresh>
    </div>
  );
}

export function UpholsteryOrderingSlidePage(): React.JSX.Element {
  return (
    <UpholsteryOrderingProvider>
      <Content />
    </UpholsteryOrderingProvider>
  );
}
