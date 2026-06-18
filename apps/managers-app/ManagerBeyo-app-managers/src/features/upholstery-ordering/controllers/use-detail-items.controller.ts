import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IMAGE_VIEWER_SURFACE_ID, type ImageLinkEntityType } from "@beyo/images";

import { useSurface } from "@/hooks/use-surface";
import { TASK_DETAIL_SURFACE_ID, type TaskDetailSurfaceProps } from "@/features/tasks/surfaces";

import {
  fetchOrderItems,
  fetchOrderNeedItems,
} from "../api/fetch-upholstery-ordering";
import {
  upholsteryOrderingKeys,
} from "../api/upholstery-ordering-keys";
import {
  useOrderItemsQuery,
  useOrderNeedItemsQuery,
} from "../api/use-upholstery-ordering-queries";
import {
  type ItemUpholsteryRequirementState,
  type ListOrderItemsParams,
  type ListOrderNeedItemsParams,
  type OrderingItemRow,
} from "../types";
import { toOrderingItemCardViewModel } from "../lib/upholstery-ordering-dto";

const PAGE_LIMIT = 50;

type DetailSource =
  | { type: "needs"; upholsteryId: string }
  | {
      type: "orders";
      upholsteryIds: readonly string[];
      requirementStates: readonly ItemUpholsteryRequirementState[];
    };

export function appendDeduped(
  current: OrderingItemRow[],
  next: OrderingItemRow[],
): OrderingItemRow[] {
  const seen = new Set(
    current.map((row) => row.item_upholstery?.client_id).filter(Boolean),
  );
  return [
    ...current,
    ...next.filter((row) => {
      const id = row.item_upholstery?.client_id;
      return id ? !seen.has(id) : false;
    }),
  ];
}

export function flattenPagesByOffset(
  loadedOffsets: number[],
  pagesByOffset: Record<number, OrderingItemRow[]>,
): OrderingItemRow[] {
  return loadedOffsets.reduce<OrderingItemRow[]>((current, pageOffset) => {
    const pageRows = pagesByOffset[pageOffset] ?? [];
    return appendDeduped(current, pageRows);
  }, []);
}

export function reconcileSelectedIdsWithRows(
  current: Set<string>,
  rows: OrderingItemRow[],
): Set<string> {
  const visibleIds = new Set(
    rows
      .map((row) => row.item_upholstery?.client_id)
      .filter((id): id is string => Boolean(id)),
  );
  const next = new Set<string>();
  current.forEach((id) => {
    if (visibleIds.has(id)) next.add(id);
  });
  return next;
}

