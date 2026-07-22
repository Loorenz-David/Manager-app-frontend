import { useQuery } from "@tanstack/react-query";
import type { PresentationListFilters } from "../types";
import { presentationKeys } from "./presentation-keys";
import { fetchPresentationsList } from "./presentations";

export function usePresentationsList(filters: PresentationListFilters = {}) {
  return useQuery({
    queryKey: presentationKeys.list(filters),
    queryFn: () => fetchPresentationsList(filters),
  });
}
