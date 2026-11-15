import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import type { UpholsteryInventoryId } from "@/types/common";

import {
  InventoryHistoryPageSchema,
  type InventoryHistoryPage,
} from "../history-types";

const ListUpholsteryInventoryHistoryResponseSchema = ApiEnvelopeSchema(
  InventoryHistoryPageSchema,
).extend({ ok: z.literal(true) });

export type ListUpholsteryInventoryHistoryParams = {
  limit?: number;
  cursor?: string | null;
};

export async function listUpholsteryInventoryHistory(
  inventoryId: UpholsteryInventoryId,
  params: ListUpholsteryInventoryHistoryParams = {},
): Promise<InventoryHistoryPage> {
  const parsed = await apiClient.get(
    `/api/v1/upholstery-inventories/${inventoryId}/history`,
    ListUpholsteryInventoryHistoryResponseSchema,
    {
      limit: params.limit,
      cursor: params.cursor || undefined,
    },
  );

  return parsed.data;
}
