import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  UPHOLSTERY_PROVIDER_FILTER_SHEET_ID,
  detectExternalItemCategoryName,
  type ExternalUpholsteryProvider,
  type UpholsteryProviderFilterSheetSurfaceProps,
  useCreateUpholstery,
  useExternalUpholsteryOptionsByProviderQuery,
  useUpholsteryPickerOptionsQuery,
  isExternalUpholsteryOrigin,
  type UpholsteryPickerOption,
  type UpholsteryPickerRecord,
} from "@beyo/upholstery";
import { generateClientId } from "@beyo/lib";

import {
  useListUpholsteryCategoriesQuery,
  type UpholsteryCategory,
} from "@/features/upholstery-category";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import type { UpholsteryInventoryId } from "@/types/common";

import { useListUpholsteryInventoriesQuery } from "../api/use-list-upholstery-inventories-query";
import {
  INVENTORY_CARD_ACTIONS_SHEET_ID,
  INVENTORY_CREATION_SLIDE_ID,
  INVENTORY_DETAIL_SLIDE_ID,
  STORED_AMOUNT_SHEET_ID,
  type InventoryCardActionsSurfaceProps,
  type InventoryCreationSurfaceProps,
  type InventoryDetailPrefill,
  type InventoryDetailSurfaceProps,
  type StoredAmountSurfaceProps,
} from "../surfaces";
import {
  toInventoryListCardViewModel,
  type InventoryListCardViewModel,
} from "../types";

export type InventoryPanelId = "categories" | "inventory" | "search";

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

function toDatabaseRecords(
  items: UpholsteryPickerOption[],
): UpholsteryPickerRecord[] {
  return items
    .filter(
      (item): item is UpholsteryPickerOption & { client_id: string } =>
        item.client_id !== null,
    )
    .map((item) => ({
      ...item,
      client_id: item.client_id,
      favorite: item.favorite ?? false,
    }));
}

