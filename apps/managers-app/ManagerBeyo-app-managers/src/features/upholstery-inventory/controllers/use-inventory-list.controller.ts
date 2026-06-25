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
  type InventoryDetailPrefill,
  type InventoryDetailSurfaceProps,
  type StoredAmountSurfaceProps,
} from "../surfaces";
import {
  toInventoryListCardViewModel,
  type InventoryListCardViewModel,
} from "../types";

export type InventoryPanelId = "categories" | "inventory" | "search";

// Derive the category name from a single Nevotex upholstery name by stripping
// everything from the first numeric token onward.
// "Tyg Ballroom Blitz 0408 Steel" → "Tyg Ballroom Blitz"
// "Tyg Lazy 21 Rose"              → "Tyg Lazy"
// Returns null when no numeric separator is found (pattern not recognised).
function deriveItemCategoryName(name: string): string | null {
  const words = name.trim().split(/\s+/);
  const firstNumericIndex = words.findIndex((w) => /^\d/.test(w));
  return firstNumericIndex > 0 ? words.slice(0, firstNumericIndex).join(" ") : null;
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
  const nevotexInventoryClientIdsRef = useRef(new Map<string, string>());
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

  const getInventoryClientIdForNevotex = useCallback((upholsteryClientId: string) => {
    const existing = nevotexInventoryClientIdsRef.current.get(upholsteryClientId);

    if (existing) {
      return existing;
    }

    const clientId = generateClientId("UpholsteryInventory");
    nevotexInventoryClientIdsRef.current.set(upholsteryClientId, clientId);
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

  function prepareNevotexCreate(record: UpholsteryPickerRecord): string {
    const inventoryClientId = getInventoryClientIdForNevotex(record.client_id);
    const categoryName = deriveItemCategoryName(record.name);
    createUpholsteryAction.mutate({
      client_id: record.client_id,
      upholstery_inventory_id: inventoryClientId,
      name: record.name,
      code: record.code,
      image_url: record.image_url,
      upholstery_category_name: categoryName,
    });
    return inventoryClientId;
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
    if (record.origin === "nevotex") {
      const inventoryClientId = prepareNevotexCreate(record);
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
    if (record.origin === "nevotex") {
      const inventoryClientId = prepareNevotexCreate(record);
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
    selectCategory,
    goBack,
    refetch,
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
