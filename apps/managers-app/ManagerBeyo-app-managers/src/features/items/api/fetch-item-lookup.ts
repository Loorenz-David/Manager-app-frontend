import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import { ItemLookupResultSchema, type LookupItemsParams } from "../types";

const LookupItemsResponseSchema = ApiEnvelopeSchema(
  z.object({
    items: z.array(ItemLookupResultSchema),
  }),
);

export async function fetchItemLookup(params: LookupItemsParams) {
  const queryParams =
    "article_number" in params
      ? { article_number: params.article_number }
      : { sku: params.sku };

  const response = await apiClient.get(
    "/api/v1/items/lookup",
    LookupItemsResponseSchema,
    queryParams,
  );

  return {
    items: response.data.items,
  };
}
