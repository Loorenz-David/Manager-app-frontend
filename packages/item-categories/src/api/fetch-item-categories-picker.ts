import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ItemCategoryPickerOptionSchema,
  type ListItemCategoriesPickerParams,
} from "../types/picker";

const ListItemCategoriesPickerResponseSchema = ApiEnvelopeSchema(
  z.object({
    item_categories: z.array(ItemCategoryPickerOptionSchema),
    item_categories_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);

export async function fetchItemCategoriesPicker(
  params: ListItemCategoriesPickerParams = {},
): Promise<{
  itemCategories: z.infer<typeof ItemCategoryPickerOptionSchema>[];
  itemCategoriesPagination: {
    has_more: boolean;
    limit: number;
    offset: number;
  };
}> {
  const envelope = await apiClient.get(
    "/api/v1/item-categories",
    ListItemCategoriesPickerResponseSchema,
    {
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
      q: params.q,
    },
  );

  return {
    itemCategories: envelope.data.item_categories,
    itemCategoriesPagination: envelope.data.item_categories_pagination,
  };
}
