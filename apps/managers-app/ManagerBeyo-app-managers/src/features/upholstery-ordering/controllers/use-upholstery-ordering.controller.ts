import { useEffect, useMemo, useState } from "react";

import { useSurface } from "@/hooks/use-surface";

import {
  useOrderNeedsCountQuery,
  useOrderNeedsQuery,
  useOrdersCountQuery,
  useOrdersQuery,
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

type OrderingMode = "needs" | "orders";

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
  const [needsOffset, setNeedsOffset] = useState(0);
  const [ordersOffset, setOrdersOffset] = useState(0);
  const [needsRows, setNeedsRows] = useState<OrderNeedRow[]>([]);
  const [orderRows, setOrderRows] = useState<OrderRow[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(searchInput), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setNeedsOffset(0);
    setOrdersOffset(0);
    setNeedsRows([]);
    setOrderRows([]);
  }, [debouncedQ]);

  const needsParams = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      offset: needsOffset,
      q: debouncedQ.trim() || undefined,
    }),
    [debouncedQ, needsOffset],
  );
  const ordersParams = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      offset: ordersOffset,
      q: debouncedQ.trim() || undefined,
      states: ACTIVE_ORDER_STATES,
    }),
    [debouncedQ, ordersOffset],
  );

  const needsQuery = useOrderNeedsQuery(needsParams, mode === "needs");
  const ordersQuery = useOrdersQuery(ordersParams, mode === "orders");
  const needsCountQuery = useOrderNeedsCountQuery();
  const ordersCountQuery = useOrdersCountQuery(ACTIVE_ORDER_STATES);

  useEffect(() => {
    if (!needsQuery.data) return;
    setNeedsRows((current) =>
      needsOffset === 0
        ? needsQuery.data.items
        : appendDeduped(current, needsQuery.data.items, (row) => row.upholstery_id),
    );
  }, [needsOffset, needsQuery.data]);

  useEffect(() => {
    if (!ordersQuery.data) return;
    setOrderRows((current) =>
      ordersOffset === 0
        ? ordersQuery.data.items
        : appendDeduped(current, ordersQuery.data.items, (row) => row.client_id),
    );
  }, [ordersOffset, ordersQuery.data]);

  const shortageCards = useMemo(
    () => needsRows.map((row) => toShortageCardViewModel(row)),
    [needsRows],
  );
  const orderCards = useMemo(
    () => orderRows.map((row) => toOrderCardViewModel(row)),
    [orderRows],
  );

  async function refetch(): Promise<void> {
    if (mode === "needs") {
      setNeedsOffset(0);
      await Promise.all([needsQuery.refetch(), needsCountQuery.refetch()]);
      return;
    }
    setOrdersOffset(0);
    await Promise.all([ordersQuery.refetch(), ordersCountQuery.refetch()]);
  }

  function loadMore(): void {
    if (mode === "needs") {
      if (!needsQuery.data?.hasMore || needsQuery.isFetching) return;
      setNeedsOffset(needsQuery.data.offset + needsQuery.data.limit);
      return;
    }
    if (!ordersQuery.data?.hasMore || ordersQuery.isFetching) return;
    setOrdersOffset(ordersQuery.data.offset + ordersQuery.data.limit);
  }

  function openShortageDetail(card: (typeof shortageCards)[number]): void {
    surface.open(UPHOLSTERY_SHORTAGE_DETAIL_SLIDE_ID, {
      shortage: card,
    } satisfies ShortageDetailSurfaceProps);
  }

  function openCreateOrder(card: (typeof shortageCards)[number]): void {
    surface.open(UPHOLSTERY_CREATE_ORDER_SLIDE_ID, {
      upholsteryId: card.upholsteryId,
      upholsteryName: card.name,
      defaultAmountMeters: card.totalAmountMeters,
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

  const activeQuery =
    mode === "needs"
      ? (needsQuery as typeof needsQuery | typeof ordersQuery)
      : ordersQuery;
  const activeRowsLength = mode === "needs" ? needsRows.length : orderRows.length;
  const activeOffset = mode === "needs" ? needsOffset : ordersOffset;

  return {
    mode,
    setMode,
    searchInput,
    setSearchInput,
    shortageCards,
    orderCards,
    needsCount: needsCountQuery.data ?? null,
    ordersCount: ordersCountQuery.data ?? null,
    countsError: needsCountQuery.isError || ordersCountQuery.isError,
    isInitialLoading: activeQuery.isPending && activeRowsLength === 0,
    isBackgroundLoading: activeQuery.isFetching && activeRowsLength > 0,
    isError: activeQuery.isError && activeRowsLength === 0,
    isFetchingMore: activeQuery.isFetching && activeOffset > 0,
    isPaginationError: activeQuery.isError && activeOffset > 0,
    hasMore: activeQuery.data?.hasMore ?? false,
    retry: activeQuery.refetch,
    refetch,
    loadMore,
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
