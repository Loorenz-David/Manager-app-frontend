import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  type ListUpholsteryPickerParams,
  UpholsteryPickerOptionSchema,
} from "../types";

const ListUpholsteryPickerResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholsteries: z.array(UpholsteryPickerOptionSchema),
    upholsteries_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);

export async function fetchUpholsteryPickerOptions(
  params: ListUpholsteryPickerParams = {},
): Promise<{
  upholsteries: z.infer<typeof UpholsteryPickerOptionSchema>[];
  has_more: boolean;
}> {
  const envelope = await apiClient.get(
    "/api/v1/upholsteries",
    ListUpholsteryPickerResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      q: params.q,
      in_stock: params.in_stock,
      favorite: params.favorite,
    },
  );

  return {
    upholsteries: envelope.data.upholsteries,
    has_more: envelope.data.upholsteries_pagination.has_more,
  };
}
