import { useQuery } from "@tanstack/react-query";

import { fetchNevotexUpholsteryOptions } from "./fetch-nevotex-upholstery-options";
import { upholsteryKeys } from "./upholstery-keys";

export type UseNevotexUpholsteryOptionsParams = {
  q: string;
  limit?: number;
};

export function useNevotexUpholsteryOptionsQuery(
  params: UseNevotexUpholsteryOptionsParams,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? params.q.trim().length >= 1;

  return useQuery({
    queryKey: upholsteryKeys.nevotexSearch(params.q),
    queryFn: () => fetchNevotexUpholsteryOptions(params),
    enabled,
    placeholderData: (previous) => previous,
  });
}
