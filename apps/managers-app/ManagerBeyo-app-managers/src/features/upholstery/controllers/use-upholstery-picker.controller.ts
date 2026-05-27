import { useRef, useState } from 'react';

import { useSurfaceStore } from '@/providers/SurfaceProvider';

import { useToggleUpholsteryFavorite } from '../actions/use-toggle-upholstery-favorite';
import { useUpdateUpholsteryListOrder } from '../actions/use-update-upholstery-list-order';
import { useUpholsteryPickerOptionsQuery } from '../api/use-upholstery-picker-options';
import { UPHOLSTERY_PICKER_REORDER_SHEET_ID } from '../surfaces';
import {
  type UpholsteryQuickFilter,
  UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
} from '../types';

const FILTER_INDEXES: Record<UpholsteryQuickFilter, number> = {
  in_stock: 0,
  out_of_stock: 1,
  favorite: 2,
};

export function useUpholsteryPickerController(searchQuery: string) {
  const [activeFilter, setActiveFilter] = useState<UpholsteryQuickFilter>('in_stock');
  const previousFilterIndexRef = useRef(FILTER_INDEXES.in_stock);
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
      case 'out_of_stock':
        return {
          upholsteries: outOfStockQuery.data?.upholsteries ?? [],
          isLoading: outOfStockQuery.isPending,
        };
      case 'favorite':
        return {
          upholsteries: favoritesQuery.data?.upholsteries ?? [],
          isLoading: favoritesQuery.isPending,
        };
      case 'in_stock':
      default:
        return {
          upholsteries: inStockQuery.data?.upholsteries ?? [],
          isLoading: inStockQuery.isPending,
        };
    }
  }

  const { upholsteries, isLoading } = getActiveQueryResult();

  function openReorderSheet(clientId: string) {
    useSurfaceStore.getState().open(UPHOLSTERY_PICKER_REORDER_SHEET_ID, { clientId });
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
    toggleFavorite: (clientId: string, currentFavorite: boolean) =>
      toggleFavoriteAction.toggleFavorite({
        client_id: clientId,
        favorite: !currentFavorite,
      }),
  };
}

export type UpholsteryPickerController = ReturnType<typeof useUpholsteryPickerController>;
