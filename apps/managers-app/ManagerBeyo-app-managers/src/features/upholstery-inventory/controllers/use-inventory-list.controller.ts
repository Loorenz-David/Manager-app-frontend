import { useEffect, useState } from "react";

import {
  useListUpholsteryCategoriesQuery,
  type UpholsteryCategory,
} from "@/features/upholstery-category";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import type { UpholsteryInventoryId } from "@/types/common";

import { useListUpholsteryInventoriesQuery } from "../api/use-list-upholstery-inventories-query";
import {
  INVENTORY_CARD_ACTIONS_SHEET_ID,
  INVENTORY_DETAIL_SLIDE_ID,
  STORED_AMOUNT_SHEET_ID,
  type InventoryCardActionsSurfaceProps,
  type InventoryDetailSurfaceProps,
  type StoredAmountSurfaceProps,
} from "../surfaces";
import {
  toInventoryListCardViewModel,
  type InventoryListCardViewModel,
} from "../types";

export type InventoryPanelId = "categories" | "inventory";

export function useInventoryListController() {
  const [activePanelId, setActivePanelId] =
    useState<InventoryPanelId>("categories");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedCategory, setSelectedCategory] =
    useState<UpholsteryCategory | null>(null);
  const [categoryQ, setCategoryQ] = useState("");
  const [debouncedCategoryQ, setDebouncedCategoryQ] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedCategoryQ(categoryQ),
      300,
    );

    return () => window.clearTimeout(timeout);
  }, [categoryQ]);

  const categoriesQuery = useListUpholsteryCategoriesQuery({
    q: debouncedCategoryQ.trim() || undefined,
  });
  const inventoriesQuery = useListUpholsteryInventoriesQuery(
    { upholstery_category_ids: selectedCategory?.client_id ?? "" },
    { enabled: activePanelId === "inventory" && Boolean(selectedCategory) },
  );

  function selectCategory(category: UpholsteryCategory): void {
    setDirection(1);
    setSelectedCategory(category);
    setActivePanelId("inventory");
  }

  function goBack(): void {
    setDirection(-1);
    setActivePanelId("categories");
  }

  async function refetch(): Promise<void> {
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

  return {
    activePanelId,
    direction,
    selectedCategory,
    categoryQ,
    setCategoryQ,
    categoryCards: categoriesQuery.data?.items ?? [],
    isCategoriesLoading: categoriesQuery.isPending,
    isCategoriesFetched: categoriesQuery.isFetched,
    isCategoriesFetching: categoriesQuery.isFetching,
    inventoryCards: (inventoriesQuery.data?.items ?? []).map(
      toInventoryListCardViewModel,
    ),
    isInventoryLoading: inventoriesQuery.isPending,
    isInventoryFetched: inventoriesQuery.isFetched,
    selectCategory,
    goBack,
    refetch,
    openDetail,
    openCardActions,
    openAddAmount,
  };
}

export type InventoryListController = ReturnType<
  typeof useInventoryListController
>;
