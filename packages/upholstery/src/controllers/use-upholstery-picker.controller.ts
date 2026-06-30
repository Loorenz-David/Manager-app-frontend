import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generateClientId } from "@beyo/lib";
import { useSurfaceStore } from "@beyo/ui";

import { useCreateUpholstery } from "../actions/use-create-upholstery";
import { useToggleUpholsteryFavorite } from "../actions/use-toggle-upholstery-favorite";
import { useExternalUpholsteryOptionsByProviderQuery } from "../api/use-external-upholstery-options-by-provider";
import { detectExternalItemCategoryName } from "../category-detective";
import { useUpholsteryPickerOptionsQuery } from "../api/use-upholstery-picker-options";
import {
  UPHOLSTERY_PROVIDER_FILTER_SHEET_ID,
  type UpholsteryProviderFilterSheetSurfaceProps,
} from "../surfaces";
import {
  type ExternalUpholsteryProvider,
  type UpholsteryPickerOption,
  type UpholsteryPickerRecord,
  type UpholsteryQuickFilter,
  UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
  isExternalUpholsteryOrigin,
} from "../types";

const FILTER_INDEXES: Record<UpholsteryQuickFilter, number> = {
  favorite: 0,
  in_stock: 1,
  out_of_stock: 2,
};

function getExternalIdentity(record: UpholsteryPickerOption): string {
  return [
    record.origin,
    record.code?.trim().toLowerCase() || record.name.trim().toLowerCase(),
  ].join(":");
}

function mergePickerResults(
  dbItems: UpholsteryPickerOption[],
  externalItems: UpholsteryPickerOption[],
  getClientIdForExternal: (record: UpholsteryPickerOption) => string,
): UpholsteryPickerRecord[] {
  const dbRecords = toDatabaseRecords(dbItems);
  const dbNames = new Set(dbRecords.map((item) => item.name.trim().toLowerCase()));

  const externalRecords: UpholsteryPickerRecord[] = externalItems
    .filter((item) => !dbNames.has(item.name.trim().toLowerCase()))
    .map((item) => ({
      ...item,
      client_id: getClientIdForExternal(item),
      favorite: false,
    }));

  return [...dbRecords, ...externalRecords];
}

function normalizeProviderKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? "";
}

