import { z } from "zod";

import { apiClient } from "@beyo/api-client";

import { UpholsteryListResponseSchema, UpholsteryPickerOptionSchema } from "../types";

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
  const envelope = await apiClient.get(
    "/api/v1/upholsteries/external/nevotex",
    UpholsteryListResponseSchema,
    {
      q: params.q,
      limit: params.limit ?? 7,
    },
  );

  return {
    upholsteries: envelope.data.upholsteries,
    has_more: envelope.data.upholsteries_pagination.has_more,
  };
}
