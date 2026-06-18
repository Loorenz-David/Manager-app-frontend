import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import type { UpholsteryInventoryId } from "@/types/common";

import {
  UpholsteryInventoryDetailSchema,
  type UpholsteryInventoryDetail,
} from "../types";

const GetUpholsteryInventoryResponseSchema = ApiEnvelopeSchema(
  z.object({
    inventory: UpholsteryInventoryDetailSchema,
  }),
).extend({ ok: z.literal(true) });

export async function getUpholsteryInventory(
  inventoryId: UpholsteryInventoryId,
): Promise<UpholsteryInventoryDetail> {
  const parsed = await apiClient.get(
    `/api/v1/upholstery-inventories/${inventoryId}`,
    GetUpholsteryInventoryResponseSchema,
  );

  return parsed.data.inventory;
}
