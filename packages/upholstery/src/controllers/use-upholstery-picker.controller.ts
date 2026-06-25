import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generateClientId } from "@beyo/lib";
import { useSurfaceStore } from "@beyo/ui";

import { useCreateUpholstery } from "../actions/use-create-upholstery";
import { useToggleUpholsteryFavorite } from "../actions/use-toggle-upholstery-favorite";
import { useUpdateUpholsteryListOrder } from "../actions/use-update-upholstery-list-order";
import { useNevotexUpholsteryOptionsQuery } from "../api/use-nevotex-upholstery-options";
import { useUpholsteryPickerOptionsQuery } from "../api/use-upholstery-picker-options";
import { UPHOLSTERY_PICKER_REORDER_SHEET_ID } from "../surfaces";
import {
  type UpholsteryPickerOption,
  type UpholsteryPickerRecord,
  type UpholsteryQuickFilter,
  UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
} from "../types";

const FILTER_INDEXES: Record<UpholsteryQuickFilter, number> = {
  favorite: 0,
  in_stock: 1,
  out_of_stock: 2,
};

function getNevotexIdentity(record: UpholsteryPickerOption): string {
  return record.name.trim().toLowerCase();
}

function mergePickerResults(
  dbItems: UpholsteryPickerOption[],
  nevotexItems: UpholsteryPickerOption[],
  getClientIdForNevotex: (record: UpholsteryPickerOption) => string,
): UpholsteryPickerRecord[] {
  const dbRecords = toDatabaseRecords(dbItems);
  const dbNames = new Set(dbRecords.map((item) => item.name.trim().toLowerCase()));

  const nevotexRecords: UpholsteryPickerRecord[] = nevotexItems
    .filter((item) => !dbNames.has(item.name.trim().toLowerCase()))
    .map((item) => ({
      ...item,
      client_id: getClientIdForNevotex(item),
      favorite: false,
    }));

  return [...dbRecords, ...nevotexRecords];
}

function toDatabaseRecords(items: UpholsteryPickerOption[]): UpholsteryPickerRecord[] {
  return items
    .filter((item): item is UpholsteryPickerOption & { client_id: string } => item.client_id !== null)
    .map((item) => ({
      ...item,
      client_id: item.client_id,
      favorite: item.favorite ?? false,
    }));
}

