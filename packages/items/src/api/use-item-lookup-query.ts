import { useQuery } from "@tanstack/react-query";

import type { LookupItemsParams } from "../types";
import { fetchItemLookup } from "./fetch-item-lookup";
import { itemKeys } from "./item-keys";

export function useItemLookupQuery(
  params: LookupItemsParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: itemKeys.lookup(params),
    queryFn: () => fetchItemLookup(params),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    retry: false,
  });
}
