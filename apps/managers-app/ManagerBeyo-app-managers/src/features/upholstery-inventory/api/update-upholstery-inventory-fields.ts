import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import type { UpholsteryInventoryId } from "@/types/common";

export type UpdateUpholsteryInventoryFieldsPayload = {
  low_stock_threshold_meters?: string | null;
};

const UpdateInventoryFieldsResponseSchema = z.object({}).passthrough();

export async function updateUpholsteryInventoryFields(
  inventoryId: UpholsteryInventoryId,
  payload: UpdateUpholsteryInventoryFieldsPayload,
): Promise<void> {
  await apiClient.patch(
    `/api/v1/upholstery-inventories/${inventoryId}`,
    UpdateInventoryFieldsResponseSchema,
    payload,
  );
}
