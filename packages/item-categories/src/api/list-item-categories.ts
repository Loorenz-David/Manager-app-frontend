import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type {
  ListItemCategoriesParams,
  ListItemCategoriesResponse,
} from "../types";
import { ListItemCategoriesResponseSchema } from "../types";

export async function listItemCategories(
  params: ListItemCategoriesParams = {},
): Promise<ListItemCategoriesResponse> {
  const { limit = 200, offset = 0, q } = params;
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (q) {
    searchParams.set("q", q);
  }

  const envelope = await apiClient.get(
    `/api/v1/item-categories?${searchParams.toString()}`,
    ApiEnvelopeSchema(ListItemCategoriesResponseSchema),
  );

  return envelope.data;
}
