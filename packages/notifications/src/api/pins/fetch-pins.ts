import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  ListPinsParamsSchema,
  ListPinsResponseSchema,
  type ListPinsParams,
  type ListPinsResponse,
} from "../../pins/pin-types";

const ListPinsEnvelopeSchema = ApiEnvelopeSchema(
  ListPinsResponseSchema,
).extend({ ok: z.literal(true) });

export async function fetchPins(
  params: ListPinsParams,
): Promise<ListPinsResponse> {
  const parsedParams = ListPinsParamsSchema.parse(params);

  const response = await apiClient.get(
    "/api/v1/notifications/pins",
    ListPinsEnvelopeSchema,
    {
      entity_client_ids: parsedParams.entity_client_ids?.join(","),
      major_client_entity_ids:
        parsedParams.major_client_entity_ids?.join(","),
    },
  );

  return response.data;
}
