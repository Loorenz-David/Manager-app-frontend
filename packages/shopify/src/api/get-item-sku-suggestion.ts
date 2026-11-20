import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { ItemSkuSuggestionSchema, type ItemSkuSuggestion } from "../types";

const Envelope = ApiEnvelopeSchema(ItemSkuSuggestionSchema).extend({
  ok: z.literal(true),
});

/** Next house SKU (e.g. "T3-201126") for an item category on the given day. */
export async function getItemSkuSuggestion(params: {
  itemCategoryId: string;
  dateCode: string;
}): Promise<ItemSkuSuggestion> {
  const parsed = await apiClient.get("/api/v1/items/sku-suggestion", Envelope, {
    item_category_id: params.itemCategoryId,
    date_code: params.dateCode,
  });
  return parsed.data;
}
