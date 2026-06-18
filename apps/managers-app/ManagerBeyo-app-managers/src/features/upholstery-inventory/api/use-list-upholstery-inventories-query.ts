import { useQuery } from "@tanstack/react-query";

import { upholsteryInventoryKeys } from "@/features/upholstery/api/upholstery-keys";

import { listUpholsteryInventories } from "./list-upholstery-inventories";
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
  });
}
