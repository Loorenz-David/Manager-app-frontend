import { useQuery } from "@tanstack/react-query";
import { itemCategoryKeys } from "./item-category-keys";
import { listItemCategories } from "./list-item-categories";
import type { ListItemCategoriesParams } from "../types";

const CACHE_PARAMS = { limit: 200, offset: 0 } as const;

export function useItemCategoriesQuery(params?: ListItemCategoriesParams) {
  const resolvedParams = {
    limit: params?.limit ?? CACHE_PARAMS.limit,
    offset: params?.offset ?? CACHE_PARAMS.offset,
    ...(params?.q !== undefined && { q: params.q }),
  };

  return useQuery({
    queryKey: itemCategoryKeys.list(resolvedParams),
    queryFn: () => listItemCategories(resolvedParams),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
