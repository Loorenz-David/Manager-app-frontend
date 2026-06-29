import { useQuery } from "@tanstack/react-query";

import {
  fetchExternalUpholsteryOptions,
  type FetchExternalUpholsteryOptionsParams,
} from "./fetch-external-upholstery-options";
import { upholsteryKeys } from "./upholstery-keys";

export type UseExternalUpholsteryOptionsParams =
  FetchExternalUpholsteryOptionsParams;

export function useExternalUpholsteryOptionsQuery(
  params: UseExternalUpholsteryOptionsParams,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? params.q.trim().length >= 1;

  return useQuery({
    queryKey: upholsteryKeys.externalSearch(params),
    queryFn: () => fetchExternalUpholsteryOptions(params),
    enabled,
    placeholderData: (previous) => previous,
  });
}
