import { z } from "zod";

import { UpholsteryPickerOptionSchema } from "../types";
import { fetchExternalUpholsteryOptions } from "./fetch-external-upholstery-options";

export type FetchNevotexUpholsteryOptionsParams = {
  q: string;
  limit?: number;
};

export async function fetchNevotexUpholsteryOptions(
  params: FetchNevotexUpholsteryOptionsParams,
): Promise<{
  upholsteries: z.infer<typeof UpholsteryPickerOptionSchema>[];
  has_more: boolean;
}> {
  const response = await fetchExternalUpholsteryOptions({
    ...params,
    providers: ["nevotex"],
  });

  return {
    upholsteries: response.upholsteries,
    has_more: response.has_more,
  };
}
