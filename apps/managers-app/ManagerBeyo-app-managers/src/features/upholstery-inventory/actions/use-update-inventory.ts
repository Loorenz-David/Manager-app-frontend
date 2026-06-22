import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpholsteryId, UpholsteryInventoryId } from "@/types/common";

import { updateUpholstery } from "../api/update-upholstery";
import { updateUpholsteryInventoryFields } from "../api/update-upholstery-inventory-fields";
import { normalizeNonNegativeDecimalString } from "../lib/decimal";
import { invalidateAfterInventoryMutation } from "../lib/invalidate-inventory";
import type { CreateInventoryFormValues, EditInventoryPrefill } from "../types";

export type UpdateInventoryInput = {
  upholsteryId: UpholsteryId;
  inventoryId: UpholsteryInventoryId;
  values: CreateInventoryFormValues;
  original: EditInventoryPrefill;
};

function normalizeOptionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      upholsteryId,
      inventoryId,
      values,
      original,
    }: UpdateInventoryInput): Promise<void> => {
      const promises: Promise<void>[] = [];

      const normalizedName = values.name.trim();
      const normalizedCode = normalizeOptionalText(values.code);
      const normalizedImageUrl = normalizeOptionalText(values.image_url);

      const upholsteryChanged =
        normalizedName !== original.name ||
        normalizedCode !== normalizeOptionalText(original.code) ||
        normalizedImageUrl !== normalizeOptionalText(original.image_url) ||
        values.favorite !== original.favorite ||
        values.upholstery_category_id !== original.upholstery_category_id;

      if (upholsteryChanged) {
        promises.push(
          updateUpholstery(upholsteryId, {
            name: normalizedName,
            code: normalizedCode,
            image_url: normalizedImageUrl,
            favorite: values.favorite,
            upholstery_category_id:
              values.upholstery_category_id !== original.upholstery_category_id
                ? values.upholstery_category_id
                : undefined,
          }),
        );
      }

      const normalizedThreshold = values.low_stock_threshold_meters
        ? (normalizeNonNegativeDecimalString(values.low_stock_threshold_meters) ??
          null)
        : null;
      const normalizedOriginalThreshold = original.low_stock_threshold_meters
        ? (normalizeNonNegativeDecimalString(original.low_stock_threshold_meters) ??
          null)
        : null;

      if (normalizedThreshold !== normalizedOriginalThreshold) {
        promises.push(
          updateUpholsteryInventoryFields(inventoryId, {
            low_stock_threshold_meters: normalizedThreshold,
          }),
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    },
    onSettled: (_data, _error, variables) => {
      invalidateAfterInventoryMutation(queryClient, {
        inventoryId: variables.inventoryId,
      });
    },
  });
}
