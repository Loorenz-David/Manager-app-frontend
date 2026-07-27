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

// Pane order for the picker body stack — the pills and the slide stack share
// this order, so "next"/"previous" mean the same thing in both.
const FILTER_ORDER: UpholsteryQuickFilter[] =
  UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS.map((option) => option.value);

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
  const [pendingExternalFavorites, setPendingExternalFavorites] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectingClientId, setSelectingClientId] = useState<string | null>(null);
  const [selectedExternalProviders, setSelectedExternalProviders] = useState<
    ExternalUpholsteryProvider[]
  >([]);
  const externalClientIdsRef = useRef(new Map<string, string>());
  const externalInventoryClientIdsRef = useRef(new Map<string, string>());
  const pendingCreatePromisesRef = useRef(
    new Map<string, Promise<UpholsteryPickerOption & { client_id: string }>>(),
  );

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
    setActiveFilter(nextFilter);
  }

  function goToAdjacentFilter(offset: 1 | -1) {
    const nextFilter = FILTER_ORDER[FILTER_ORDER.indexOf(activeFilter) + offset];

    if (nextFilter) {
      setActiveFilter(nextFilter);
    }
  }

  // Every filter's records are kept resolved, not just the active one: the body
  // slide stack renders the incoming pane while the finger drags, so it needs
  // that pane's real content before the navigation commits.
  const { upholsteriesByFilter: baseUpholsteriesByFilter, isLoadingByFilter } =
    useMemo((): {
      upholsteriesByFilter: Record<UpholsteryQuickFilter, UpholsteryPickerRecord[]>;
      isLoadingByFilter: Record<UpholsteryQuickFilter, boolean>;
    } => {
      if (searchQuery.trim().length > 0) {
        const dbItems = filterItemsBySelectedProviders(
          searchResultsQuery.data?.upholsteries ?? [],
          selectedExternalProviders,
        );
        // Search overrides the quick filters (the pills are disabled while
        // searching), so every pane resolves to the same result set.
        const searchRecords = mergePickerResults(
          dbItems,
          externalSearchQuery.upholsteries,
          getClientIdForExternal,
        );
        const isSearching =
          searchResultsQuery.isFetching || externalSearchQuery.isFetching;

        return {
          upholsteriesByFilter: {
            favorite: searchRecords,
            in_stock: searchRecords,
            out_of_stock: searchRecords,
          },
          isLoadingByFilter: {
            favorite: isSearching,
            in_stock: isSearching,
            out_of_stock: isSearching,
          },
        };
      }

      return {
        upholsteriesByFilter: {
          favorite: toDatabaseRecords(favoritesQuery.data?.upholsteries ?? []),
          in_stock: toDatabaseRecords(inStockQuery.data?.upholsteries ?? []),
          out_of_stock: toDatabaseRecords(outOfStockQuery.data?.upholsteries ?? []),
        },
        isLoadingByFilter: {
          favorite: favoritesQuery.isPending,
          in_stock: inStockQuery.isPending,
          out_of_stock: outOfStockQuery.isPending,
        },
      };
    }, [
      searchQuery,
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

  const upholsteriesByFilter = useMemo(() => {
    if (pendingExternalFavorites.size === 0) {
      return baseUpholsteriesByFilter;
    }

    const applyPendingFavorites = (records: UpholsteryPickerRecord[]) =>
      records.map((record) =>
        pendingExternalFavorites.has(record.client_id)
          ? { ...record, favorite: true }
          : record,
      );

    return {
      favorite: applyPendingFavorites(baseUpholsteriesByFilter.favorite),
      in_stock: applyPendingFavorites(baseUpholsteriesByFilter.in_stock),
      out_of_stock: applyPendingFavorites(baseUpholsteriesByFilter.out_of_stock),
    };
  }, [baseUpholsteriesByFilter, pendingExternalFavorites]);

  const upholsteries = upholsteriesByFilter[activeFilter];
  const isLoading = isLoadingByFilter[activeFilter];
  const activeProviderFilterCount = selectedExternalProviders.length > 0 ? 1 : 0;

  useEffect(() => {
    if (pendingExternalFavorites.size === 0) {
      return;
    }

    const activeExternalIds = new Set(
      upholsteries
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
  }, [upholsteries, pendingExternalFavorites]);

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

  async function persistExternalUpholstery(
    record: UpholsteryPickerRecord,
  ): Promise<UpholsteryPickerOption & { client_id: string }> {
    const existingPromise = pendingCreatePromisesRef.current.get(record.client_id);

    if (existingPromise) {
      return existingPromise;
    }

    const createPromise = (async () => {
      const categoryName = await resolveExternalCategoryName(record);
      const upholstery = await createUpholsteryAction.mutateAsync({
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

      externalClientIdsRef.current.set(getExternalIdentity(record), upholstery.client_id);
      if (upholstery.inventory_id) {
        externalInventoryClientIdsRef.current.set(
          upholstery.client_id,
          upholstery.inventory_id,
        );
      }

      return upholstery;
    })();

    pendingCreatePromisesRef.current.set(record.client_id, createPromise);

    try {
      return await createPromise;
    } finally {
      pendingCreatePromisesRef.current.delete(record.client_id);
    }
  }

  async function selectUpholstery(clientId: string): Promise<string> {
    setSelectionError(null);

    const record = upholsteries.find((entry) => entry.client_id === clientId);

    if (!record || !isExternalUpholsteryOrigin(record.origin)) {
      return clientId;
    }

    setSelectingClientId(clientId);

    try {
      const upholstery = await persistExternalUpholstery(record);
      return upholstery.client_id;
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Could not create upholstery. Please try again.";
      setSelectionError(message);
      throw error;
    } finally {
      setSelectingClientId((current) => (current === clientId ? null : current));
    }
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
      await persistExternalUpholstery(record);
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
    filterOptions: UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
    upholsteries,
    upholsteriesByFilter,
    isLoading,
    isLoadingByFilter,
    goToPreviousFilter: () => goToAdjacentFilter(-1),
    goToNextFilter: () => goToAdjacentFilter(1),
    selectUpholstery,
    isSelectionPending: selectingClientId !== null,
    selectingClientId,
    selectionError,
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
