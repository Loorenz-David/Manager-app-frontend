import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { PullToRefresh, SearchBar, useScrollVisibility } from "@beyo/ui";
import { cn } from "@beyo/lib";

import { useSurface } from "@/hooks/use-surface";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

import { OrderingItemCard } from "../components/OrderingItemCard";
import {
  OrderingEmptyState,
  OrderingErrorState,
  OrderingSkeleton,
} from "../components/OrderingStates";
import { useDetailItemsController } from "../controllers/use-detail-items.controller";
import { formatMetersValue } from "../lib/format";
import { toOrderCardViewModel } from "../lib/upholstery-ordering-dto";
import { upholsteryOrderingKeys } from "../api/upholstery-ordering-keys";
import {
  UPHOLSTERY_CREATE_ORDER_SLIDE_ID,
  UPHOLSTERY_RECEIVE_ORDER_SLIDE_ID,
  type CreateOrderSurfaceProps,
  type OrderDetailSurfaceProps,
  type ReceiveOrderSurfaceProps,
  type ShortageDetailSurfaceProps,
} from "../surfaces";
import type { OrderCardViewModel, OrderRow, PaginatedRows } from "../types";

const HEADER_INDICATOR_OFFSET = 132;
const CONTENT_TOP_OFFSET_CLASS = "pt-[136px]";

type DetailMode = "shortage" | "order";

function toMillimeterLabel(value: string): string {
  return value.replace(/ m\b/g, " mm");
}

function findOrderRowInCache(
  pages: [readonly unknown[], PaginatedRows<OrderRow> | undefined][],
  orderId: string,
): OrderRow | null {
  for (const [, page] of pages) {
    const row = page?.items.find((candidate) => candidate.client_id === orderId);
    if (row) return row;
  }
  return null;
}

function useLiveOrder(
  order: OrderCardViewModel | null | undefined,
): OrderCardViewModel | null {
  const queryClient = useQueryClient();
  const cachedOrderRow = useSyncExternalStore(
    (onStoreChange) => queryClient.getQueryCache().subscribe(onStoreChange),
    () => {
      if (!order?.orderId) return null;
      return findOrderRowInCache(
        queryClient.getQueriesData<PaginatedRows<OrderRow>>({
          queryKey: upholsteryOrderingKeys.ordersLists(),
        }),
        order.orderId,
      );
    },
    () => null,
  );

  return cachedOrderRow ? toOrderCardViewModel(cachedOrderRow) : (order ?? null);
}

