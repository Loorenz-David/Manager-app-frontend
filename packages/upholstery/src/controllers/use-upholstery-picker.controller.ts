import { useRef, useState } from "react";

import { useSurfaceStore } from "@beyo/ui";

import { useToggleUpholsteryFavorite } from "../actions/use-toggle-upholstery-favorite";
import { useUpdateUpholsteryListOrder } from "../actions/use-update-upholstery-list-order";
import { useUpholsteryPickerOptionsQuery } from "../api/use-upholstery-picker-options";
import { UPHOLSTERY_PICKER_REORDER_SHEET_ID } from "../surfaces";
import {
  type UpholsteryQuickFilter,
  UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
} from "../types";

const FILTER_INDEXES: Record<UpholsteryQuickFilter, number> = {
  favorite: 0,
  in_stock: 1,
  out_of_stock: 2,
};

export function useUpholsteryPickerController(searchQuery: string) {
  const [activeFilter, setActiveFilter] =
    useState<UpholsteryQuickFilter>("favorite");
  const previousFilterIndexRef = useRef(FILTER_INDEXES.favorite);
  const [direction, setDirection] = useState<1 | -1>(1);

  const inStockQuery = useUpholsteryPickerOptionsQuery({ in_stock: true });
  const outOfStockQuery = useUpholsteryPickerOptionsQuery({ in_stock: false });
  const favoritesQuery = useUpholsteryPickerOptionsQuery({ favorite: true });
  const searchResultsQuery = useUpholsteryPickerOptionsQuery(
    { q: searchQuery },
    { enabled: searchQuery.trim().length > 0 },
  );

  const toggleFavoriteAction = useToggleUpholsteryFavorite();
  const updateListOrderAction = useUpdateUpholsteryListOrder();

  function handleFilterChange(nextFilter: UpholsteryQuickFilter) {
    const nextIndex = FILTER_INDEXES[nextFilter];
    const previousIndex = previousFilterIndexRef.current;

    if (nextIndex !== previousIndex) {
      setDirection(nextIndex > previousIndex ? 1 : -1);
      previousFilterIndexRef.current = nextIndex;
    }

    setActiveFilter(nextFilter);
  }

  function getActiveQueryResult() {
    if (searchQuery.trim().length > 0) {
      return {
        upholsteries: searchResultsQuery.data?.upholsteries ?? [],
        isLoading: searchResultsQuery.isPending,
      };
    }

    switch (activeFilter) {
      case "out_of_stock":
        return {
          upholsteries: outOfStockQuery.data?.upholsteries ?? [],
          isLoading: outOfStockQuery.isPending,
        };
      case "favorite":
        return {
          upholsteries: favoritesQuery.data?.upholsteries ?? [],
          isLoading: favoritesQuery.isPending,
        };
      case "in_stock":
      default:
        return {
          upholsteries: inStockQuery.data?.upholsteries ?? [],
          isLoading: inStockQuery.isPending,
        };
    }
  }

  const { upholsteries, isLoading } = getActiveQueryResult();

  async function refetch() {
    if (searchQuery.trim().length > 0) {
      await searchResultsQuery.refetch();
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

  function openReorderSheet(clientId: string) {
    useSurfaceStore
      .getState()
      .open(UPHOLSTERY_PICKER_REORDER_SHEET_ID, { clientId });
  }

  return {
    activeFilter,
    direction,
    filterOptions: UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
    upholsteries,
    isLoading,
    isReorderPending: updateListOrderAction.isPending,
    onFilterChange: handleFilterChange,
    openReorderSheet,
    refetch,
    toggleFavorite: (clientId: string, currentFavorite: boolean) =>
      toggleFavoriteAction.toggleFavorite({
        client_id: clientId,
        favorite: !currentFavorite,
      }),
  };
}

export type UpholsteryPickerController = ReturnType<
  typeof useUpholsteryPickerController
>;