export function useUpholsteryPickerController(searchQuery: string) {
  const [activeFilter, setActiveFilter] =
    useState<UpholsteryQuickFilter>("favorite");
  const previousFilterIndexRef = useRef(FILTER_INDEXES.favorite);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pendingNevotexFavorites, setPendingNevotexFavorites] = useState<Set<string>>(
    () => new Set(),
  );
  const nevotexClientIdsRef = useRef(new Map<string, string>());

  const inStockQuery = useUpholsteryPickerOptionsQuery({ in_stock: true });
  const outOfStockQuery = useUpholsteryPickerOptionsQuery({ in_stock: false });
  const favoritesQuery = useUpholsteryPickerOptionsQuery({ favorite: true });
  const searchResultsQuery = useUpholsteryPickerOptionsQuery(
    { q: searchQuery },
    { enabled: searchQuery.trim().length > 0 },
  );
  const nevotexSearchQuery = useNevotexUpholsteryOptionsQuery(
    { q: searchQuery, limit: 7 },
    { enabled: searchQuery.trim().length > 0 },
  );

  const createUpholsteryAction = useCreateUpholstery();
  const toggleFavoriteAction = useToggleUpholsteryFavorite();
  const updateListOrderAction = useUpdateUpholsteryListOrder();

  const getClientIdForNevotex = useCallback((record: UpholsteryPickerOption): string => {
    const key = getNevotexIdentity(record);
    const existing = nevotexClientIdsRef.current.get(key);

    if (existing) {
      return existing;
    }

    const clientId = generateClientId("Upholstery");
    nevotexClientIdsRef.current.set(key, clientId);
    return clientId;
  }, []);

  function handleFilterChange(nextFilter: UpholsteryQuickFilter) {
    const nextIndex = FILTER_INDEXES[nextFilter];
    const previousIndex = previousFilterIndexRef.current;

    if (nextIndex !== previousIndex) {
      setDirection(nextIndex > previousIndex ? 1 : -1);
      previousFilterIndexRef.current = nextIndex;
    }

    setActiveFilter(nextFilter);
  }

  const { upholsteries: mergedUpholsteries, isLoading } = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      const dbItems = searchResultsQuery.data?.upholsteries ?? [];
      const nevotexItems = nevotexSearchQuery.data?.upholsteries ?? [];

      return {
        upholsteries: mergePickerResults(
          dbItems,
          nevotexItems,
          getClientIdForNevotex,
        ),
        isLoading: searchResultsQuery.isPending || nevotexSearchQuery.isPending,
      };
    }

    switch (activeFilter) {
      case "out_of_stock":
        return {
          upholsteries: toDatabaseRecords(outOfStockQuery.data?.upholsteries ?? []),
          isLoading: outOfStockQuery.isPending,
        };
      case "favorite":
        return {
          upholsteries: toDatabaseRecords(favoritesQuery.data?.upholsteries ?? []),
          isLoading: favoritesQuery.isPending,
        };
      case "in_stock":
      default:
        return {
          upholsteries: toDatabaseRecords(inStockQuery.data?.upholsteries ?? []),
          isLoading: inStockQuery.isPending,
        };
    }
  }, [
    searchQuery,
    activeFilter,
    searchResultsQuery.data,
    searchResultsQuery.isPending,
    nevotexSearchQuery.data,
    nevotexSearchQuery.isPending,
    inStockQuery.data,
    inStockQuery.isPending,
    outOfStockQuery.data,
    outOfStockQuery.isPending,
    favoritesQuery.data,
    favoritesQuery.isPending,
    getClientIdForNevotex,
  ]);

  const upholsteries = useMemo(
    () =>
      mergedUpholsteries.map((record) =>
        pendingNevotexFavorites.has(record.client_id)
          ? { ...record, favorite: true }
          : record,
      ),
    [mergedUpholsteries, pendingNevotexFavorites],
  );

  useEffect(() => {
    if (pendingNevotexFavorites.size === 0) {
      return;
    }

    const activeNevotexIds = new Set(
      mergedUpholsteries
        .filter((record) => record.origin === "nevotex")
        .map((record) => record.client_id),
    );

    const staleIds = [...pendingNevotexFavorites].filter(
      (id) => !activeNevotexIds.has(id),
    );

    if (staleIds.length === 0) {
      return;
    }

    setPendingNevotexFavorites((previous) => {
      const next = new Set(previous);
      staleIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [mergedUpholsteries, pendingNevotexFavorites]);

  async function refetch() {
    if (searchQuery.trim().length > 0) {
      await Promise.all([searchResultsQuery.refetch(), nevotexSearchQuery.refetch()]);
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

  function prepareSelect(clientId: string): void {
    const record = upholsteries.find((entry) => entry.client_id === clientId);

    if (!record || record.origin !== "nevotex") {
      return;
    }

    createUpholsteryAction.mutate({
      client_id: clientId,
      name: record.name,
      code: record.code,
      image_url: record.image_url,
    });
  }

  async function handleToggleFavorite(
    clientId: string,
    currentFavorite: boolean,
  ): Promise<void> {
    const record = upholsteries.find((entry) => entry.client_id === clientId);

    if (!record || record.origin === "database") {
      toggleFavoriteAction.toggleFavorite({
        client_id: clientId,
        favorite: !currentFavorite,
      });
      return;
    }

    if (pendingNevotexFavorites.has(clientId)) {
      return;
    }

    const nextFavorite = !currentFavorite;

    setPendingNevotexFavorites((previous) => {
      const next = new Set(previous);
      if (nextFavorite) {
        next.add(clientId);
      } else {
        next.delete(clientId);
      }
      return next;
    });

    try {
      await createUpholsteryAction.mutateAsync({
        client_id: clientId,
        name: record.name,
        code: record.code,
        image_url: record.image_url,
      });
      await toggleFavoriteAction.toggleFavoriteAsync({
        client_id: clientId,
        favorite: nextFavorite,
      });
    } catch (error) {
      console.error("Failed to toggle Nevotex upholstery favorite", error);
      setPendingNevotexFavorites((previous) => {
        const next = new Set(previous);
        next.delete(clientId);
        return next;
      });
    }
  }

  return {
    activeFilter,
    direction,
    filterOptions: UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
    upholsteries,
    isLoading,
    prepareSelect,
    isReorderPending: updateListOrderAction.isPending,
    onFilterChange: handleFilterChange,
    openReorderSheet,
    refetch,
    toggleFavorite: (clientId: string, currentFavorite: boolean) =>
      void handleToggleFavorite(clientId, currentFavorite),
  };
}

export type UpholsteryPickerController = ReturnType<
  typeof useUpholsteryPickerController
>;
