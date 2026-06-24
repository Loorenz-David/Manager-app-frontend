import type { QueryClient } from "@tanstack/react-query";

import {
  fetchItemCategoriesPicker,
  itemCategoryPickerKeys,
} from "@beyo/item-categories";
import {
  fetchWorkingSectionsPicker,
  workingSectionKeys,
} from "@beyo/working-sections";

export async function prefetchTaskCreationFormData(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: itemCategoryPickerKeys.list(),
      queryFn: () => fetchItemCategoriesPicker(),
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: workingSectionKeys.list(),
      queryFn: fetchWorkingSectionsPicker,
      staleTime: 60_000,
    }),
  ]);
}
