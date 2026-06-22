import { useQuery } from "@tanstack/react-query";

import { getUpholsteryCategory } from "./get-upholstery-category";
import { upholsteryCategoryKeys } from "./upholstery-category-keys";

export function useGetUpholsteryCategoryQuery(
  id: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: upholsteryCategoryKeys.detail(id ?? ""),
    queryFn: () => getUpholsteryCategory(id!),
    enabled: (options.enabled ?? true) && Boolean(id),
  });
}
