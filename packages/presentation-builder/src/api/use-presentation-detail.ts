import { useQuery } from "@tanstack/react-query";
import { presentationKeys } from "./presentation-keys";
import { fetchPresentationDetail } from "./presentations";

export function usePresentationDetail(id: string) {
  return useQuery({
    queryKey: presentationKeys.detail(id),
    queryFn: () => fetchPresentationDetail(id),
    enabled: Boolean(id),
  });
}