function filterItemsBySelectedProviders(
  items: UpholsteryPickerOption[],
  providers: ExternalUpholsteryProvider[],
): UpholsteryPickerOption[] {
  if (providers.length === 0) {
    return items;
  }

  const selectedProviders = new Set(providers);

  return items.filter((item) => {
    if (isExternalUpholsteryOrigin(item.origin)) {
      return selectedProviders.has(item.origin);
    }

    const supplierKey = normalizeProviderKey(item.supplier_name);
    return selectedProviders.has(supplierKey as ExternalUpholsteryProvider);
  });
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
  const [pendingExternalFavorites, setPendingExternalFavorites] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedExternalProviders, setSelectedExternalProviders] = useState<
    ExternalUpholsteryProvider[]
  >([]);
  const externalClientIdsRef = useRef(new Map<string, string>());
  const externalInventoryClientIdsRef = useRef(new Map<string, string>());

  const inStockQuery = useUpholsteryPickerOptionsQuery({ in_stock: true });
  const outOfStockQuery = useUpholsteryPickerOptionsQuery({ in_stock: false });
  const favoritesQuery = useUpholsteryPickerOptionsQuery({ favorite: true });
  const searchResultsQuery = useUpholsteryPickerOptionsQuery(
    { q: searchQuery },
    { enabled: searchQuery.trim().length > 0 },
  );
  const externalSearchQuery = useExternalUpholsteryOptionsByProviderQuery(
    { q: searchQuery, providers: selectedExternalProviders },
    { enabled: searchQuery.trim().length > 0 },
  );

  const createUpholsteryAction = useCreateUpholstery();
  const toggleFavoriteAction = useToggleUpholsteryFavorite();

  const getClientIdForExternal = useCallback((record: UpholsteryPickerOption): string => {
    const key = getExternalIdentity(record);
    const existing = externalClientIdsRef.current.get(key);

    if (existing) {
      return existing;
    }

    const clientId = generateClientId("Upholstery");
    externalClientIdsRef.current.set(key, clientId);
    return clientId;
  }, []);

  const getInventoryClientIdForExternal = useCallback((upholsteryClientId: string): string => {
    const existing = externalInventoryClientIdsRef.current.get(upholsteryClientId);

    if (existing) {
      return existing;
    }

    const clientId = generateClientId("UpholsteryInventory");
    externalInventoryClientIdsRef.current.set(upholsteryClientId, clientId);
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
      const dbItems = filterItemsBySelectedProviders(
        searchResultsQuery.data?.upholsteries ?? [],
        selectedExternalProviders,
      );

      return {
        upholsteries: mergePickerResults(
          dbItems,
          externalSearchQuery.upholsteries,
          getClientIdForExternal,
        ),
        isLoading:
          searchResultsQuery.isFetching || externalSearchQuery.isFetching,
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
    searchResultsQuery.isFetching,
    externalSearchQuery.isFetching,
    externalSearchQuery.upholsteries,
    selectedExternalProviders,
    inStockQuery.data,
    inStockQuery.isPending,
    outOfStockQuery.data,
    outOfStockQuery.isPending,
    favoritesQuery.data,
    favoritesQuery.isPending,
    getClientIdForExternal,
  ]);

  const upholsteries = useMemo(
    () =>
      mergedUpholsteries.map((record) =>
        pendingExternalFavorites.has(record.client_id)
          ? { ...record, favorite: true }
          : record,
      ),
    [mergedUpholsteries, pendingExternalFavorites],
  );
  const activeProviderFilterCount = selectedExternalProviders.length > 0 ? 1 : 0;

  useEffect(() => {
    if (pendingExternalFavorites.size === 0) {
      return;
    }

    const activeExternalIds = new Set(
      mergedUpholsteries
        .filter((record) => isExternalUpholsteryOrigin(record.origin))
        .map((record) => record.client_id),
    );

    const staleIds = [...pendingExternalFavorites].filter(
      (id) => !activeExternalIds.has(id),
    );

    if (staleIds.length === 0) {
      return;
    }

    setPendingExternalFavorites((previous) => {
      const next = new Set(previous);
      staleIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [mergedUpholsteries, pendingExternalFavorites]);

  async function refetch() {
    if (searchQuery.trim().length > 0) {
      await Promise.all([searchResultsQuery.refetch(), externalSearchQuery.refetch()]);
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

  function prepareSelect(clientId: string): void {
    const record = upholsteries.find((entry) => entry.client_id === clientId);

    if (!record || !isExternalUpholsteryOrigin(record.origin)) {
      return;
    }

    void createExternalUpholstery(record);
  }

  function openProviderFilterSheet(): void {
    useSurfaceStore.getState().open(UPHOLSTERY_PROVIDER_FILTER_SHEET_ID, {
      selectedProviders: selectedExternalProviders,
      onApply: setSelectedExternalProviders,
    } satisfies UpholsteryProviderFilterSheetSurfaceProps);
  }

  async function resolveExternalCategoryName(
    record: UpholsteryPickerRecord,
  ): Promise<string | null> {
    if (record.upholstery_category?.id) {
      return null;
    }

    return (await detectExternalItemCategoryName(record)) ?? "unknown";
  }

  async function createExternalUpholstery(record: UpholsteryPickerRecord): Promise<void> {
    const categoryName = await resolveExternalCategoryName(record);

    createUpholsteryAction.mutate({
      client_id: record.client_id,
      upholstery_inventory_id: getInventoryClientIdForExternal(record.client_id),
      name: record.name,
      code: record.code,
      image_url: record.image_url,
      page_link: record.page_link ?? record.external_url ?? null,
      supplier_name: record.supplier_name ?? record.origin,
      upholstery_category_id: record.upholstery_category?.id ?? null,
      upholstery_category_name: categoryName,
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

    if (pendingExternalFavorites.has(clientId)) {
      return;
    }

    const nextFavorite = !currentFavorite;

    setPendingExternalFavorites((previous) => {
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
        upholstery_inventory_id: getInventoryClientIdForExternal(clientId),
        name: record.name,
        code: record.code,
        image_url: record.image_url,
        page_link: record.page_link ?? record.external_url ?? null,
        supplier_name: record.supplier_name ?? record.origin,
        upholstery_category_id: record.upholstery_category?.id ?? null,
        upholstery_category_name: await resolveExternalCategoryName(record),
      });
      await toggleFavoriteAction.toggleFavoriteAsync({
        client_id: clientId,
        favorite: nextFavorite,
      });
    } catch (error) {
      console.error("Failed to toggle external upholstery favorite", error);
      setPendingExternalFavorites((previous) => {
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
    activeProviderFilterCount,
    onFilterChange: handleFilterChange,
    openProviderFilterSheet,
    refetch,
    toggleFavorite: (clientId: string, currentFavorite: boolean) =>
      void handleToggleFavorite(clientId, currentFavorite),
  };
}

export type UpholsteryPickerController = ReturnType<
  typeof useUpholsteryPickerController
>;
