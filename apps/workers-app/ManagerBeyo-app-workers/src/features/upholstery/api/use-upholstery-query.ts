import { useQuery } from "@tanstack/react-query";
import { fetchUpholstery } from "./fetch-upholstery";
import { upholsteryKeys } from "./upholstery-keys";

export function useUpholsteryQuery(clientId: string | null | undefined) {
  return useQuery({
    queryKey: clientId
      ? upholsteryKeys.detail(clientId)
      : upholsteryKeys.missing(),
    queryFn: () => {
      if (!clientId) {
        throw new Error("clientId is required");
      }
      return fetchUpholstery(clientId);
    },
    enabled: Boolean(clientId),
  });
}
