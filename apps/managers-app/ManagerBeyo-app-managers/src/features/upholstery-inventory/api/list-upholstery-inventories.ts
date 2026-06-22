import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import {
  UpholsteryInventoryPartialSchema,
  type ListUpholsteryInventoriesParams,
  type UpholsteryInventoryPartial,
} from "../types";

const ListUpholsteryInventoriesResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery_inventories_pagination: z.object({
      items: z.array(UpholsteryInventoryPartialSchema),
      limit: z.number().int(),
      offset: z.number().int(),
      has_more: z.boolean(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type ListUpholsteryInventoriesResult = {
  items: UpholsteryInventoryPartial[];
  limit: number;
  offset: number;
  has_more: boolean;
};

export async function listUpholsteryInventories(
  params: ListUpholsteryInventoriesParams,
): Promise<ListUpholsteryInventoriesResult> {
  const parsed = await apiClient.get(
    "/api/v1/upholstery-inventories",
    ListUpholsteryInventoriesResponseSchema,
    {
      limit: params.limit,
      offset: params.offset,
      q: params.q || undefined,
      in_stock: params.in_stock,
      favorite: params.favorite,
      upholstery_category_ids: params.upholstery_category_ids || undefined,
    },
  );

  return parsed.data.upholstery_inventories_pagination;
}
