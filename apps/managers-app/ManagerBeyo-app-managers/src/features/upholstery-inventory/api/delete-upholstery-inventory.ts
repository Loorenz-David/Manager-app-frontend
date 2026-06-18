import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import type { UpholsteryInventoryId } from "@/types/common";

const DeleteUpholsteryInventoryResponseSchema = ApiEnvelopeSchema(
  z.object({}).passthrough(),
).extend({ ok: z.literal(true) });

export async function deleteUpholsteryInventory(
  inventoryId: UpholsteryInventoryId,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/upholstery-inventories/${inventoryId}`,
    DeleteUpholsteryInventoryResponseSchema,
  );
}
