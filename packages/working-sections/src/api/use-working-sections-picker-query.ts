import { useQuery } from "@tanstack/react-query";

import { fetchWorkingSectionsPicker } from "./fetch-working-sections-picker";
import { workingSectionKeys } from "./working-section-keys";

export function useWorkingSectionsPickerQuery(
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: workingSectionKeys.list(),
    queryFn: fetchWorkingSectionsPicker,
    enabled: options.enabled ?? true,
  });
}
