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
    placeholderData: (previousData) => previousData,
  });
}
