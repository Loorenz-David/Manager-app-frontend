import { useQuery } from "@tanstack/react-query";

import type { ListUpholsteryCategoriesParams } from "../types";
import { listUpholsteryCategories } from "./list-upholstery-categories";
import { upholsteryCategoryKeys } from "./upholstery-category-keys";

const LIST_LIMIT = 50;

export function useListUpholsteryCategoriesQuery(
  params: ListUpholsteryCategoriesParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: upholsteryCategoryKeys.list({ ...params, limit: LIST_LIMIT }),
    queryFn: () => listUpholsteryCategories({ ...params, limit: LIST_LIMIT }),
    enabled: options.enabled ?? true,
    placeholderData: (previous) => previous,
  });
}
