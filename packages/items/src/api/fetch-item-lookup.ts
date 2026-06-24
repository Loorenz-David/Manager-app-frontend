import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ItemLookupResultSchema, type LookupItemsParams } from "../types";

const LookupItemsResponseSchema = ApiEnvelopeSchema(
  z.object({
    items: z.array(ItemLookupResultSchema),
  }),
);

export async function fetchItemLookup(
  params: LookupItemsParams,
): Promise<{ items: z.infer<typeof ItemLookupResultSchema>[] }> {
  const queryParams =
    "article_number" in params
      ? { article_number: params.article_number }
      : { sku: params.sku };

  const envelope = await apiClient.get(
    "/api/v1/items/lookup",
    LookupItemsResponseSchema,
    queryParams,
  );

  return {
    items: envelope.data.items,
  };
}
