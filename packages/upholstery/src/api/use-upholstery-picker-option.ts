import { useQuery } from "@tanstack/react-query";

import { fetchUpholstery } from "./fetch-upholstery";
import { upholsteryKeys } from "./upholstery-keys";

export function useUpholsteryPickerOptionQuery(clientId: string | null | undefined) {
  return useQuery({
    queryKey: upholsteryKeys.detail(clientId ?? ""),
    queryFn: () => fetchUpholstery(clientId ?? ""),
    enabled: Boolean(clientId),
  });
}
