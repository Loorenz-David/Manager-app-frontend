import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const DeleteItemUpholsteryResponseSchema = ApiEnvelopeSchema(z.object({})).extend(
  {
    ok: z.literal(true),
  },
);

/**
 * Removes an item's upholstery link. The backend cancels the row's active
 * requirement first, returning its reserved meters to the inventory, and
 * answers 409 when that requirement is already completed.
 */
export async function deleteItemUpholstery(itemUpholsteryId: string) {
  return apiClient.delete(
    `/api/v1/item-upholsteries/${itemUpholsteryId}`,
    DeleteItemUpholsteryResponseSchema,
  );
}
