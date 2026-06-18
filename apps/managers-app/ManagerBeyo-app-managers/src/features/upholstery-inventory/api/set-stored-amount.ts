import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import type { UpholsteryInventoryId } from "@/types/common";

const SetStoredAmountResponseSchema = ApiEnvelopeSchema(
  z.object({}).passthrough(),
).extend({ ok: z.literal(true) });

export type SetStoredAmountInput = {
  inventoryId: UpholsteryInventoryId;
  current_stored_amount_meters: string;
};

export async function setStoredAmount({
  inventoryId,
  current_stored_amount_meters,
}: SetStoredAmountInput): Promise<void> {
  await apiClient.patch(
    `/api/v1/upholstery-inventories/${inventoryId}/current-stored-amount`,
    SetStoredAmountResponseSchema,
    { current_stored_amount_meters },
  );
}
