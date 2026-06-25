import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useCreateUpholstery,
  useNevotexUpholsteryOptionsQuery,
  useUpholsteryPickerOptionsQuery,
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
  type InventoryDetailSurfaceProps,
  type StoredAmountSurfaceProps,
} from "../surfaces";
import {
  toInventoryListCardViewModel,
  type InventoryListCardViewModel,
} from "../types";

export type InventoryPanelId = "categories" | "inventory" | "search";

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
  const nevotexClientIdsRef = useRef(new Map<string, string>());
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
  const nevotexSearchQuery = useNevotexUpholsteryOptionsQuery(
    { q: debouncedUpholsterySearchQ, limit: 7 },
    { enabled: isSearchActive },
  );
  const createUpholsteryAction = useCreateUpholstery();

  const getClientIdForNevotex = useCallback((record: UpholsteryPickerOption) => {
    const key = record.name.trim().toLowerCase();
    const existing = nevotexClientIdsRef.current.get(key);

    if (existing) {
      return existing;
    }

    const clientId = generateClientId("Upholstery");
    nevotexClientIdsRef.current.set(key, clientId);
    return clientId;
  }, []);

  const searchUpholsteries = useMemo(() => {
    if (!isSearchActive) {
      return [];
    }

    return mergePickerResults(
      dbSearchQuery.data?.upholsteries ?? [],
      nevotexSearchQuery.data?.upholsteries ?? [],
      getClientIdForNevotex,
    );
  }, [
    isSearchActive,
    dbSearchQuery.data,
    nevotexSearchQuery.data,
    getClientIdForNevotex,
  ]);

  const isSearchLoading =
    isSearchActive &&
    (dbSearchQuery.isPending || nevotexSearchQuery.isPending);

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
      await Promise.all([dbSearchQuery.refetch(), nevotexSearchQuery.refetch()]);
      return;
    }

    if (activePanelId === "inventory") {
      await inventoriesQuery.refetch();
      return;
    }

    await categoriesQuery.refetch();
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

  function prepareAndOpenFromSearch(record: UpholsteryPickerRecord): void {
    if (record.origin === "nevotex") {
      createUpholsteryAction.mutate({
        client_id: record.client_id,
        name: record.name,
        code: record.code,
        image_url: record.image_url,
      });
    }

    useSurfaceStore.getState().open(INVENTORY_CREATION_SLIDE_ID, {
      mode: "prefill",
      prefill: {
        name: record.name,
        code: record.code,
        imageUrl: record.image_url,
        upholsteryClientId: record.client_id,
      },
    } satisfies InventoryCreationSurfaceProps);
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
    selectCategory,
    goBack,
    refetch,
    openDetail,
    openCardActions,
    openAddAmount,
    openFromSearch: prepareAndOpenFromSearch,
  };
}

export type InventoryListController = ReturnType<
  typeof useInventoryListController
>;
