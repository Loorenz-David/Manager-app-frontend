import { useQuery } from "@tanstack/react-query";

import { fetchItemUpholstery } from "./fetch-item-upholstery";
import { itemUpholsteryKeys } from "./item-upholstery-keys";

export function useItemUpholsteryQuery(itemId: string | null | undefined) {
  return useQuery({
    queryKey: itemId
      ? itemUpholsteryKeys.byItem(itemId)
      : itemUpholsteryKeys.missing(),
    queryFn: () => {
      if (!itemId) {
        throw new Error("itemId is required");
      }

      return fetchItemUpholstery(itemId);
    },
    enabled: Boolean(itemId),
  });
}
