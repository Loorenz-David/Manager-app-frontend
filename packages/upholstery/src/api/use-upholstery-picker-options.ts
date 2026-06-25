import { useQuery } from "@tanstack/react-query";

import type { ListUpholsteryPickerParams } from "../types";
import { fetchUpholsteryPickerOptions } from "./fetch-upholstery-picker-options";
import { upholsteryKeys } from "./upholstery-keys";

export function useUpholsteryPickerOptionsQuery(
  params: ListUpholsteryPickerParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: upholsteryKeys.pickerList(params),
    queryFn: () => fetchUpholsteryPickerOptions(params),
    enabled: options.enabled ?? true,
    placeholderData: (previous) => previous,
  });
}