export function useDetailItemsController(source: DetailSource) {
  const queryClient = useQueryClient();
  const surface = useSurface();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [pagesByOffset, setPagesByOffset] = useState<Record<number, OrderingItemRow[]>>({});
  const [loadedOffsets, setLoadedOffsets] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(searchInput), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setOffset(0);
    setPagesByOffset({});
    setLoadedOffsets([]);
  }, [debouncedQ, source]);

  const needsParams = useMemo(
    () => ({
      upholsteryId: source.type === "needs" ? source.upholsteryId : "",
      limit: PAGE_LIMIT,
      offset,
      q: debouncedQ.trim() || undefined,
    }),
    [debouncedQ, offset, source],
  );
  const orderParams = useMemo(
    () => ({
      upholsteryIds: source.type === "orders" ? source.upholsteryIds : [],
      requirementStates:
        source.type === "orders" ? source.requirementStates : [],
      limit: PAGE_LIMIT,
      offset,
      q: debouncedQ.trim() || undefined,
    }),
    [debouncedQ, offset, source],
  );

  const needsQuery = useOrderNeedItemsQuery(
    needsParams,
    source.type === "needs" && needsParams.upholsteryId.length > 0,
  );
  const ordersQuery = useOrderItemsQuery(
    orderParams,
    source.type === "orders" && orderParams.upholsteryIds.length > 0,
  );
  const query =
    source.type === "needs"
      ? (needsQuery as typeof needsQuery | typeof ordersQuery)
      : ordersQuery;

  useEffect(() => {
    if (!query.data) return;
    setPagesByOffset((current) => ({
      ...current,
      [offset]: query.data.items,
    }));
    setLoadedOffsets((current) =>
      current.includes(offset) ? current : [...current, offset].sort((a, b) => a - b),
    );
  }, [offset, query.data]);

  const rows = useMemo(() => {
    return flattenPagesByOffset(loadedOffsets, pagesByOffset);
  }, [loadedOffsets, pagesByOffset]);

  const cards = useMemo(
    () =>
      rows
        .map((row) => toOrderingItemCardViewModel(row))
        .filter((card): card is NonNullable<typeof card> => Boolean(card)),
    [rows],
  );

  const selectedCards = useMemo(
    () => cards.filter((card) => selectedIds.has(card.itemUpholsteryId)),
    [cards, selectedIds],
  );
  const selectedTotalMeters = selectedCards.reduce(
    (total, card) => total + card.amountMeters,
    0,
  );

  function buildNeedItemsParams(pageOffset: number): ListOrderNeedItemsParams {
    return {
      upholsteryId: source.type === "needs" ? source.upholsteryId : "",
      limit: PAGE_LIMIT,
      offset: pageOffset,
      q: debouncedQ.trim() || undefined,
    };
  }

  function buildOrderItemsParams(pageOffset: number): ListOrderItemsParams {
    return {
      upholsteryIds: source.type === "orders" ? source.upholsteryIds : [],
      requirementStates:
        source.type === "orders" ? source.requirementStates : [],
      limit: PAGE_LIMIT,
      offset: pageOffset,
      q: debouncedQ.trim() || undefined,
    };
  }

  async function refetch(): Promise<void> {
    const offsetsToRefresh = loadedOffsets.length > 0 ? loadedOffsets : [0];
    setIsRefreshing(true);
    try {
      const refreshedPages = await Promise.all(
        offsetsToRefresh.map(async (pageOffset) => {
          if (source.type === "needs") {
            const params = buildNeedItemsParams(pageOffset);
            const data = await queryClient.fetchQuery({
              queryKey: upholsteryOrderingKeys.needsItemsList(params),
              queryFn: () => fetchOrderNeedItems(params),
            });
            return [pageOffset, data.items] as const;
          }

          const params = buildOrderItemsParams(pageOffset);
          const data = await queryClient.fetchQuery({
            queryKey: upholsteryOrderingKeys.orderItemsList(params),
            queryFn: () => fetchOrderItems(params),
          });
          return [pageOffset, data.items] as const;
        }),
      );

      setPagesByOffset(
        Object.fromEntries(
          refreshedPages.map(([pageOffset, pageRows]) => [pageOffset, pageRows]),
        ),
      );
      setSelectedIds((current) =>
        reconcileSelectedIdsWithRows(
          current,
          refreshedPages.flatMap(([, pageRows]) => pageRows),
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  function loadMore(): void {
    if (!query.data?.hasMore || query.isFetching) return;
    setOffset(query.data.offset + query.data.limit);
  }

  function toggleSelection(itemUpholsteryId: string): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemUpholsteryId)) next.delete(itemUpholsteryId);
      else next.add(itemUpholsteryId);
      return next;
    });
  }

  function openTaskDetail(taskId: string): void {
    surface.open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  function openImageViewer(card: (typeof cards)[number]): void {
    const firstImage = card.images[0];
    if (!firstImage) return;
    surface.open(IMAGE_VIEWER_SURFACE_ID, {
      images: card.images,
      initialImageClientId: firstImage.clientId,
      entityType: "item" as ImageLinkEntityType,
      entityClientId: card.primaryItem?.id ?? null,
      mode: "preview-only",
      enableOnDemandImageLoad: true,
    });
  }

  return {
    searchInput,
    setSearchInput,
    cards,
    selectedIds,
    selectedCount: selectedIds.size,
    selectedTotalMeters,
    selectedItemUpholsteryIds: Array.from(selectedIds),
    isInitialLoading: query.isPending && rows.length === 0,
    isBackgroundLoading: (query.isFetching && rows.length > 0) || isRefreshing,
    isError: query.isError && rows.length === 0,
    isFetchingMore: query.isFetching && offset > 0 && !isRefreshing,
    isPaginationError: query.isError && offset > 0,
    hasMore: query.data?.hasMore ?? false,
    retry: query.refetch,
    refetch,
    loadMore,
    toggleSelection,
    openTaskDetail,
    openImageViewer,
    close: surface.closeTop,
  };
}

export type DetailItemsController = ReturnType<typeof useDetailItemsController>;
