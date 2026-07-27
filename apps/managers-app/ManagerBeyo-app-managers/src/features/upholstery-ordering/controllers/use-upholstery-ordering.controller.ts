import { useEffect, useMemo, useState } from "react";

import { useSurface } from "@/hooks/use-surface";

import {
  useOrderNeedsCountQuery,
  useOrderNeedsPagesQueries,
  useOrdersCountQuery,
  useOrdersPagesQueries,
} from "../api/use-upholstery-ordering-queries";
import {
  ACTIVE_ORDER_STATES,
  type OrderNeedRow,
  type OrderRow,
} from "../types";
import {
  toOrderCardViewModel,
  toShortageCardViewModel,
} from "../lib/upholstery-ordering-dto";
import {
  UPHOLSTERY_CREATE_ORDER_SLIDE_ID,
  UPHOLSTERY_ORDER_DETAIL_SLIDE_ID,
  UPHOLSTERY_RECEIVE_ORDER_SLIDE_ID,
  UPHOLSTERY_SHORTAGE_DETAIL_SLIDE_ID,
  type CreateOrderSurfaceProps,
  type OrderDetailSurfaceProps,
  type ReceiveOrderSurfaceProps,
  type ShortageDetailSurfaceProps,
} from "../surfaces";

const PAGE_LIMIT = 50;

export const UPHOLSTERY_ORDERING_MODES = ["needs", "orders"] as const;
export type OrderingMode = (typeof UPHOLSTERY_ORDERING_MODES)[number];

type PageOffsetsByMode = Record<OrderingMode, number[]>;

function getInitialPageOffsets(): PageOffsetsByMode {
  return {
    needs: [0],
    orders: [0],
  };
}

function appendDeduped<T>(
  current: T[],
  next: T[],
  getId: (row: T) => string,
): T[] {
  const seen = new Set(current.map(getId));
  return [...current, ...next.filter((row) => !seen.has(getId(row)))];
}