function DetailPage({ mode }: { mode: DetailMode }): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const shortageProps = useSurfaceProps<ShortageDetailSurfaceProps>();
  const orderProps = useSurfaceProps<OrderDetailSurfaceProps>();
  const shortage = shortageProps.shortage;
  const order = orderProps.order;
  const liveOrder = useLiveOrder(order);
  const source = useMemo(
    () =>
      mode === "shortage"
        ? { type: "needs" as const, upholsteryId: shortage?.upholsteryId ?? "" }
        : {
            type: "orders" as const,
            upholsteryIds: liveOrder?.upholsteryId ? [liveOrder.upholsteryId] : [],
            requirementStates: ["ordered"] as const,
          },
    [liveOrder?.upholsteryId, mode, shortage?.upholsteryId],
  );
  const controller = useDetailItemsController(source);
  const { scrollRef, isHidden: isCompact } = useScrollVisibility({
    mode: "relative",
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title =
    mode === "shortage"
      ? (shortage?.name ?? "Upholstery shortage")
      : (liveOrder?.name ?? "Upholstery order");
  const aggregate =
    mode === "shortage"
      ? `${shortage?.itemCount ?? 0} • ${toMillimeterLabel(shortage?.totalAmountLabel ?? "0 m")}`
      : [
          `${liveOrder?.orderAmountLabel ?? "0 m"} ordered`,
          `${liveOrder?.remainingReceivableLabel ?? "0 m"} remaining`,
          controller.selectedCount > 0 ? `${controller.selectedCount} selected` : null,
        ]
          .filter(Boolean)
          .join(" • ");
  const primaryLabel =
    mode === "shortage"
      ? controller.selectedCount > 0
        ? `Order ${toMillimeterLabel(formatMetersValue(controller.selectedTotalMeters))}`
        : "Order"
      : controller.selectedCount > 0
        ? `Received (${controller.selectedCount})`
        : "Received";

  function handlePrimary(): void {
    if (mode === "shortage" && shortage) {
      surface.open(UPHOLSTERY_CREATE_ORDER_SLIDE_ID, {
        upholsteryId: shortage.upholsteryId,
        upholsteryName: shortage.name,
        defaultAmountMeters:
          controller.selectedTotalMeters > 0
            ? controller.selectedTotalMeters
            : shortage.totalAmountMeters,
        priorityItemUpholsteryIds: controller.selectedItemUpholsteryIds,
      } satisfies CreateOrderSurfaceProps);
      return;
    }
    if (mode === "order" && liveOrder) {
      surface.open(UPHOLSTERY_RECEIVE_ORDER_SLIDE_ID, {
        orderId: liveOrder.orderId,
        upholsteryName: liveOrder.name,
        remainingReceivableMeters: liveOrder.remainingReceivableMeters,
        defaultAmountMeters:
          controller.selectedTotalMeters > 0
            ? Math.min(
                controller.selectedTotalMeters,
                liveOrder.remainingReceivableMeters,
              )
            : liveOrder.remainingReceivableMeters,
        priorityItemUpholsteryIds: controller.selectedItemUpholsteryIds,
      } satisfies ReceiveOrderSurfaceProps);
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="absolute inset-x-0 top-0 z-10 bg-background">
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            type="button"
            onClick={controller.close}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-md font-semibold text-foreground">
              {title}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {aggregate}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "grid px-4 pb-2 transition-[grid-template-rows,opacity] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            isCompact
              ? "grid-rows-[0fr] opacity-0"
              : "grid-rows-[1fr] opacity-100",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <SearchBar
              isLoading={controller.isBackgroundLoading}
              placeholder="Search items..."
              showFilterButton={false}
              showSortButton={false}
              value={controller.searchInput}
              wrapperClassName="bg-card"
              onChange={controller.setSearchInput}
            />
          </div>
        </div>
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
          ) : controller.cards.length === 0 ? (
            <OrderingEmptyState
              hasSearch={controller.searchInput.trim().length > 0}
              mode={mode === "shortage" ? "needs" : "orders"}
            />
          ) : (
            <div className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.75rem)] pt-2">
              {controller.cards.map((card) => (
                <OrderingItemCard
                  key={card.itemUpholsteryId}
                  card={card}
                  selected={controller.selectedIds.has(card.itemUpholsteryId)}
                  onOpenImage={controller.openImageViewer}
                  onOpenTask={controller.openTaskDetail}
                  onToggle={controller.toggleSelection}
                />
              ))}
              {controller.hasMore ? (
                <div className="flex justify-center pb-6">
                  <button
                    className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
                    disabled={controller.isFetchingMore}
                    type="button"
                    onClick={controller.loadMore}
                  >
                    {controller.isFetchingMore ? "Loading..." : "Show more"}
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
        <div className="grid grid-cols-2 gap-3  px-4 py-3.5 pb-[max(var(--safe-bottom,0),0.875rem)]">
          <button
            className="rounded-2xl rounded-2xl bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm border border-between-border"
            type="button"
            onClick={controller.close}
          >
            Close &amp; Back
          </button>
          <button
            className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
            disabled={
              mode === "order" && (liveOrder?.remainingReceivableMeters ?? 0) <= 0
            }
            type="button"
            onClick={handlePrimary}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShortageDetailSlidePage(): React.JSX.Element {
  return <DetailPage mode="shortage" />;
}

export function OrderDetailSlidePage(): React.JSX.Element {
  return <DetailPage mode="order" />;
}
