import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import {
  UpholsteryCategorySchema,
  type ListUpholsteryCategoriesParams,
  type UpholsteryCategory,
} from "../types";

const ListUpholsteryCategoriesResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery_categories: z.array(UpholsteryCategorySchema),
    upholstery_categories_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type ListUpholsteryCategoriesResult = {
  items: UpholsteryCategory[];
  has_more: boolean;
};

export async function listUpholsteryCategories(
  params: ListUpholsteryCategoriesParams,
): Promise<ListUpholsteryCategoriesResult> {
  const parsed = await apiClient.get(
    "/api/v1/upholstery-categories",
    ListUpholsteryCategoriesResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      q: params.q || undefined,
      favorite: params.favorite,
    },
  );

  return {
    items: parsed.data.upholstery_categories,
    has_more: parsed.data.upholstery_categories_pagination.has_more,
  };
}
