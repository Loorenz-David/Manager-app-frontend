import { useQuery } from "@tanstack/react-query";

import type { LookupItemLocationParams } from "../types";
import { fetchItemLocation } from "./fetch-item-location";
import { itemKeys } from "./item-keys";

export function useItemLocationQuery(
  params: LookupItemLocationParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: itemKeys.location(params),
    queryFn: () => fetchItemLocation(params),
    enabled: options.enabled ?? true,
    staleTime: 0,
    retry: false,
  });
}
