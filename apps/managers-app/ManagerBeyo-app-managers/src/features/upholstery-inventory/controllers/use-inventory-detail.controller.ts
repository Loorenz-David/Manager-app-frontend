import { useMemo } from "react";

import { useUpholsteryPickerOptionQuery } from "@/features/upholstery/api/use-upholstery-picker-option";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import type { UpholsteryInventoryId } from "@/types/common";

import { useGetUpholsteryInventoryQuery } from "../api/use-get-upholstery-inventory-query";
import {
  INVENTORY_CREATION_SLIDE_ID,
  INVENTORY_DETAIL_ACTIONS_SHEET_ID,
  STORED_AMOUNT_SHEET_ID,
  type InventoryCreationSurfaceProps,
  type InventoryDetailActionsSurfaceProps,
  type StoredAmountSurfaceProps,
} from "../surfaces";
import { toInventoryDetailViewModel } from "../types";

export function useInventoryDetailController(
  inventoryId: UpholsteryInventoryId,
) {
  const query = useGetUpholsteryInventoryQuery(inventoryId);
  const upholsteryQuery = useUpholsteryPickerOptionQuery(
    query.data?.upholstery_id ?? null,
  );
  const detail = useMemo(
    () => (query.data ? toInventoryDetailViewModel(query.data) : null),
    [query.data],
  );

  async function refetch(): Promise<void> {
    await query.refetch();
  }

  function openStoredAmountEditor(): void {
    useSurfaceStore.getState().open(STORED_AMOUNT_SHEET_ID, {
      inventoryId,
      prefill: {
        currentStoredAmountMeters:
          detail?.raw.current_stored_amount_meters ?? null,
        imageUrl: detail?.imageUrl ?? null,
        upholsteryName: detail?.name ?? "",
        storedDisplay: detail?.storedDisplay ?? "0 m",
      },
    } satisfies StoredAmountSurfaceProps);
  }

  function openDetailActions(): void {
    useSurfaceStore.getState().open(INVENTORY_DETAIL_ACTIONS_SHEET_ID, {
      inventoryId,
    } satisfies InventoryDetailActionsSurfaceProps);
  }

  function openEdit(): void {
    if (!detail) {
      return;
    }

    useSurfaceStore.getState().open(INVENTORY_CREATION_SLIDE_ID, {
      mode: "edit",
      upholsteryId: detail.raw.upholstery_id,
      inventoryId: detail.raw.client_id,
      prefill: {
        upholstery_category_id:
          upholsteryQuery.data?.upholstery_category?.id ?? null,
        name: detail.raw.upholstery_name ?? "",
        code: detail.raw.upholstery_code ?? "",
        image_url: detail.raw.image_url,
        low_stock_threshold_meters: detail.raw.low_stock_threshold_meters,
        favorite: detail.raw.favorite,
      },
    } satisfies InventoryCreationSurfaceProps);
  }

  return {
    inventoryId,
    detail,
    isPending: query.isPending,
    isError: query.isError,
    refetch,
    openStoredAmountEditor,
    openDetailActions,
    openEdit,
  };
}

export type InventoryDetailController = ReturnType<
  typeof useInventoryDetailController
>;
