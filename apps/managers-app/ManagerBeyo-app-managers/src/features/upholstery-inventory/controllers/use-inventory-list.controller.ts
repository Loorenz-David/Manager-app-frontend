import { useEffect, useRef, useState } from "react";

import { useSurfaceStore } from "@/providers/SurfaceProvider";
import type { UpholsteryInventoryId } from "@/types/common";

import { useListUpholsteryInventoriesQuery } from "../api/use-list-upholstery-inventories-query";
import {
  INVENTORY_CARD_ACTIONS_SHEET_ID,
  INVENTORY_DETAIL_SLIDE_ID,
  type InventoryCardActionsSurfaceProps,
  type InventoryDetailSurfaceProps,
} from "../surfaces";
import {
  INVENTORY_FILTER_INDEXES,
  INVENTORY_QUICK_FILTER_OPTIONS,
  toInventoryListCardViewModel,
  type InventoryQuickFilter,
} from "../types";

const FILTER_INDEXES = INVENTORY_FILTER_INDEXES;

export function useInventoryListController() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<InventoryQuickFilter>("in_stock");
  const previousFilterIndexRef = useRef(FILTER_INDEXES.in_stock);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const isSearchActive = debouncedQ.trim().length > 0;
  const isFilterDisabled = q.trim().length > 0;

  const inStockQuery = useListUpholsteryInventoriesQuery({ in_stock: true });
  const outOfStockQuery = useListUpholsteryInventoriesQuery({
    in_stock: false,
  });
  const favoritesQuery = useListUpholsteryInventoriesQuery({ favorite: true });
  const searchQuery = useListUpholsteryInventoriesQuery(
    { q: debouncedQ || undefined },
    { enabled: isSearchActive },
  );

  function handleFilterChange(nextFilter: InventoryQuickFilter): void {
    const nextIndex = FILTER_INDEXES[nextFilter];
    const previousIndex = previousFilterIndexRef.current;

    if (nextIndex !== previousIndex) {
      setDirection(nextIndex > previousIndex ? 1 : -1);
      previousFilterIndexRef.current = nextIndex;
    }

    setActiveFilter(nextFilter);
  }

  function getActiveQueryResult() {
    if (isSearchActive) {
      return {
        items: searchQuery.data?.items ?? [],
        isLoading: searchQuery.isPending,
        isFetched: searchQuery.isFetched,
      };
    }

    switch (activeFilter) {
      case "out_of_stock":
        return {
          items: outOfStockQuery.data?.items ?? [],
          isLoading: outOfStockQuery.isPending,
          isFetched: outOfStockQuery.isFetched,
        };
      case "favorite":
        return {
          items: favoritesQuery.data?.items ?? [],
          isLoading: favoritesQuery.isPending,
          isFetched: favoritesQuery.isFetched,
        };
      case "in_stock":
      default:
        return {
          items: inStockQuery.data?.items ?? [],
          isLoading: inStockQuery.isPending,
          isFetched: inStockQuery.isFetched,
        };
    }
  }

  const { items, isLoading, isFetched } = getActiveQueryResult();
  const cards = items.map(toInventoryListCardViewModel);

  async function refetch(): Promise<void> {
    if (isSearchActive) {
      await searchQuery.refetch();
      return;
    }

    switch (activeFilter) {
      case "out_of_stock":
        await outOfStockQuery.refetch();
        return;
      case "favorite":
        await favoritesQuery.refetch();
        return;
      case "in_stock":
      default:
        await inStockQuery.refetch();
        return;
    }
  }

  function openDetail(inventoryId: UpholsteryInventoryId): void {
    useSurfaceStore.getState().open(INVENTORY_DETAIL_SLIDE_ID, {
      inventoryId,
    } satisfies InventoryDetailSurfaceProps);
  }

  function openCardActions(inventoryId: UpholsteryInventoryId): void {
    useSurfaceStore.getState().open(INVENTORY_CARD_ACTIONS_SHEET_ID, {
      inventoryId,
    } satisfies InventoryCardActionsSurfaceProps);
  }

  return {
    q,
    activeFilter,
    direction,
    filterOptions: INVENTORY_QUICK_FILTER_OPTIONS,
    isSearchActive,
    isFilterDisabled,
    cards,
    isLoading,
    isFetched,
    setQ,
    onFilterChange: handleFilterChange,
    refetch,
    openDetail,
    openCardActions,
  };
}

export type InventoryListController = ReturnType<
  typeof useInventoryListController
>;