export function useInventoryListController() {
  const [storedPanelId, setStoredPanelId] = useState<Exclude<InventoryPanelId, "search">>(
    "categories",
  );
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedCategory, setSelectedCategory] =
    useState<UpholsteryCategory | null>(null);
  const [upholsterySearchQ, setUpholsterySearchQState] = useState("");
  const [debouncedUpholsterySearchQ, setDebouncedUpholsterySearchQ] = useState("");
  const [selectedExternalProviders, setSelectedExternalProviders] = useState<
    ExternalUpholsteryProvider[]
  >([]);
  const externalClientIdsRef = useRef(new Map<string, string>());
  const externalInventoryClientIdsRef = useRef(new Map<string, string>());
  const isSearchActive = upholsterySearchQ.trim().length > 0;
  const activePanelId: InventoryPanelId = isSearchActive ? "search" : storedPanelId;

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedUpholsterySearchQ(upholsterySearchQ),
      300,
    );

    return () => window.clearTimeout(timeout);
  }, [upholsterySearchQ]);

  const categoriesQuery = useListUpholsteryCategoriesQuery();
  const inventoriesQuery = useListUpholsteryInventoriesQuery(
    { upholstery_category_ids: selectedCategory?.client_id ?? "" },
    { enabled: activePanelId === "inventory" && Boolean(selectedCategory) },
  );
  const dbSearchQuery = useUpholsteryPickerOptionsQuery(
    { q: debouncedUpholsterySearchQ },
    { enabled: isSearchActive },
  );
  const externalSearchQuery = useExternalUpholsteryOptionsByProviderQuery(
    { q: debouncedUpholsterySearchQ, providers: selectedExternalProviders },
    { enabled: isSearchActive },
  );

  const createUpholsteryAction = useCreateUpholstery();

  const getClientIdForExternal = useCallback((record: UpholsteryPickerOption) => {
    const key = getExternalIdentity(record);
    const existing = externalClientIdsRef.current.get(key);

    if (existing) {
      return existing;
    }

    const clientId = generateClientId("Upholstery");
    externalClientIdsRef.current.set(key, clientId);
    return clientId;
  }, []);

  const getInventoryClientIdForExternal = useCallback((upholsteryClientId: string) => {
    const existing = externalInventoryClientIdsRef.current.get(upholsteryClientId);

    if (existing) {
      return existing;
    }

    const clientId = generateClientId("UpholsteryInventory");
    externalInventoryClientIdsRef.current.set(upholsteryClientId, clientId);
    return clientId;
  }, []);

  const searchUpholsteries = useMemo(() => {
    if (!isSearchActive) {
      return [];
    }

    return mergePickerResults(
      filterItemsBySelectedProviders(
        dbSearchQuery.data?.upholsteries ?? [],
        selectedExternalProviders,
      ),
      externalSearchQuery.upholsteries,
      getClientIdForExternal,
    );
  }, [
    isSearchActive,
    dbSearchQuery.data,
    externalSearchQuery.upholsteries,
    selectedExternalProviders,
    getClientIdForExternal,
  ]);

  const isSearchLoading =
    isSearchActive &&
    (dbSearchQuery.isFetching || externalSearchQuery.isFetching);
  const activeProviderFilterCount = selectedExternalProviders.length > 0 ? 1 : 0;

  function setUpholsterySearchQ(value: string): void {
    const wasSearchActive = upholsterySearchQ.trim().length > 0;
    const willBeSearchActive = value.trim().length > 0;

    if (!wasSearchActive && willBeSearchActive) {
      setDirection(1);
    } else if (wasSearchActive && !willBeSearchActive) {
      setDirection(-1);
    }

    setUpholsterySearchQState(value);
  }

  function selectCategory(category: UpholsteryCategory): void {
    setDirection(1);
    setSelectedCategory(category);
    setStoredPanelId("inventory");
  }

  function goBack(): void {
    setDirection(-1);
    setStoredPanelId("categories");
  }

  async function refetch(): Promise<void> {
    if (activePanelId === "search") {
      await Promise.all([dbSearchQuery.refetch(), externalSearchQuery.refetch()]);
      return;
    }

    if (activePanelId === "inventory") {
      await inventoriesQuery.refetch();
      return;
    }

    await categoriesQuery.refetch();
  }

  function openDetail(inventoryId: UpholsteryInventoryId, prefill?: InventoryDetailPrefill): void {
    useSurfaceStore.getState().open(INVENTORY_DETAIL_SLIDE_ID, {
      inventoryId,
      prefill,
    } satisfies InventoryDetailSurfaceProps);
  }

  function openCardActions(inventoryId: UpholsteryInventoryId): void {
    useSurfaceStore.getState().open(INVENTORY_CARD_ACTIONS_SHEET_ID, {
      inventoryId,
    } satisfies InventoryCardActionsSurfaceProps);
  }

  function openAddAmount(card: InventoryListCardViewModel): void {
    useSurfaceStore.getState().open(STORED_AMOUNT_SHEET_ID, {
      inventoryId: card.inventoryId,
      prefill: {
        currentStoredAmountMeters: card.currentStoredAmountMeters,
        imageUrl: card.imageUrl,
        upholsteryName: card.name,
        storedDisplay: card.storedDisplay,
      },
    } satisfies StoredAmountSurfaceProps);
  }

  function openProviderFilterSheet(): void {
    useSurfaceStore.getState().open(UPHOLSTERY_PROVIDER_FILTER_SHEET_ID, {
      selectedProviders: selectedExternalProviders,
      onApply: setSelectedExternalProviders,
    } satisfies UpholsteryProviderFilterSheetSurfaceProps);
  }

  function prepareExternalCreate(record: UpholsteryPickerRecord): string {
    const inventoryClientId = getInventoryClientIdForExternal(record.client_id);

    void createExternalUpholstery(record, inventoryClientId);
    return inventoryClientId;
  }

  async function resolveExternalCategoryName(
    record: UpholsteryPickerRecord,
  ): Promise<string | null> {
    if (record.upholstery_category?.id) {
      return null;
    }

    return (await detectExternalItemCategoryName(record)) ?? "unknown";
  }

  async function createExternalUpholstery(
    record: UpholsteryPickerRecord,
    inventoryClientId: string,
  ): Promise<void> {
    const categoryName = await resolveExternalCategoryName(record);

    createUpholsteryAction.mutate({
      client_id: record.client_id,
      upholstery_inventory_id: inventoryClientId,
      name: record.name,
      code: record.code,
      image_url: record.image_url,
      page_link: record.page_link ?? record.external_url ?? null,
      supplier_name: record.supplier_name ?? record.origin,
      upholstery_category_id: record.upholstery_category?.id ?? null,
      upholstery_category_name: categoryName,
    });
  }

  function openCreationFormFromSearch(record: UpholsteryPickerRecord): void {
    useSurfaceStore.getState().open(INVENTORY_CREATION_SLIDE_ID, {
      mode: "prefill",
      prefill: {
        name: record.name,
        code: record.code,
        imageUrl: record.image_url,
        upholsteryClientId: record.client_id,
        upholsteryCategoryId: record.upholstery_category?.id ?? null,
      },
    } satisfies InventoryCreationSurfaceProps);
  }

  function openFromSearchDetail(record: UpholsteryPickerRecord): void {
    if (isExternalUpholsteryOrigin(record.origin)) {
      const inventoryClientId = prepareExternalCreate(record);
      openDetail(inventoryClientId as UpholsteryInventoryId, {
        name: record.name,
        code: record.code,
        imageUrl: record.image_url,
      });
      return;
    }
    if (record.inventory_id) {
      openDetail(record.inventory_id as UpholsteryInventoryId);
      return;
    }
    openCreationFormFromSearch(record);
  }

  function openFromSearchAdd(record: UpholsteryPickerRecord): void {
    if (isExternalUpholsteryOrigin(record.origin)) {
      const inventoryClientId = prepareExternalCreate(record);
      useSurfaceStore.getState().open(STORED_AMOUNT_SHEET_ID, {
        inventoryId: inventoryClientId as UpholsteryInventoryId,
        prefill: {
          currentStoredAmountMeters: null,
          imageUrl: record.image_url,
          upholsteryName: record.name,
          storedDisplay: "0 m",
        },
      } satisfies StoredAmountSurfaceProps);
      return;
    }
    if (record.inventory_id) {
      useSurfaceStore.getState().open(STORED_AMOUNT_SHEET_ID, {
        inventoryId: record.inventory_id as UpholsteryInventoryId,
        prefill: {
          currentStoredAmountMeters: record.current_stored_amount_meters,
          imageUrl: record.image_url,
          upholsteryName: record.name,
          storedDisplay: record.current_stored_amount_meters ?? "0 m",
        },
      } satisfies StoredAmountSurfaceProps);
      return;
    }
    openCreationFormFromSearch(record);
  }

  return {
    activePanelId,
    direction,
    selectedCategory,
    upholsterySearchQ,
    setUpholsterySearchQ,
    categoryCards: categoriesQuery.data?.items ?? [],
    isCategoriesLoading: categoriesQuery.isPending,
    isCategoriesFetched: categoriesQuery.isFetched,
    isCategoriesFetching: categoriesQuery.isFetching,
    inventoryCards: (inventoriesQuery.data?.items ?? []).map(
      toInventoryListCardViewModel,
    ),
    isInventoryLoading: inventoriesQuery.isPending,
    isInventoryFetched: inventoriesQuery.isFetched,
    searchUpholsteries,
    isSearchLoading,
    activeProviderFilterCount,
    selectCategory,
    goBack,
    refetch,
    openProviderFilterSheet,
    openDetail,
    openCardActions,
    openAddAmount,
    openFromSearchDetail,
    openFromSearchAdd,
  };
}

export type InventoryListController = ReturnType<
  typeof useInventoryListController
>;
