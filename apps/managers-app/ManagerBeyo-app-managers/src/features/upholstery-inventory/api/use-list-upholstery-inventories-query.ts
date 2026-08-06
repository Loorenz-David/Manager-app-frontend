import { useQuery } from "@tanstack/react-query";

import { listUpholsteryInventories } from "./list-upholstery-inventories";
import { upholsteryInventoryKeys } from "./upholstery-inventory-keys";
import type { ListUpholsteryInventoriesParams } from "../types";

const LIST_LIMIT = 50;

export function useListUpholsteryInventoriesQuery(
  params: Omit<ListUpholsteryInventoriesParams, "limit" | "offset"> = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: upholsteryInventoryKeys.list({ ...params, limit: LIST_LIMIT }),
    queryFn: () =>
      listUpholsteryInventories({
        ...params,
        limit: LIST_LIMIT,
        offset: 0,
      }),
    enabled: options.enabled ?? true,
    // Deliberately NO `placeholderData: (previous) => previous`. Each category
    // is a different key, so carrying the previous result over means the list
    // renders the category the user just left — wrong content, and a full list
    // of image cards rendered twice (once as the placeholder, once for real).
    // A refetch of the same key keeps its data regardless, so pull-to-refresh
    // is unaffected; only the cross-category swap changes, and there the
    // skeletons are both cheaper and honest.
  });
}
