import { useQuery } from "@tanstack/react-query";

import type { ListUpholsteryCategoriesParams } from "../types";
import { listUpholsteryCategories } from "./list-upholstery-categories";
import { upholsteryCategoryKeys } from "./upholstery-category-keys";

// Deliberately small. The category list is a drag target: SlideStack mounts a
// full copy of the pane as the drag's stand-in, and a long list of image cards
// makes that mount block the frames the finger is moving in.
const LIST_LIMIT = 10;

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