export function useUpholsteryOrderingController() {
  const surface = useSurface();
  const [mode, setMode] = useState<OrderingMode>("needs");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [pageOffsetsByMode, setPageOffsetsByMode] =
    useState<PageOffsetsByMode>(getInitialPageOffsets);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQ(searchInput);
      setPageOffsetsByMode(getInitialPageOffsets());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const needsParams = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      q: debouncedQ.trim() || undefined,
    }),
    [debouncedQ],
  );
  const ordersParams = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      q: debouncedQ.trim() || undefined,
      states: ACTIVE_ORDER_STATES,
    }),
    [debouncedQ],
  );

  // Both mode queries stay live because SlideStack renders the destination
  // pane as a drag ghost before navigation commits.
  const needsQueries = useOrderNeedsPagesQueries(
    needsParams,
    pageOffsetsByMode.needs,
  );
  const ordersQueries = useOrdersPagesQueries(
    ordersParams,
    pageOffsetsByMode.orders,
  );
  const needsCountQuery = useOrderNeedsCountQuery();
  const ordersCountQuery = useOrdersCountQuery(ACTIVE_ORDER_STATES);
  const needsRows = needsQueries.reduce(
    (rows, query) =>
      query.data
        ? appendDeduped(
            rows,
            query.data.items,
            (row) => row.upholstery_id,
          )
        : rows,
    [] as OrderNeedRow[],
  );
  const orderRows = ordersQueries.reduce(
    (rows, query) =>
      query.data
        ? appendDeduped(rows, query.data.items, (row) => row.client_id)
        : rows,
    [] as OrderRow[],
  );
  const shortageCards = needsRows.map((row) => toShortageCardViewModel(row));
  const orderCards = orderRows.map((row) => toOrderCardViewModel(row));
  const queriesByMode = { needs: needsQueries, orders: ordersQueries } as const;
  const activeQueries = queriesByMode[mode];

  function goToAdjacentMode(offset: 1 | -1): void {
    const nextMode =
      UPHOLSTERY_ORDERING_MODES[
        UPHOLSTERY_ORDERING_MODES.indexOf(mode) + offset
      ];
    if (nextMode) {
      setMode(nextMode);
    }
  }

  async function refetch(): Promise<void> {
    if (mode === "needs") {
      setPageOffsetsByMode((current) => ({ ...current, needs: [0] }));
      await Promise.all([
        needsQueries[0]?.refetch(),
        needsCountQuery.refetch(),
      ]);
      return;
    }
    setPageOffsetsByMode((current) => ({ ...current, orders: [0] }));
    await Promise.all([
      ordersQueries[0]?.refetch(),
      ordersCountQuery.refetch(),
    ]);
  }

  function loadMoreFor(targetMode: OrderingMode): void {
    const query = queriesByMode[targetMode].at(-1);
    if (!query?.data?.hasMore || query.isFetching) return;
    const nextOffset = query.data.offset + query.data.limit;
    setPageOffsetsByMode((current) => ({
      ...current,
      [targetMode]: [...current[targetMode], nextOffset],
    }));
  }

  function openShortageDetail(card: (typeof shortageCards)[number]): void {
    surface.open(UPHOLSTERY_SHORTAGE_DETAIL_SLIDE_ID, {
      shortage: card,
    } satisfies ShortageDetailSurfaceProps);
  }

  function openCreateOrder(
    card: (typeof shortageCards)[number],
    amountMeters: number | null = null,
  ): void {
    surface.open(UPHOLSTERY_CREATE_ORDER_SLIDE_ID, {
      upholsteryId: card.upholsteryId,
      upholsteryName: card.name,
      // Carry the amount staged inline so the form opens where the user left it.
      defaultAmountMeters: amountMeters ?? card.totalAmountMeters,
      priorityItemUpholsteryIds: [],
    } satisfies CreateOrderSurfaceProps);
  }

  function openOrderDetail(card: (typeof orderCards)[number]): void {
    surface.open(UPHOLSTERY_ORDER_DETAIL_SLIDE_ID, {
      order: card,
    } satisfies OrderDetailSurfaceProps);
  }

  function openReceiveOrder(card: (typeof orderCards)[number]): void {
    surface.open(UPHOLSTERY_RECEIVE_ORDER_SLIDE_ID, {
      orderId: card.orderId,
      upholsteryName: card.name,
      remainingReceivableMeters: card.remainingReceivableMeters,
      defaultAmountMeters: card.remainingReceivableMeters,
      priorityItemUpholsteryIds: [],
    } satisfies ReceiveOrderSurfaceProps);
  }

  return {
    mode,
    modes: UPHOLSTERY_ORDERING_MODES,
    setMode,
    goToPreviousMode: () => goToAdjacentMode(-1),
    goToNextMode: () => goToAdjacentMode(1),
    searchInput,
    setSearchInput,
    shortageCards,
    orderCards,
    needsCount: needsCountQuery.data ?? null,
    ordersCount: ordersCountQuery.data ?? null,
    countsError: needsCountQuery.isError || ordersCountQuery.isError,
    isInitialLoadingByMode: {
      needs: needsQueries[0]?.isPending === true && needsRows.length === 0,
      orders: ordersQueries[0]?.isPending === true && orderRows.length === 0,
    },
    isErrorByMode: {
      needs: needsQueries[0]?.isError === true && needsRows.length === 0,
      orders: ordersQueries[0]?.isError === true && orderRows.length === 0,
    },
    isFetchingMoreByMode: {
      needs:
        needsQueries.at(-1)?.isFetching === true &&
        (pageOffsetsByMode.needs.at(-1) ?? 0) > 0,
      orders:
        ordersQueries.at(-1)?.isFetching === true &&
        (pageOffsetsByMode.orders.at(-1) ?? 0) > 0,
    },
    isPaginationErrorByMode: {
      needs:
        needsQueries.at(-1)?.isError === true &&
        (pageOffsetsByMode.needs.at(-1) ?? 0) > 0,
      orders:
        ordersQueries.at(-1)?.isError === true &&
        (pageOffsetsByMode.orders.at(-1) ?? 0) > 0,
    },
    hasMoreByMode: {
      needs: needsQueries.at(-1)?.data?.hasMore ?? false,
      orders: ordersQueries.at(-1)?.data?.hasMore ?? false,
    },
    retryByMode: {
      needs: () => needsQueries.at(-1)?.refetch(),
      orders: () => ordersQueries.at(-1)?.refetch(),
    },
    loadMoreByMode: {
      needs: () => loadMoreFor("needs"),
      orders: () => loadMoreFor("orders"),
    },
    isBackgroundLoading:
      activeQueries.some((query) => query.isFetching) &&
      (mode === "needs" ? needsRows.length > 0 : orderRows.length > 0),
    refetch,
    close: surface.closeTop,
    openShortageDetail,
    openCreateOrder,
    openOrderDetail,
    openReceiveOrder,
  };
}

export type UpholsteryOrderingController = ReturnType<
  typeof useUpholsteryOrderingController
>;
