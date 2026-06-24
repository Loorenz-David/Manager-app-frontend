import { useEffect } from "react";
import { PullToRefresh, useScrollVisibility } from "@beyo/ui";
import { cn } from "@beyo/lib";

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
  UpholsteryOrderingProvider,
  useUpholsteryOrderingContext,
} from "../providers/UpholsteryOrderingProvider";

const HEADER_INDICATOR_OFFSET = 120;
const CONTENT_TOP_OFFSET_CLASS = "pt-[122px]";

function Content(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useUpholsteryOrderingContext();
  const { scrollRef, isHidden: isCompact } = useScrollVisibility({
    mode: "relative",
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="upholstery-ordering-slide-page"
    >
      <div className="absolute inset-x-0 top-0 z-10">
        <UpholsteryOrderingHeader
          countsError={controller.countsError}
          isCompact={isCompact}
          isLoading={controller.isBackgroundLoading}
          mode={controller.mode}
          needsCount={controller.needsCount}
          ordersCount={controller.ordersCount}
          searchInput={controller.searchInput}
          onBack={controller.close}
          onModeChange={controller.setMode}
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
        <div className={CONTENT_TOP_OFFSET_CLASS}>
          {controller.isInitialLoading ? (
            <div className="flex flex-col gap-3 px-0 pb-32 pt-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <OrderingSkeleton key={index} />
              ))}
            </div>
          ) : controller.isError ? (
            <OrderingErrorState onRetry={controller.retry} />
          ) : controller.mode === "needs" &&
            controller.shortageCards.length === 0 ? (
            <OrderingEmptyState
              hasSearch={controller.searchInput.trim().length > 0}
              mode="needs"
            />
          ) : controller.mode === "orders" &&
            controller.orderCards.length === 0 ? (
            <OrderingEmptyState
              hasSearch={controller.searchInput.trim().length > 0}
              mode="orders"
            />
          ) : (
            <div className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2">
              {controller.mode === "needs"
                ? controller.shortageCards.map((card) => (
                    <ShortageCard
                      key={card.upholsteryId}
                      card={card}
                      onCreate={controller.openCreateOrder}
                      onOpen={controller.openShortageDetail}
                    />
                  ))
                : controller.orderCards.map((card) => (
                    <OrderCard
                      key={card.orderId}
                      card={card}
                      onOpen={controller.openOrderDetail}
                      onReceive={controller.openReceiveOrder}
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
              ) : null}
            </div>
          )}
        </div>
      </PullToRefresh>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          isCompact ? "translate-y-full" : "translate-y-0",
        )}
      >
        <div className="px-4 py-3.5">
          <button
            className="w-full rounded-2xl bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm border border-between-border"
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

export function UpholsteryOrderingSlidePage(): React.JSX.Element {
  return (
    <UpholsteryOrderingProvider>
      <Content />
    </UpholsteryOrderingProvider>
  );
}
