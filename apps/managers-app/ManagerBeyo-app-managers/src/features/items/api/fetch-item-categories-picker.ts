import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import {
  ItemCategoryPickerOptionSchema,
  type ListItemCategoriesPickerParams,
} from '../types';

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
) {
  const response = await apiClient.get(
    '/api/v1/item-categories',
    ListItemCategoriesPickerResponseSchema,
    {
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
      q: params.q,
    },
  );

  return {
    itemCategories: response.data.item_categories,
  };
}
